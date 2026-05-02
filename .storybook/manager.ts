import { addons } from "storybook/manager-api";
import { create } from "storybook/theming/create";

// Tema del chrome (sidebar, toolbar, panel) para que el catálogo se sienta
// igoded desde el primer pixel — no Storybook genérico.
//
// Tokens elegidos:
//   --ig-vitreus (#5eded5)  → primary  (selección, links activos)
//   --ig-axis    (#d4c2f9)  → secondary
//   --ig-fundus  (#0c1515)  → app background dark
//   --ig-bg-surface (#101b1b) → content background dark
//   --ig-cinis   (#c3cbdb)  → text color
//
// Mantenemos `base: "dark"` porque la identidad de igoded es dark-first;
// el preview del centro sí permite alternar light/dark con `addon-themes`.
const igodedTheme = create({
  base: "dark",

  brandTitle: "Igoded Design System",
  brandUrl: "https://igoded.es",
  brandTarget: "_self",

  colorPrimary: "#5eded5",
  colorSecondary: "#d4c2f9",

  appBg: "#0c1515",
  appContentBg: "#101b1b",
  appPreviewBg: "#0c1515",
  appBorderColor: "rgba(195, 203, 219, 0.18)",
  appBorderRadius: 14,

  textColor: "#c3cbdb",
  textInverseColor: "#0c1515",
  textMutedColor: "rgba(195, 203, 219, 0.7)",

  barBg: "#101b1b",
  barTextColor: "#c3cbdb",
  barHoverColor: "#5eded5",
  barSelectedColor: "#5eded5",

  inputBg: "#101b1b",
  inputBorder: "rgba(195, 203, 219, 0.2)",
  inputTextColor: "#c3cbdb",
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
