import { useEffect, useRef, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { cn } from "@/utils/cn";
import { isDev } from "@/utils/env";

export type PaginationVariant =
  | "brand"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface PaginationProps
  extends Omit<HTMLAttributes<HTMLElement>, "onChange"> {
  /** Página actual (1-based). */
  currentPage: number;
  /** Número total de páginas (>=1). */
  totalPages: number;
  /** Cuántas páginas mostrar a cada lado de la actual antes de elipsis. Por defecto 1. */
  siblingCount?: number;
  /** Callback al cambiar de página. */
  onPageChange: (page: number) => void;
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
  ref?: Ref<HTMLElement>;
}

type PageItem = number | "ellipsis-start" | "ellipsis-end";

/**
 * Pagination — navegación paginada accesible.
 *
 * Renderiza un `<nav>` con `aria-label`, botón "anterior", páginas (con
 * elipsis cuando hay muchas) y botón "siguiente". La página activa lleva
 * `aria-current="page"`. Cada página tiene `aria-label="Página N"`.
 *
 * Es controlled-only: el consumer mantiene `currentPage` y reacciona a
 * `onPageChange`.
 *
 * @example
 * <Pagination
 *   currentPage={page}
 *   totalPages={total}
 *   onPageChange={setPage}
 * />
 */
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
 * Pagination — `<nav>` con botones de navegación entre páginas.
 *
 * Renderiza Anterior/Siguiente + páginas con elipsis. Cada página es un
 * `<button>`; la activa lleva `aria-current="page"`.
 */
export function Pagination({
  currentPage,
  totalPages,
  siblingCount = 1,
  onPageChange,
  variant,
  prevLabel = "Anterior",
  nextLabel = "Siguiente",
  prevAriaLabel,
  nextAriaLabel,
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

  // Clamps: el componente jamás debe renderizar páginas fuera de rango
  // ni dejar el `aria-current` huérfano si el consumer pasa basura.
  // Cualquier non-finite o ≤ 0 cae a defaults seguros (totalPages=1,
  // currentPage=1, siblingCount=0).
  const safeTotal = Math.max(1, Math.floor(Number(totalPages) || 1));
  const safeCurrent = Math.min(
    Math.max(1, Math.floor(Number(currentPage) || 1)),
    safeTotal,
  );
  const safeSiblings = Math.max(0, Math.floor(Number(siblingCount) || 0));

  // Dev-only warning si tuvimos que clamp-ear (input fuera de rango).
  // En useEffect (no durante render) por la regla react-hooks/refs.
  const warnedRef = useRef(false);
  useEffect(() => {
    if (!isDev() || warnedRef.current) return;
    if (currentPage !== safeCurrent || totalPages !== safeTotal) {
      warnedRef.current = true;
      console.warn(
        `[reactigoded] <Pagination currentPage=${String(currentPage)} totalPages=${String(totalPages)}> fuera de rango. Clamped a currentPage=${String(safeCurrent)}, totalPages=${String(safeTotal)}.`,
      );
    }
  }, [currentPage, totalPages, safeCurrent, safeTotal]);

  const pages = buildPages(safeCurrent, safeTotal, safeSiblings);
  const canPrev = safeCurrent > 1;
  const canNext = safeCurrent < safeTotal;

  return (
    <nav
      {...navRest}
      ref={ref}
      aria-label={ariaLabelOverride ?? "Paginación"}
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
          if (canPrev) onPageChange(safeCurrent - 1);
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
            aria-label={`Página ${String(p)}`}
            onClick={() => {
              if (!isActive) onPageChange(p);
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
          if (canNext) onPageChange(safeCurrent + 1);
        }}
      >
        {nextLabel}
      </button>
    </nav>
  );
}
