import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: [
    // M-06 (beta.22): MDX de Foundations canónicamente en docs/.
    // src/**/*.mdx se mantiene por si algún componente trae su propio
    // MDX de docs (raro hoy pero patrón válido).
    "../docs/**/*.mdx",
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
    // ASCII evita unicode en URLs (`%C3%B3n`) que rompía bookmarks y SEO.
    // Las páginas MDX de Foundations sí están en español ("Fundamentos/...").
    defaultName: "Docs",
  },
  // Inyecta meta tags + un script que (1) fuerza lang="es" en <html>,
  // (2) elimina <title> y <meta name="description"> duplicados que
  // Storybook puede inyectar en algunos paths del manager, y
  // (3) reescribe el <title> cada vez que Storybook lo cambia
  // (el router del manager pone "<story> ⋅ Storybook" tras cada
  // navegación). MutationObserver, no polling.
  managerHead: (head: string | undefined) => `
    ${head ?? ""}
    <meta name="description" content="Igoded Design System — componentes React 19 + TypeScript + CSS utility-first state-driven, con accesibilidad WCAG AA verificada." />
    <meta name="theme-color" content="#0c1515" />
    <meta property="og:title" content="Igoded Design System" />
    <meta property="og:description" content="Componentes React, tokens CSS, accesibilidad y documentación visual." />
    <meta property="og:url" content="https://igoded.es" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary" />
    <link rel="canonical" href="https://igoded.es" />
    <script>
      (function () {
        var BRAND = "Igoded Design System";

        // 1. Lang correcto (B-04) — Storybook publica con lang="" por defecto.
        if (document.documentElement.lang !== "es") {
          document.documentElement.lang = "es";
        }

        // 2. Dedupe <title> y <meta name="description"> (B-05).
        function dedupe() {
          var titles = document.querySelectorAll("head > title");
          for (var i = 1; i < titles.length; i++) titles[i].remove();
          var descs = document.querySelectorAll('head > meta[name="description"]');
          for (var j = 1; j < descs.length; j++) descs[j].remove();
        }

        // 3. Rewrite del título a brand cuando Storybook lo restaura a su default.
        function rewrite() {
          var t = document.title;
          if (!t) return;
          if (t === "Storybook" || t === "storybook - Storybook") {
            document.title = BRAND;
          } else if (/⋅\\s*Storybook$/.test(t)) {
            document.title = t.replace(/⋅\\s*Storybook$/, "· " + BRAND);
          } else if (/-\\s*Storybook$/.test(t)) {
            document.title = t.replace(/-\\s*Storybook$/, "· " + BRAND);
          }
        }

        dedupe();
        rewrite();

        // MutationObserver sobre <title> — captura cualquier cambio sin polling.
        var titleEl = document.querySelector("title");
        if (titleEl && typeof MutationObserver !== "undefined") {
          new MutationObserver(function () {
            rewrite();
            dedupe();
          }).observe(titleEl, {
            childList: true,
            characterData: true,
            subtree: true,
          });
        }
        // Fallback: si el <title> se reemplaza entero (no solo su texto),
        // observa el <head> también para re-disparar dedupe + rewrite.
        if (typeof MutationObserver !== "undefined") {
          new MutationObserver(function () {
            rewrite();
            dedupe();
          }).observe(document.head, {
            childList: true,
          });
        }
      })();
    </script>
  `,
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
};

export default config;
