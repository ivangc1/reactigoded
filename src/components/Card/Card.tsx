import type { HTMLAttributes, KeyboardEvent, Ref } from "react";
import { useEffect, useRef } from "react";
import { cn } from "@/utils/cn";
import { isDev } from "@/utils/env";

export type CardVariant =
  | "brand"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info";

/**
 * Apariencia visual cuando hay `variant`:
 * - `"outline"` (default): borde del color, fondo neutro → `ig-card-<variant>`.
 * - `"filled"`: fondo sólido del color → `ig-card-<variant>-filled`.
 *
 * Sin `variant` la apariencia se ignora (la card es plana).
 */
export type CardAppearance = "outline" | "filled";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Color semántico de la card. */
  variant?: CardVariant;
  /** Apariencia visual. Por defecto `"outline"`. Solo aplica si hay `variant`. */
  appearance?: CardAppearance;
  /** Borde más marcado. */
  bordered?: boolean;
  /** Sombra elevada. */
  elevated?: boolean;
  /** Efecto glass (backdrop-filter). */
  glass?: boolean;
  /** Hover lift + cursor pointer (úsalo cuando la card es clickable). */
  interactive?: boolean;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Card — contenedor de contenido con variantes de color y modificadores
 * visuales (bordered, elevated, glass, interactive).
 *
 * Combina con `CardHeader`, `CardBody`, `CardFooter`, `CardImage`,
 * `CardDivider` para layouts compuestos.
 *
 * **Card como botón**: pasa `interactive` + `role="button"` + `onClick`.
 * Cuando se cumplen las 3 condiciones, la card activa Enter/Space
 * automáticamente como un `<button>` nativo (la keyboard activation es
 * obligatoria por WAI-ARIA APG si añades `role="button"` a un elemento no
 * interactivo) y aplica `tabIndex={0}` por defecto para que sea
 * focuseable. Si pasas un `tabIndex` explícito (incluido `-1`) tu valor
 * se respeta. Si pasas tu propio `onKeyDown`, el handler interno se
 * encadena después — tu lógica corre primero y puedes llamar
 * `event.preventDefault()` para evitar la activación por defecto.
 *
 * @example
 * <Card interactive role="button" onClick={() => navigate("/x")}>
 *   <CardBody>Click o Enter/Space para navegar</CardBody>
 * </Card>
 */
export function Card({
  variant,
  appearance = "outline",
  bordered = false,
  elevated = false,
  glass = false,
  interactive = false,
  className,
  children,
  ref,
  role,
  onClick,
  onKeyDown,
  ...rest
}: CardProps) {
  const actsAsButton = interactive && role === "button" && Boolean(onClick);

  // Dev-only warning: si un consumer pone `interactive` + `onClick` pero
  // omite `role="button"`, la card NO activa por teclado (Enter/Space).
  // Esto es probablemente un descuido. Avisamos UNA vez por instancia.
  const warnedRef = useRef(false);
  useEffect(() => {
    if (!isDev()) return;
    if (warnedRef.current) return;
    if (interactive && Boolean(onClick) && role !== "button") {
      warnedRef.current = true;
      console.warn(
        '[reactigoded] <Card interactive onClick={...}> sin role="button" no responde a Enter/Space por teclado. Añade role="button" + tabIndex={0} para a11y completa, o quita interactive si la card no es realmente accionable.',
      );
    }
  }, [interactive, onClick, role]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (!actsAsButton) return;
    if (event.defaultPrevented) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      // Disparamos un click nativo en vez de hacer cast sospechoso de
      // KeyboardEvent → MouseEvent. El click sintético propaga
      // correctamente y React invoca `onClick` con un evento auténtico.
      event.currentTarget.click();
    }
  };

  const variantClass =
    variant &&
    (appearance === "filled" ? `ig-card-${variant}-filled` : `ig-card-${variant}`);

  return (
    <div
      ref={ref}
      role={role}
      // Cuando la card actúa como botón forzamos tabIndex=0 antes del
      // spread, para que sea focuseable por teclado aunque el consumer
      // olvide la prop. Si pasa su propio tabIndex, el spread de `rest`
      // (más abajo) lo respeta.
      tabIndex={actsAsButton ? 0 : undefined}
      onClick={onClick}
      onKeyDown={actsAsButton || onKeyDown ? handleKeyDown : undefined}
      className={cn(
        "ig-card",
        variantClass,
        bordered && "ig-card-bordered",
        elevated && "ig-card-elevated",
        glass && "ig-card-glass",
        interactive && "ig-card-interactive",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
