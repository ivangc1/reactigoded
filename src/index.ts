/**
 * Igoded Design System — entry point del paquete.
 *
 * Arquitectura CSS modular (estable desde `1.0.0-beta.3`):
 *
 *   tokens.css       solo variables --ig-* + keyframes + @font-face
 *                    (cero selectores globales, ~98 KB).
 *   base.css         globales mínimos: box-sizing + html + scrollbars +
 *                    ::selection + prefers-reduced-motion / contrast /
 *                    forced-colors. Garantías a11y. Requiere tokens.
 *   components.css   utilities + componentes (clases .ig-*). Requiere
 *                    tokens + base.
 *   design.css       meta: @import de tokens + base + components.
 *
 *   reset.css        estilos por defecto para HTML nativo (h1-h6, p, a,
 *                    button, input, table…). Opt-in.
 *   state.css        utilities pseudo-class (hover:, focus:). 7.1 MB. Opt-in.
 *   all.css          atajo: design + reset + state.
 *
 * USO POR ESCENARIO:
 *
 *   import "reactigoded/styles/design.css";              // DS completo
 *
 *   import "reactigoded/styles/design.css";
 *   import "reactigoded/styles/reset.css";               // DS + HTML nativo
 *
 *   import "reactigoded/styles/tokens.css";              // solo tokens
 *
 *   import "reactigoded/styles/tokens.css";
 *   import "reactigoded/styles/base.css";                // tokens + a11y
 *                                                        // baseline
 */

// Componentes
export * from "./components";

// Hooks públicos
export { useTheme, type Theme, type UseThemeReturn } from "./hooks/useTheme";
export {
  useControllableState,
  type UseControllableStateOptions,
  type UseControllableStateReturn,
} from "./hooks/useControllableState";

// Utilidades públicas
export { cn } from "./utils/cn";
