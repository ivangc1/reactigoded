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
// fonts.css carga Google Fonts (Electrolize/Saira/JetBrains Mono). Es opt-in
// para los consumers del paquete, pero en Storybook lo queremos para que la
// demo vea la tipografía oficial. Si no se importa aquí, los componentes
// caen al fallback system-ui declarado en tokens.css.
import "../src/styles/igoded-fonts.css";
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
    // Wrapper visual: canvas con --ig-bg-base + padding para que la story
    // se distinga del chrome de Storybook en LIGHT (donde bg-base #faf9fc
    // es casi indistinguible del blanco #fff del manager). En DARK ya
    // contrasta solo. Skipea el wrapper cuando la story usa
    // `parameters.layout = "fullscreen"` (Sidebar/Navbar) para no romper
    // sus layouts a 100vh.
    (Story, ctx) => {
      if (ctx.parameters?.layout === "fullscreen") return <Story />;
      return (
        <div
          style={{
            background: "var(--ig-bg-base)",
            color: "var(--ig-text-body)",
            minHeight: "calc(100vh - 2rem)",
            padding: "var(--ig-space-6)",
            borderRadius: "var(--ig-rounded-md)",
          }}
        >
          <Story />
        </div>
      );
    },
    withThemeByDataAttribute({
      themes: { light: "light", dark: "dark" },
      // dark-first: alineado con useTheme y ThemeSwitch desde 1.0.0-beta.3.
      // El consumer puede alternar desde la toolbar.
      defaultTheme: "dark",
      attributeName: "data-theme",
      parentSelector: "html",
    }),
  ],
};

export default preview;
