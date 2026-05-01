/**
 * Igoded Design System — entry point del paquete.
 *
 * Importa los estilos en tu app:
 *   import "reactigoded/styles/all.css";   // ambos archivos
 *   // o por separado:
 *   import "reactigoded/styles/design.css";
 *   import "reactigoded/styles/state.css";
 */

// Componentes
export * from "./components";

// Hooks públicos
export { useTheme, type Theme, type UseThemeReturn } from "./hooks/useTheme";

// Utilidades públicas
export { cn } from "./utils/cn";
