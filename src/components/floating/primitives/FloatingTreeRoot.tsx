import { FloatingTree } from "@floating-ui/react";
import type { ReactNode } from "react";

export interface FloatingTreeRootProps {
  children: ReactNode;
}

/**
 * FloatingTreeRoot — habilita el cascade dismiss entre `Tooltip`,
 * `Popover`, `Dropdown` (FUI) y similares cuando se anidan.
 *
 * **Comportamiento sin el root**: cada float funciona independiente —
 * un `Escape` cierra solo el float más interno. Si el consumer abre un
 * Popover dentro de un Modal y un Tooltip dentro del Popover, cada
 * Escape requiere acción separada y los floats no comparten estado de
 * dismiss.
 *
 * **Comportamiento con el root**: los floats se registran en el árbol
 * de `@floating-ui/react` y comparten el ciclo de dismiss. Un `Escape`
 * cierra todos los floats abiertos en cascada (más interno → más
 * externo). `outsidePress` también respeta la jerarquía: clicar dentro
 * de un float anidado no cierra al ancestro.
 *
 * **Cuándo usarlo**: opt-in por consumer. Si tu app no anida floats
 * (típico en formularios planos / dashboards simples), no lo necesitas
 * y pagas un context extra sin beneficio. Si tienes Modal con
 * Tooltips/Popovers, o menús contextuales con sub-menús, envuelve la
 * raíz de la app.
 *
 * @example
 * ```tsx
 * import { FloatingTreeRoot } from "reactigoded";
 *
 * function App() {
 *   return (
 *     <FloatingTreeRoot>
 *       <RouterProvider router={router} />
 *     </FloatingTreeRoot>
 *   );
 * }
 * ```
 *
 * H-01 / B-03 (gate review): pre-RC1 los floats no se registraban en
 * tree, lo que dejaba un bug latente: anidación profunda no cerraba
 * en cascada. Este wrapper expone la primitiva de FUI sin acoplar al
 * design system al import específico de `@floating-ui/react` desde el
 * consumer (le ofrecemos un nombre estable del DS).
 */
export function FloatingTreeRoot({ children }: FloatingTreeRootProps) {
  return <FloatingTree>{children}</FloatingTree>;
}
