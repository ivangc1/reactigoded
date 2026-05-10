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
   * `onValueChange`. Si se omite, el componente arranca en `defaultPage`
   * y maneja el state internamente.
   */
  currentPage?: number;
  /**
   * Página inicial (1-based) en modo **uncontrolled**. Default `1`.
   * Ignorado si `currentPage` está definido.
   */
  defaultPage?: number;
  /** Número total de páginas (>=1). */
  totalPages: number;
  /** Cuántas páginas mostrar a cada lado de la actual antes de elipsis. Por defecto 1. */
  siblingCount?: number;
  /**
   * Callback al cambiar de página. Opcional en modo uncontrolled (el
   * componente actualiza su state interno) y útil para reaccionar al
   * cambio (fetch de datos, sync con URL, etc.).
   */
  onValueChange?: (page: number) => void;
  /** Color de la página activa. */
  variant?: PaginationVariant;
  /**
   * Contenido del botón anterior. Si es string también se usa como
   * `aria-label` (a menos que se pase `prevAriaLabel` explícito).
   * Si es ReactNode (p.ej. un icono), pasa `prevAriaLabel` con el texto
   * legible para SR.
   */
  prevLabel?: ReactNode;
  /**
   * Contenido del botón siguiente. Mismas reglas que `prevLabel`.
   */
  nextLabel?: ReactNode;
  /**
   * `aria-label` del botón anterior. Override explícito; si se omite y
   * `prevLabel` es string se usa éste, en otro caso "Página anterior".
   */
  prevAriaLabel?: string;
  /**
   * `aria-label` del botón siguiente. Override explícito; si se omite y
   * `nextLabel` es string se usa éste, en otro caso "Página siguiente".
   */
  nextAriaLabel?: string;
  /**
   * Genera el `aria-label` de cada botón de página. Por defecto
   * `(p) => "Página N"` en español. Útil para i18n: pasar
   * `(p) => \`Page ${p}\`` para inglés, `(p) => \`Seite ${p}\`` para
   * alemán, etc. (L-12 gate review).
   */
  getPageLabel?: (page: number) => string;
  ref?: Ref<HTMLElement>;
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
 * Soporta **controlled** (`currentPage` + `onValueChange`) y **uncontrolled**
 * (`defaultPage`, opcional `onValueChange` para reaccionar). Idéntico
 * patrón a otros componentes con state del DS (Tabs, Accordion, etc.).
 *
 * @example
 * // Uncontrolled — el componente maneja el state internamente
 * <Pagination totalPages={20} defaultPage={1} onValueChange={fetchPage} />
 *
 * // Controlled — el consumer mantiene currentPage
 * <Pagination
 *   totalPages={20}
 *   currentPage={page}
 *   onValueChange={setPage}
 * />
 */
export function Pagination({
  currentPage,
  defaultPage = 1,
  totalPages,
  siblingCount = 1,
  onValueChange,
  variant,
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
  // defaultPage y onValueChange (si existe) actúa como side-effect.
  const { value: page, setValue: setPage } = useControllableState<number>({
    value: currentPage,
    defaultValue: defaultPage,
    onChange: onValueChange,
  });

  // Clamps: el componente jamás debe renderizar páginas fuera de rango
  // ni dejar el `aria-current` huérfano si el consumer pasa basura.
  // Cualquier non-finite o ≤ 0 cae a defaults seguros (totalPages=1,
  // currentPage=1, siblingCount=0).
  // `|| 1` cubre 0, NaN e -Infinity por la coerción de OR a falsy/finite.
  // Math.floor + max/min normaliza Infinity y negativos.
  const safeTotal = Math.max(1, Math.floor(totalPages || 1));
  const safeCurrent = Math.min(
    Math.max(1, Math.floor(page || 1)),
    safeTotal,
  );
  const safeSiblings = Math.max(0, Math.floor(siblingCount || 0));

  // B-18: sync uncontrolled state cuando totalPages cambia y deja el
  // page interno fuera de rango (ej: estabas en página 5, totalPages
  // baja a 3 → debes quedarte en 3, no volver a 5 si vuelve a subir).
  // Solo aplica en uncontrolled — en controlled el consumer decide.
  // silent: true para NO disparar onValueChange en este sync interno
  // (sería ruido para el consumer; el clamp es decisión del componente,
  // no acción del usuario).
  useEffect(() => {
    if (currentPage !== undefined) return;
    if (page !== safeCurrent) {
      setPage(safeCurrent, { silent: true });
    }
  }, [currentPage, page, safeCurrent, setPage]);

  // Dev-only warning si tuvimos que clamp-ear (input fuera de rango).
  // En useEffect (no durante render) por la regla react-hooks/refs.
  // Solo aplicamos a controlled mode: en uncontrolled el internal state
  // siempre está dentro de rango porque solo lo movemos vía setPage.
  const warnedRef = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (warnedRef.current) return;
    const isControlled = currentPage !== undefined;
    const outOfRange =
      isControlled
        ? currentPage !== safeCurrent || totalPages !== safeTotal
        : totalPages !== safeTotal;
    if (outOfRange) {
      warnedRef.current = true;
      console.warn(
        `[reactigoded] <Pagination currentPage=${String(currentPage)} totalPages=${String(totalPages)}> fuera de rango. Clamped a currentPage=${String(safeCurrent)}, totalPages=${String(safeTotal)}.`,
      );
    }
  }, [currentPage, totalPages, safeCurrent, safeTotal]);

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
