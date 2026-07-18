import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: [
    // M-06 (beta.22): MDX de Foundations canónicamente en docs/. Un
    // componente con su propio MDX de docs usa la convención
    // `*.stories.mdx` (cubierta abajo) o lo pone en docs/. No hay `.mdx`
    // sueltos en src/, así que el glob `../src/**/*.mdx` se quitó: avisaba
    // "No story files found for the specified pattern: src/**/*.mdx" (#17).
    "../docs/**/*.mdx",
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
    // ASCII evita unicode en URLs (`%C3%B3n`) que rompía bookmarks y SEO.
    // Las páginas MDX de Foundations sí están en español ("Fundamentos/...").
    defaultName: "Docs",
  },
  // staticDirs: copia `./.storybook/static/` a `storybook-static/static/`
  // durante el build. Necesario para que el script runtime externo
  // (manager-runtime.js, ver `managerHead` abajo) esté disponible vía
  // `<script src="/static/manager-runtime.js">`. Externalizar el script
  // permite CSP estricta (`script-src 'self'`) — antes era un bloque
  // inline que requería `'unsafe-inline'`.
  staticDirs: [{ from: "./static", to: "/static" }],
  // Script runtime del manager — referencia a archivo externo en
  // `.storybook/static/manager-runtime.js`. Comportamiento documentado
  // en el propio archivo (B-04 lang fix + dedupe + title rewrite).
  //
  // Las metas estáticas (title, description, OG, twitter, canonical,
  // theme-color) viven en `.storybook/manager-head.html` — único sitio.
  // NO duplicar aquí (era la causa raíz del bug B-05).
  managerHead: (head: string | undefined) => `
    ${head ?? ""}
    <script src="/static/manager-runtime.js" defer></script>
  `,
  typescript: {
    // NOTA (#17): el plugin `vite:react-docgen-typescript` loguea "Skipping
    // docgen for .storybook/preview.tsx because it is not [a component]" en el
    // build. Es CORRECTO — preview.tsx es config, no un componente; el docgen
    // lo salta bien. No es un defecto. El plugin acepta `exclude`, pero
    // @storybook/react-vite NO lo expone, y parchear el plugin (minificado)
    // desde viteFinal es cirugía frágil por un mensaje informativo benigno →
    // se deja. Los 2 warnings REALES del build (glob `src/**/*.mdx` vacío y
    // chunks >500KB) sí se cerraron (ver `stories` y `viteFinal`).
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
        // node_modules. Doble seguridad: excluir props definidas en archivos
        // cuyo `parent.name` sea HTMLAttributes / AriaAttributes / etc.
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
  viteFinal: (config) => {
    // El storybook-static es un artefacto de docs (dev tool cargado por
    // desarrolladores, no shippeado a usuarios finales): el tamaño de chunk no
    // es perf-crítico como en la lib publicada. Los chunks grandes son
    // inherentes a los bundles de stories + los docs blocks, no un problema
    // aquí — subimos el umbral del aviso para no ensuciar el build (#17).
    config.build = { ...config.build, chunkSizeWarningLimit: 2000 };
    return config;
  },
};

export default config;
