import { addons } from "storybook/manager-api";
import { create } from "storybook/theming/create";

// Tema del chrome (sidebar, toolbar, panel) para que el catálogo se sienta
// igoded desde el primer pixel — no Storybook genérico.
//
// Tokens (snapshot de igoded-tokens.css en beta.18):
//   --ig-vitreus-nox (#3ae2f7)  → primary  (selección, links activos)
//   --ig-axis-nox    (#d2bff7)  → secondary
//   --ig-fundus-nox  (#0c1515)  → app background dark
//   --ig-cinis-nox   (#c4cada)  → text color
//
// IMPORTANT: estos hex son hardcoded por la API de Storybook (no acepta
// CSS vars). Si la paleta cambia, sincronizar manualmente con tokens.css.
//
// Mantenemos `base: "dark"` porque la identidad de igoded es dark-first;
// el preview del centro sí permite alternar light/dark con `addon-themes`.
const igodedTheme = create({
  base: "dark",

  brandTitle: "Igoded Design System",
  brandUrl: "https://igoded.es",
  brandTarget: "_self",

  colorPrimary: "#3ae2f7",
  colorSecondary: "#d2bff7",

  appBg: "#0c1515",
  appContentBg: "#101b1b",
  appPreviewBg: "#0c1515",
  appBorderColor: "rgba(196, 202, 218, 0.18)",
  appBorderRadius: 14,

  textColor: "#c4cada",
  textInverseColor: "#0c1515",
  textMutedColor: "rgba(196, 202, 218, 0.7)",

  barBg: "#101b1b",
  barTextColor: "#c4cada",
  barHoverColor: "#3ae2f7",
  barSelectedColor: "#3ae2f7",

  inputBg: "#101b1b",
  inputBorder: "rgba(196, 202, 218, 0.2)",
  inputTextColor: "#c4cada",
  inputBorderRadius: 10,

  fontBase:
    '"Saira", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  fontCode: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
});

addons.setConfig({
  theme: igodedTheme,
  sidebar: {
    showRoots: true,
  },
});
