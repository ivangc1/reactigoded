import {
  type HTMLAttributes,
  type Ref,
  type TableHTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "react";
import { cn } from "@/utils/cn";

export type TableLayout = "auto" | "fixed";

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  /** Filas alternas con color de fondo. */
  striped?: boolean | undefined;
  /** Fila destacada al hover. */
  hover?: boolean | undefined;
  /** Bordes en todas las celdas. */
  bordered?: boolean | undefined;
  /** Padding reducido. */
  compact?: boolean | undefined;
  /** `table-layout`: `auto` (defecto del navegador) o `fixed`. */
  layout?: TableLayout | undefined;
  /**
   * Si se proporciona, envuelve la tabla en un `<div>` con scroll horizontal.
   * Útil para tablas anchas en mobile.
   */
  scrollable?: boolean | undefined;
  /**
   * Etiqueta accesible del wrapper scrollable. Aplica sólo cuando
   * `scrollable=true`. Por defecto "Tabla con scroll horizontal".
   */
  scrollAreaLabel?: string | undefined;
  ref?: Ref<HTMLTableElement> | undefined;
}

/**
 * Table — tabla con clases del design system.
 *
 * Componer con `TableHead`, `TableBody`, `TableFoot`, `TableRow`,
 * `TableHeaderCell` (`<th>`) y `TableCell` (`<td>`), o usar las etiquetas
 * HTML nativas directamente — todas las variantes se aplican vía clases en
 * `<table>`.
  *
 * @server-safe
 */
export function Table({
  className,
  striped,
  hover,
  bordered,
  compact,
  layout,
  scrollable,
  scrollAreaLabel = "Tabla con scroll horizontal",
  ref,
  ...rest
}: TableProps) {
  const tableClass = cn(
    "ig-table",
    striped && "ig-table-striped",
    hover && "ig-table-hover",
    bordered && "ig-table-bordered",
    compact && "ig-table-compact",
    layout && `ig-table-${layout}`,
    className,
  );

  const table = <table ref={ref} className={tableClass} {...rest} />;

  if (scrollable) {
    return (
      <div
        role="region"
        aria-label={scrollAreaLabel}
        // `tabIndex={0}` es REQUERIDO por axe `scrollable-region-focusable`:
        // cualquier región scrollable debe ser keyboard-accessible.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        className="ig-table-scroll-region"
      >
        {table}
      </div>
    );
  }
  return table;
}

export interface TableHeadProps
  extends HTMLAttributes<HTMLTableSectionElement> {
  ref?: Ref<HTMLTableSectionElement> | undefined;
}
/** TableHead — sección `<thead>` de la tabla. */
export function TableHead({ ref, ...rest }: TableHeadProps) {
  return <thead ref={ref} {...rest} />;
}

export interface TableBodyProps
  extends HTMLAttributes<HTMLTableSectionElement> {
  ref?: Ref<HTMLTableSectionElement> | undefined;
}
/** TableBody — sección `<tbody>` de la tabla. */
export function TableBody({ ref, ...rest }: TableBodyProps) {
  return <tbody ref={ref} {...rest} />;
}

export interface TableFootProps
  extends HTMLAttributes<HTMLTableSectionElement> {
  ref?: Ref<HTMLTableSectionElement> | undefined;
}
/** TableFoot — sección `<tfoot>` de la tabla. */
export function TableFoot({ ref, ...rest }: TableFootProps) {
  return <tfoot ref={ref} {...rest} />;
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  ref?: Ref<HTMLTableRowElement> | undefined;
}
/** TableRow — fila `<tr>`. */
export function TableRow({ ref, ...rest }: TableRowProps) {
  return <tr ref={ref} {...rest} />;
}

export interface TableHeaderCellProps
  extends ThHTMLAttributes<HTMLTableCellElement> {
  ref?: Ref<HTMLTableCellElement> | undefined;
}
/** TableHeaderCell — celda `<th>`. Acepta `scope`, `colSpan`, etc. */
export function TableHeaderCell({ ref, ...rest }: TableHeaderCellProps) {
  return <th ref={ref} {...rest} />;
}

export interface TableCellProps
  extends TdHTMLAttributes<HTMLTableCellElement> {
  ref?: Ref<HTMLTableCellElement> | undefined;
}
/** TableCell — celda `<td>`. */
export function TableCell({ ref, ...rest }: TableCellProps) {
  return <td ref={ref} {...rest} />;
}

export type TableCaptionSide = "top" | "bottom";

export interface TableCaptionProps
  extends HTMLAttributes<HTMLTableCaptionElement> {
  /** Posiciona el caption arriba o abajo de la tabla. */
  side?: TableCaptionSide | undefined;
  ref?: Ref<HTMLTableCaptionElement> | undefined;
}
/** TableCaption — `<caption>` de la tabla con prop `side` (top/bottom). */
export function TableCaption({
  className,
  side,
  ref,
  ...rest
}: TableCaptionProps) {
  return (
    <caption
      {...rest}
      ref={ref}
      className={cn(side && `ig-caption-${side}`, className)}
    />
  );
}
