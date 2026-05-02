import type { Preview } from "@storybook/react-vite";
import { withThemeByDataAttribute } from "@storybook/addon-themes";

// Orden de imports CSS:
//   1. design.css → @import interno de tokens (--ig-*) + base (a11y/scrollbar/
//                   selection/box-sizing) + components (clases .ig-*).
//   2. reset.css  → estilos por defecto para HTML nativo (h1-h6, p, a, table…).
//                   Lo importamos aquí para que las demos del catálogo se vean
//                   "como un consumer con reset opt-in". Documentado en README.
//   3. state.css  → NO se importa por defecto (es 7.1 MB, solo necesario si
//                   las demos usan utilities pseudo-class como `hover:ig-bg-brand`
//                   directamente en HTML, lo cual ningún componente hace).
import "../src/styles/igoded-design.css";
import "../src/styles/igoded-reset.css";
// CSS interno de Storybook (clases ig-story-* para layouts de stories).
// No se publica al paquete.
import "./storybook.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "base",
      values: [
        { name: "base", value: "var(--ig-bg-base)" },
        { name: "surface", value: "var(--ig-bg-surface)" },
        { name: "muted", value: "var(--ig-bg-muted)" },
        { name: "sunken", value: "var(--ig-bg-sunken)" },
      ],
    },
    layout: "padded",
    a11y: {
      // 'todo' = panel rojo no falla el test, solo avisa.
      // 'error' = falla los tests de Vitest si hay violación.
      test: "error",
    },
    docs: {
      toc: true,
    },
  },
  initialGlobals: {
    a11y: {
      manual: false,
    },
  },
  tags: ["autodocs"],
  decorators: [
    withThemeByDataAttribute({
      themes: { light: "light", dark: "dark" },
      defaultTheme: "light",
      attributeName: "data-theme",
      parentSelector: "html",
    }),
  ],
};

export default preview;
