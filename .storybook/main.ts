import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(ts|tsx|mdx)",
  ],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-themes",
    "@storybook/addon-vitest",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {
    defaultName: "Docs",
  },
  typescript: {
    reactDocgen: "react-docgen-typescript",
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
      // Filtra props heredadas de tipos DOM (HTMLAttributes, AriaAttributes,
      // DOMAttributes…). Storybook Controls solo muestra props definidas en
      // los archivos del propio package, no las decenas de props nativas
      // como `accessKey`, `contentEditable`, `onCopy`, etc. que no aportan
      // valor al usuario del DS.
      propFilter: (prop) => {
        if (!prop.parent) return true;
        const name = prop.parent.fileName;
        if (/node_modules/.test(name)) return false;
        // Tipos React DOM viven en @types/react/ts5.0/ y similares — los caza
        // node_modules. Doble seguridad: excluir propsdefinidas en archivos
        // cuyo `parent.name` sea HTMLAttributes/AriaAttributes/DOMAttributes.
        if (
          prop.parent.name === "HTMLAttributes" ||
          prop.parent.name === "AriaAttributes" ||
          prop.parent.name === "DOMAttributes" ||
          prop.parent.name === "ButtonHTMLAttributes" ||
          prop.parent.name === "InputHTMLAttributes" ||
          prop.parent.name === "TextareaHTMLAttributes" ||
          prop.parent.name === "SelectHTMLAttributes" ||
          prop.parent.name === "AnchorHTMLAttributes"
        ) {
          return false;
        }
        return true;
      },
    },
  },
};

export default config;
