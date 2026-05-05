import type {
  ComponentPropsWithoutRef,
  ElementType,
  KeyboardEvent,
  ReactElement,
  Ref,
} from "react";
import { useEffect, useRef } from "react";
import { cn } from "@/utils/cn";

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

/**
 * Props propios del Card (sin contar los HTML estándar del elemento subyacente).
 */
interface CardOwnProps<C extends ElementType = "div"> {
  /**
   * Elemento HTML o componente que renderea la card. Por defecto `"div"`.
   * Acepta strings (`"article"`, `"section"`, `"a"`, …) y componentes
   * (`as={Link}`, `as={NextLink}`).
   *
   * Cuando pasas un componente, las props específicas del componente
   * (`href` para `<a>`, `to` para react-router, etc.) se tipan
   * automáticamente.
   */
  as?: C;
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
  /**
   * Ref polimórfica al elemento subyacente. El tipo se infiere de `as`.
   */
  ref?: Ref<unknown>;
}

export type CardProps<C extends ElementType = "div"> = CardOwnProps<C> &
  Omit<ComponentPropsWithoutRef<C>, keyof CardOwnProps<C>>;

/**
 * Card — contenedor de contenido con variantes de color y modificadores
 * visuales (bordered, elevated, glass, interactive).
 *
 * **Polimórfica**: por defecto renderea `<div>`, pero acepta cualquier
 * elemento HTML o componente vía la prop `as`.
 *
 * @example
 * // Como elemento semántico
 * <Card as="article" elevated>...</Card>
 *
 * // Como link nativo
 * <Card as="a" href="/posts/1" interactive>...</Card>
 *
 * // Como componente (react-router, next, etc.)
 * <Card as={Link} to="/posts/1" interactive>...</Card>
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
 * Combina con `CardHeader`, `CardBody`, `CardFooter`, `CardImage`,
 * `CardDivider` para layouts compuestos.
 *
 * @example
 * <Card interactive role="button" onClick={() => navigate("/x")}>
 *   <CardBody>Click o Enter/Space para navegar</CardBody>
 * </Card>
 */
export function Card<C extends ElementType = "div">({
  as,
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
}: CardProps<C>): ReactElement {
  const Component: ElementType = as ?? "div";
  const actsAsButton = interactive && role === "button" && Boolean(onClick);

  // Dev-only warning: si un consumer pone `interactive` + `onClick` pero
  // omite `role="button"`, la card NO activa por teclado (Enter/Space).
  // Esto es probablemente un descuido. Avisamos UNA vez por instancia.
  // Nota: no aplica si `as` es un elemento naturalmente interactivo
  // (`a` con href, `button`) — esos ya activan por teclado nativamente.
  const warnedRef = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (warnedRef.current) return;
    const isNativeInteractive =
      as === "a" || as === "button" || as === "summary";
    if (
      !isNativeInteractive &&
      interactive &&
      Boolean(onClick) &&
      role !== "button"
    ) {
      warnedRef.current = true;
      console.warn(
        '[reactigoded] <Card interactive onClick={...}> sin role="button" no responde a Enter/Space por teclado. Añade role="button" + tabIndex={0} para a11y completa, o usa as="a" / as="button", o quita interactive si la card no es realmente accionable.',
      );
    }
  }, [as, interactive, onClick, role]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    (onKeyDown as ((e: KeyboardEvent<HTMLElement>) => void) | undefined)?.(
      event,
    );
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
    <Component
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
    </Component>
  );
}
