import { type HTMLAttributes, type Ref } from "react";
import { cn } from "@/utils/cn";

export type NavbarPosition = "sticky" | "fixed";

export interface NavbarProps extends HTMLAttributes<HTMLElement> {
  /**
   * Posición del navbar.
   * - `"sticky"`: pegado en top mientras scrolleas dentro de su contenedor.
   * - `"fixed"`: anclado en top fuera del flujo (overlay).
   *
   * Antes existían dos booleans `sticky` y `fixed`; eran mutuamente
   * excluyentes solo en docs. Ahora la elección es una sola prop con
   * unión discriminada — el typing impide pasar ambas a la vez.
   */
  position?: NavbarPosition;
  /** Estilo glassmorphism (fondo translúcido + blur). */
  glass?: boolean;
  ref?: Ref<HTMLElement>;
}

/**
 * Navbar — barra de navegación horizontal superior (`<header>`).
 *
 * Compón con `NavbarBrand`, `NavbarNav`, `NavbarLink` y `NavbarActions`.
 * `position` controla el comportamiento sticky/fixed; `glass` se puede
 * combinar con cualquier `position`.
 *
 * @example
 * <Navbar position="sticky">
 *   <NavbarBrand href="/">Mi App</NavbarBrand>
 *   <NavbarNav>
 *     <NavbarLink href="/" active>Inicio</NavbarLink>
 *     <NavbarLink href="/precios">Precios</NavbarLink>
 *   </NavbarNav>
 *   <NavbarActions>
 *     <Button appearance="ghost">Login</Button>
 *     <Button variant="brand">Sign Up</Button>
 *   </NavbarActions>
 * </Navbar>
 */
export function Navbar({
  className,
  position,
  glass,
  ref,
  ...rest
}: NavbarProps) {
  return (
    <header
      ref={ref}
      className={cn(
        "ig-navbar",
        position && `ig-navbar-${position}`,
        glass && "ig-navbar-glass",
        className,
      )}
      {...rest}
    />
  );
}
