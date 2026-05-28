"use client";

import {
  useCallback,
  useRef,
  type HTMLAttributes,
  type Ref,
} from "react";
import { cn } from "@/utils/cn";
import { useTopLevelLandmarkCheck } from "@/utils/useTopLevelLandmarkCheck";

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
  position?: NavbarPosition | undefined;
  /** Estilo glassmorphism (fondo translúcido + blur). */
  glass?: boolean | undefined;
  ref?: Ref<HTMLElement> | undefined;
}

/**
 * Navbar — barra de navegación horizontal superior (`<header>`).
 *
 * Compón con `NavbarBrand`, `NavbarNav`, `NavbarLink` y `NavbarActions`.
 * `position` controla el comportamiento sticky/fixed; `glass` se puede
 * combinar con cualquier `position`.
 *
 * **A11y dev warn**: `<header>` es role banner por defecto. Axe rule
 * `landmark-no-duplicate-banner` solo permite UN banner top-level por
 * documento. Si se montan dos `<Navbar>` top-level (típico en galerías
 * `AllStates`), se emite warn (capa 1.3 debt doc). Mitigación
 * documentada en `docs/STORY_CATALOG_CONVENTIONS.md`: envolver cada
 * instancia en `<section aria-label="Demo X">` que la despromueve a
 * `region`.
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
  const internalRef = useRef<HTMLElement>(null);
  useTopLevelLandmarkCheck(internalRef, "banner");
  const setRefs = useCallback(
    (el: HTMLElement | null) => {
      internalRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  return (
    <header
      ref={setRefs}
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
