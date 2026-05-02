/**
 * Igoded Design System — entry point del paquete.
 *
 * Importa los estilos en tu app (5 entradas, eliges qué cargar):
 *
 *   import "reactigoded/styles/tokens.css";  // solo tokens (--ig-*) — ~80 KB
 *                                            // útil si construyes tus propios
 *                                            // componentes sobre el DS.
 *   import "reactigoded/styles/design.css";  // tokens (vía @import) + componentes
 *   import "reactigoded/styles/reset.css";   // estilos por defecto para HTML
 *                                            // nativo (h1-h6, p, a, table…).
 *                                            // Opcional. NO importar si usas
 *                                            // Tailwind, Bootstrap u otro reset.
 *   import "reactigoded/styles/state.css";   // utilities pseudo-class (hover:,
 *                                            // focus:, etc.) — 7.1 MB. Opcional.
 *   import "reactigoded/styles/all.css";     // atajo: design + reset + state.
 */

// Componentes
export * from "./components";

// Hooks públicos
export { useTheme, type Theme, type UseThemeReturn } from "./hooks/useTheme";

// Utilidades públicas
export { cn } from "./utils/cn";
