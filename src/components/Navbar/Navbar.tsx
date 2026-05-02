import { type HTMLAttributes, type Ref } from "react";
import { cn } from "@/utils/cn";

export interface NavbarProps extends HTMLAttributes<HTMLElement> {
  /** Posición sticky en la parte superior. */
  sticky?: boolean;
  /** Posición fija en la parte superior. */
  fixed?: boolean;
  /** Estilo glassmorphism (fondo translúcido + blur). */
  glass?: boolean;
  ref?: Ref<HTMLElement>;
}

/**
 * Navbar — barra de navegación horizontal superior (`<header>`).
 *
 * Compón con `NavbarBrand`, `NavbarNav`, `NavbarLink` y `NavbarActions`.
 * Variantes mutuamente excluyentes: `sticky` ó `fixed`. `glass` se puede
 * combinar con cualquiera.
 *
 * @example
 * <Navbar sticky>
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
  sticky,
  fixed,
  glass,
  ref,
  ...rest
}: NavbarProps) {
  return (
    <header
      ref={ref}
      className={cn(
        "ig-navbar",
        sticky && "ig-navbar-sticky",
        fixed && "ig-navbar-fixed",
        glass && "ig-navbar-glass",
        className,
      )}
      {...rest}
    />
  );
}
