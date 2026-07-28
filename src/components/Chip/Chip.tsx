import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  Ref,
  MouseEvent,
} from "react";
import { cn } from "@/utils/cn";

export type ChipVariant =
  | "brand"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export type ChipSize = "sm" | "md" | "lg";

interface ChipBase {
  variant?: ChipVariant | undefined;
  size?: ChipSize | undefined;
  /** Si está marcado como seleccionable + seleccionado, aplica el estado activo. */
  selected?: boolean | undefined;
  /** Callback opcional para mostrar la X de eliminación. */
  onRemove?: (() => void) | undefined;
  /** Texto a11y para el botón de eliminación. */
  removeLabel?: string | undefined;
  children?: React.ReactNode | undefined;
}

// Las opcionales llevan `| undefined` explícito: sin él, un consumer con
// `exactOptionalPropertyTypes: true` no puede escribir `selectable={cond ? false
// : undefined}` ni `selectable={undefined}` — y ese segundo es el idioma que el
// propio DS bendice y blinda con fixtures para `href` en MenuItem, SidebarItem y
// NavbarLogo. Chip se quedó fuera del fixture EOPT, así que la matriz salió
// verde por cobertura, no por ausencia de defecto (A-TYPES-02).
export type ChipProps =
  | (ChipBase & { selectable: true } & Omit<
        ButtonHTMLAttributes<HTMLButtonElement>,
        keyof ChipBase
      > & { ref?: Ref<HTMLButtonElement> | undefined })
  | (ChipBase & { selectable?: false | undefined } & Omit<
        HTMLAttributes<HTMLSpanElement>,
        keyof ChipBase
      > & { ref?: Ref<HTMLSpanElement> | undefined });

/**
 * Chip — etiqueta compacta. Por defecto inline (`<span>`); con `selectable`
 * se renderiza como `<button>` clickeable. `onRemove` añade una X cerrar.
 *
 * @example
 * <Chip variant="info">Tag</Chip>
 * <Chip selectable selected={picked} onClick={() => setPicked(p => !p)}>
 *   React
 * </Chip>
 * <Chip variant="success" onRemove={() => removeTag(id)}>Removible</Chip>
 *
 * @server-safe
 */
export function Chip(props: ChipProps) {
  const {
    variant,
    size = "md",
    selected = false,
    onRemove,
    // i18n: ES default deliberado (D12). Override: removeLabel.
    removeLabel = "Eliminar",
    children,
    className,
    selectable,
    ref,
    ...rest
  } = props;

  const classes = cn(
    "ig-chip",
    variant && `ig-chip-${variant}`,
    size !== "md" && `ig-chip-${size}`,
    selectable && "ig-chip-selectable",
    selected && "ig-chip-selected",
    className,
  );

  const handleRemove = (e: MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    onRemove?.();
  };

  const removeAffordance = onRemove ? (
    selectable ? (
      <span
        role="button"
        tabIndex={0}
        className="ig-chip-close"
        aria-label={removeLabel}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }
        }}
      >
        ×
      </span>
    ) : (
      <button
        type="button"
        className="ig-chip-close"
        onClick={handleRemove}
        aria-label={removeLabel}
      >
        ×
      </button>
    )
  ) : null;

  if (selectable) {
    return (
      <button
        {...rest}
        ref={ref}
        type="button"
        aria-pressed={selected}
        className={classes}
      >
        {children}
        {removeAffordance}
      </button>
    );
  }

  return (
    <span
      {...rest}
      ref={ref}
      className={classes}
    >
      {children}
      {removeAffordance}
    </span>
  );
}
