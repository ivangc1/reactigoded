"use client";

import { useEffect, useRef, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { cn } from "@/utils/cn";
import { useControllableState } from "@/hooks/useControllableState";
import { useLandmarkRegistry } from "@/utils/useLandmarkRegistry";

export type PaginationVariant =
  | "brand"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface PaginationProps
  extends Omit<HTMLAttributes<HTMLElement>, "onChange"> {
  /**
   * Página actual (1-based) en modo **controlled**. Si se pasa, el
   * consumer es responsable de actualizar la prop en respuesta a
   * `onPageChange`. Si se omite, el componente arranca en `defaultPage`
   * y maneja el state internamente.
   */
  page?: number | undefined;
  /**
   * Página inicial (1-based) en modo **uncontrolled**. Default `1`.
   * Ignorado si `page` está definido.
   */
  defaultPage?: number | undefined;
  /** Número total de páginas (>=1). */
  totalPages: number;
  /** Cuántas páginas mostrar a cada lado de la actual antes de elipsis. Por defecto 1. */
  siblingCount?: number | undefined;
  /**
   * Callback al cambiar de página. Opcional en modo uncontrolled (el
   * componente actualiza su state interno) y útil para reaccionar al
   * cambio (fetch de datos, sync con URL, etc.).
   */
  onPageChange?: ((page: number) => void) | undefined;
  /** Color de la página activa. */
  variant?: PaginationVariant | undefined;
  /**
   * Contenido del botón anterior. Si es string también se usa como
   * `aria-label` (a menos que se pase `prevAriaLabel` explícito).
   * Si es ReactNode (p.ej. un icono), pasa `prevAriaLabel` con el texto
   * legible para SR.
   */
  prevLabel?: ReactNode | undefined;
  /**
   * Contenido del botón siguiente. Mismas reglas que `prevLabel`.
   */
  nextLabel?: ReactNode | undefined;
  /**
   * `aria-label` del botón anterior. Override explícito; si se omite y
   * `prevLabel` es string se usa éste, en otro caso "Página anterior".
   */
  prevAriaLabel?: string | undefined;
  /**
   * `aria-label` del botón siguiente. Override explícito; si se omite y
   * `nextLabel` es string se usa éste, en otro caso "Página siguiente".
   */
  nextAriaLabel?: string | undefined;
  /**
   * Genera el `aria-label` de cada botón de página. Por defecto
   * `(p) => "Página N"` en español. Útil para i18n: pasar
   * `(p) => \`Page ${p}\`` para inglés, `(p) => \`Seite ${p}\`` para
   * alemán, etc. (L-12 gate review).
   */
  getPageLabel?: ((page: number) => string) | undefined;
  ref?: Ref<HTMLElement> | undefined;
}

type PageItem = number | "ellipsis-start" | "ellipsis-end";

/**
 * Genera la lista de páginas a mostrar con elipsis. Para totalPages pequeñas
 * (<=7) las muestra todas; para más grandes intercala "…" alrededor de la
 * actual respetando `siblingCount`.
 */
function buildPages(
  current: number,
  total: number,
  siblings: number,
): PageItem[] {
  const totalNumbers = siblings * 2 + 5; // first, last, current, 2*sibling, 2 ellipsis
  if (total <= totalNumbers) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const left = Math.max(current - siblings, 2);
  const right = Math.min(current + siblings, total - 1);
  const showLeftEllipsis = left > 2;
  const showRightEllipsis = right < total - 1;

  const pages: PageItem[] = [1];
  if (showLeftEllipsis) pages.push("ellipsis-start");
  for (let p = left; p <= right; p++) pages.push(p);
  if (showRightEllipsis) pages.push("ellipsis-end");
  pages.push(total);
  return pages;
}

/**
 * Pagination — navegación paginada accesible.
 *
 * Renderiza un `<nav>` con `aria-label`, botón "anterior", páginas (con
 * elipsis cuando hay muchas) y botón "siguiente". La página activa lleva
 * `aria-current="page"`. Cada página tiene `aria-label="Página N"`.
 *
 * Soporta **controlled** (`page` + `onPageChange`) y **uncontrolled**
 * (`defaultPage`, opcional `onPageChange` para reaccionar). Idéntico
 * patrón a otros componentes con state del DS (Tabs, Accordion, etc.).
 *
 * @example
 * // Uncontrolled — el componente maneja el state internamente
 * <Pagination totalPages={20} defaultPage={1} onPageChange={fetchPage} />
 *
 * // Controlled — el consumer mantiene page
 * const [page, setPage] = useState(1);
 * <Pagination totalPages={20} page={page} onPageChange={setPage} />
 */
export function Pagination({
  page: pageProp,
  defaultPage = 1,
  totalPages,
  siblingCount = 1,
  onPageChange,
  variant,
  // i18n: ES default deliberado (D12). Override: prevLabel / nextLabel.
  prevLabel = "Anterior",
  nextLabel = "Siguiente",
  prevAriaLabel,
  nextAriaLabel,
  getPageLabel = (p) => `Página ${String(p)}`,
  className,
  ref,
  ...rest
}: PaginationProps) {
  const prevAria =
    prevAriaLabel ??
    (typeof prevLabel === "string" ? prevLabel : "Página anterior");
  const nextAria =
    nextAriaLabel ??
    (typeof nextLabel === "string" ? nextLabel : "Página siguiente");
  // 1.0.0-beta.4: aria-label se extrae del rest (HTML std). Antes existía
  // una prop `ariaLabel` separada — eliminada por consistencia con el
  // resto de componentes que ya usan rest. Migration: rename ariaLabel→aria-label.
  const { "aria-label": ariaLabelOverride, ...navRest } = rest;
  const resolvedAriaLabel = ariaLabelOverride ?? "Paginación";
  // Capa 1.2 debt doc: warn dev si dos <nav aria-label="Paginación">
  // viven al mismo tiempo (ej. paginadores top + bottom de la misma
  // tabla sin labels distintos).
  useLandmarkRegistry("navigation", resolvedAriaLabel);

  // beta.20: Pagination soporta controlled + uncontrolled vía
  // useControllableState. En uncontrolled, el state interno arranca en
  // defaultPage y onPageChange (si existe) actúa como side-effect.
  //
  // Codex P2 post-audit sobre PR #19: clamp defaultPage AL ENTRAR al
  // state, no solo en render. Pre-fix: si defaultPage=10 con totalPages=3,
  // el render mostraba página 3 (clamp safeCurrent) pero el state
  // interno guardaba 10 raw. Si después totalPages subía a 15, la UI
  // saltaba a página 10 sin acción del usuario (state stale emerge).
  // Fix: pre-clamp contra totalPages al entrar al hook.
  const preClampedSafeTotal = Math.max(1, Math.floor(totalPages || 1));
  const sanitizedDefaultPage = Math.min(
    Math.max(1, Math.floor(defaultPage || 1)),
    preClampedSafeTotal,
  );
  const { value: page, setValue: setPage } = useControllableState<number>({
    value: pageProp,
    defaultValue: sanitizedDefaultPage,
    onChange: onPageChange,
  });

  // Clamps en render: el componente jamás debe renderizar páginas fuera
  // de rango ni dejar el `aria-current` huérfano si el consumer pasa
  // basura. Cualquier non-finite o ≤ 0 cae a defaults seguros.
  // `|| 1` cubre 0, NaN e -Infinity por la coerción de OR a falsy/finite.
  // Math.floor + max/min normaliza Infinity y negativos.
  const safeTotal = preClampedSafeTotal;
  const safeCurrent = Math.min(
    Math.max(1, Math.floor(page || 1)),
    safeTotal,
  );
  const safeSiblings = Math.max(0, Math.floor(siblingCount || 0));

  // B-18: sync uncontrolled state cuando totalPages cambia y deja el
  // page interno fuera de rango (ej: estabas en página 5, totalPages
  // baja a 3 → debes quedarte en 3, no volver a 5 si vuelve a subir).
  // Solo aplica en uncontrolled — en controlled el consumer decide.
  // silent: true para NO disparar onPageChange en este sync interno
  // (sería ruido para el consumer; el clamp es decisión del componente,
  // no acción del usuario).
  useEffect(() => {
    if (pageProp !== undefined) return;
    if (page !== safeCurrent) {
      setPage(safeCurrent, { silent: true });
    }
  }, [pageProp, page, safeCurrent, setPage]);

  // Dev-only warning si tuvimos que clamp-ear (input fuera de rango).
  // En useEffect (no durante render) por la regla react-hooks/refs.
  // Solo aplicamos a controlled mode: en uncontrolled el internal state
  // siempre está dentro de rango porque solo lo movemos vía setPage.
  const warnedRef = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (warnedRef.current) return;
    const isControlled = pageProp !== undefined;
    const outOfRange =
      isControlled
        ? pageProp !== safeCurrent || totalPages !== safeTotal
        : totalPages !== safeTotal;
    if (outOfRange) {
      warnedRef.current = true;
      console.warn(
        `[reactigoded] <Pagination page=${String(pageProp)} totalPages=${String(totalPages)}> fuera de rango. Clamped a page=${String(safeCurrent)}, totalPages=${String(safeTotal)}.`,
      );
    }
  }, [pageProp, totalPages, safeCurrent, safeTotal]);

  const pages = buildPages(safeCurrent, safeTotal, safeSiblings);
  const canPrev = safeCurrent > 1;
  const canNext = safeCurrent < safeTotal;

  const goTo = (next: number) => {
    if (next === safeCurrent) return;
    setPage(next);
  };

  return (
    <nav
      {...navRest}
      ref={ref}
      aria-label={resolvedAriaLabel}
      className={cn(
        "ig-pagination",
        variant && `ig-pagination-${variant}`,
        className,
      )}
    >
      <button
        type="button"
        className="ig-pagination-item ig-pagination-prev"
        disabled={!canPrev}
        aria-label={prevAria}
        onClick={() => {
          if (canPrev) goTo(safeCurrent - 1);
        }}
      >
        {prevLabel}
      </button>
      {pages.map((p, idx) => {
        if (p === "ellipsis-start" || p === "ellipsis-end") {
          return (
            <span
              key={p + String(idx)}
              className="ig-pagination-ellipsis"
              aria-hidden="true"
            >
              …
            </span>
          );
        }
        const isActive = p === safeCurrent;
        return (
          <button
            key={p}
            type="button"
            className={cn(
              "ig-pagination-item",
              isActive && "ig-pagination-active",
            )}
            aria-current={isActive ? "page" : undefined}
            aria-label={getPageLabel(p)}
            onClick={() => {
              if (!isActive) goTo(p);
            }}
          >
            {p}
          </button>
        );
      })}
      <button
        type="button"
        className="ig-pagination-item ig-pagination-next"
        disabled={!canNext}
        aria-label={nextAria}
        onClick={() => {
          if (canNext) goTo(safeCurrent + 1);
        }}
      >
        {nextLabel}
      </button>
    </nav>
  );
}
