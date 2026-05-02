import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

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
  /** Texto del botón anterior. */
  prevLabel?: string;
  /** Texto del botón siguiente. */
  nextLabel?: string;
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
  className,
  ref,
  ...rest
}: PaginationProps) {
  // 1.0.0-beta.4: aria-label se extrae del rest (HTML std). Antes existía
  // una prop `ariaLabel` separada — eliminada por consistencia con el
  // resto de componentes que ya usan rest. Migration: rename ariaLabel→aria-label.
  const { "aria-label": ariaLabelOverride, ...navRest } = rest;
  const pages = buildPages(currentPage, totalPages, siblingCount);
  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

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
        aria-label={prevLabel}
        onClick={() => {
          if (canPrev) onPageChange(currentPage - 1);
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
        const isActive = p === currentPage;
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
        aria-label={nextLabel}
        onClick={() => {
          if (canNext) onPageChange(currentPage + 1);
        }}
      >
        {nextLabel}
      </button>
    </nav>
  );
}
