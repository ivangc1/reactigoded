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
  variant?: ChipVariant;
  size?: ChipSize;
  /** Si está marcado como seleccionable + seleccionado, aplica el estado activo. */
  selected?: boolean;
  /** Callback opcional para mostrar la X de eliminación. */
  onRemove?: () => void;
  /** Texto a11y para el botón de eliminación. */
  removeLabel?: string;
  children?: React.ReactNode;
}

export type ChipProps =
  | (ChipBase & { selectable: true } & Omit<
        ButtonHTMLAttributes<HTMLButtonElement>,
        keyof ChipBase
      > & { ref?: Ref<HTMLButtonElement> })
  | (ChipBase & { selectable?: false } & Omit<
        HTMLAttributes<HTMLSpanElement>,
        keyof ChipBase
      > & { ref?: Ref<HTMLSpanElement> });

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
 */
export function Chip(props: ChipProps) {
  const {
    variant,
    size = "md",
    selected = false,
    onRemove,
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
