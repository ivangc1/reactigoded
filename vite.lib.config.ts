/**
 * Configuración Vite EXCLUSIVA para el build de librería npm.
 *
 * Se introdujo en `1.0.0-beta.4` para no depender del guard
 * `STORYBOOK !== "true"` que tenía `vite.config.ts`. Si Storybook cambiaba
 * esa env var en el futuro, el build de librería podía contaminar el de
 * Storybook (dts + copyDesignSystemStyles ejecutándose donde no debían).
 *
 * Uso:
 *   npm run build        → invoca esta config explícitamente
 *   npm run dev          → usa vite.config.ts (playground)
 *   npm run storybook    → Storybook usa su propia pipeline + vite.config.ts
 *   storybook build      → idem
 */
import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { transform as esbuildTransform } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Copia los CSS del design system a dist/styles/, los minifica y genera
 * index.css que hace `@import` (no concatenación, para no duplicar bytes).
 *
 * Minificación opt-in con esbuild (loader: "css") en `state.css` y los
 * demás artefactos publicados. esbuild ya viene como dep transitiva de
 * Vite, así que no añadimos nada al árbol. La minificación es importante
 * sobre todo para `state.css` (~7 MB → ~700 KB gzipped) y reduce de
 * forma sensible el size-limit de los demás bundles aunque ya estén en
 * el rango bajo.
 */
function copyDesignSystemStyles(): PluginOption {
  return {
    name: "copy-design-system-styles",
    apply: "build",
    async closeBundle() {
      const srcDir = resolve(__dirname, "src/styles");
      const outDir = resolve(__dirname, "dist/styles");
      mkdirSync(outDir, { recursive: true });
      const files = [
        "igoded-tokens.css",
        "igoded-base.css",
        "igoded-components.css",
        "igoded-design.css",
        "igoded-fonts.css",
        "igoded-reset.css",
        "igoded-state-css.css",
      ];
      for (const f of files) {
        const raw = readFileSync(resolve(srcDir, f), "utf8");
        const result = await esbuildTransform(raw, {
          loader: "css",
          minify: true,
        });
        writeFileSync(resolve(outDir, f), result.code);
      }
      const allCss =
        `@import "./igoded-design.css";\n` +
        `@import "./igoded-reset.css";\n` +
        `@import "./igoded-state-css.css";\n`;
      writeFileSync(resolve(outDir, "index.css"), allCss);
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    dts({
      tsconfigPath: "./tsconfig.build.json",
      insertTypesEntry: true,
      copyDtsFiles: true,
    }),
    copyDesignSystemStyles(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "Reactigoded",
      formats: ["es", "cjs"] as const,
      fileName: (format: string) =>
        `index.${format === "es" ? "js" : "cjs"}`,
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react/jsx-runtime": "jsxRuntime",
        },
        assetFileNames: (assetInfo: { names: string[] }) => {
          const isCss = assetInfo.names.some((n) => n.endsWith(".css"));
          return isCss
            ? "styles/[name][extname]"
            : "assets/[name][extname]";
        },
      },
    },
    sourcemap: false,
    emptyOutDir: true,
  },
});
