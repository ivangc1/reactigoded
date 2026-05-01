import type { Preview } from "@storybook/react-vite";
import { withThemeByDataAttribute } from "@storybook/addon-themes";
import "../src/styles/igoded-design.css";
import "../src/styles/igoded-state-css.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: { disable: true },
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
    (Story) => (
      <div
        style={{
          background: "var(--ig-bg-base)",
          color: "var(--ig-text-body)",
          minHeight: "100vh",
          padding: "1rem",
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default preview;
