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
import dts, { type PluginOptions as DtsPluginOptions } from "vite-plugin-dts";
import { transform as esbuildTransform } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";

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
      // Fragmentos de state.css emitidos por
      // scripts/build-state-css-fragments.mjs (post-RC1). Permite
      // import granular: `reactigoded/styles/state/hover.css` solo.
      const stateSrcDir = resolve(__dirname, "src/styles/state");
      const stateOutDir = resolve(__dirname, "dist/styles/state");
      if (existsSync(stateSrcDir)) {
        mkdirSync(stateOutDir, { recursive: true });
        for (const f of readdirSync(stateSrcDir)) {
          if (!f.endsWith(".css")) continue;
          const raw = readFileSync(resolve(stateSrcDir, f), "utf8");
          const result = await esbuildTransform(raw, {
            loader: "css",
            minify: true,
          });
          writeFileSync(resolve(stateOutDir, f), result.code);
        }
      }
      const allCss =
        `@import "./igoded-design.css";\n` +
        `@import "./igoded-reset.css";\n` +
        `@import "./igoded-state-css.css";\n`;
      writeFileSync(resolve(outDir, "index.css"), allCss);
    },
  };
}

// L-10: tipar la config del plugin con `satisfies` para que TS rechace
// opciones inválidas (en lugar de aceptarlas y dejarlas sin efecto).
// Histórico: probé `rollupTypes: true` (nombre v4 antiguo) y vite-plugin-dts
// v5 lo aceptó silenciosamente sin colapsar los .d.ts — el flag correcto
// en v5 es `bundleTypes`. Sin `satisfies`, este tipo de typo se descubre
// solo inspeccionando dist tras el build, no en typecheck.
const dtsOptions = {
  tsconfigPath: "./tsconfig.build.json",
  insertTypesEntry: true,
  copyDtsFiles: true,
} satisfies DtsPluginOptions;

export default defineConfig({
  plugins: [
    react(),
    dts(dtsOptions),
    copyDesignSystemStyles(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  build: {
    minify: "esbuild",
    lib: {
      // H-12 (RC1 gate review): multi-entry para permitir tree-shaking
      // del subpath `reactigoded/cn`. Pre-fix: importar `cn` desde el
      // barrel root arrastraba el bundle entero (incluyendo createPortal
      // de Toast vía react-dom) porque el build era monolítico. Con
      // entry separado, el consumer que solo necesita `cn` recibe un
      // chunk de ~600 B sin react-dom.
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        cn: resolve(__dirname, "src/utils/cn.ts"),
      },
      name: "Reactigoded",
      formats: ["es", "cjs"] as const,
      // Filename por entry: ESM `<name>.js`, CJS `<name>.cjs`.
      fileName: (format: string, entryName: string) =>
        `${entryName}.${format === "es" ? "js" : "cjs"}`,
    },
    rollupOptions: {
      // @floating-ui/react: peer-dep externalizada desde post-RC1.
      // Razones (decisión documentada en POST_RC1_BACKLOG.md):
      //   • Tamaño: ahorra ~17 KB gz del bundle ESM (de ~31 KB → ~15 KB).
      //   • Deduplicación: si el consumer ya tiene @floating-ui/react
      //     en su árbol (Radix, Headless UI, otra DS), bundlearla
      //     duplica la dep en runtime.
      // NO externalizamos por "higiene de logs" — externalizar NO
      // elimina los console del consumer, solo los mueve a su bundle.
      // El guardrail CI con scope a `[reactigoded]` cubre la higiene
      // en commit separado (`cade31e`).
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "@floating-ui/react",
        // D1-P2 (beta.24): clsx promovido a peer-dep, externalizado.
        // El consumer debe instalar `clsx@^2.1.0` además de reactigoded.
        // Ahorra ~500B gz del bundle ESM principal y permite que
        // consumers que ya usan clsx (Tailwind, shadcn/ui, etc.)
        // dedupen la dep — un solo módulo en runtime en lugar de dos.
        "clsx",
      ],
      output: {
        // B-17: garantiza que la directiva "use client" llegue al bundle
        // publicado (dist/index.js + dist/index.cjs), preservada como
        // primera línea del chunk. Sin esto, el minifier de Rollup la
        // puede tratar como expresión irrelevante y eliminarla. La
        // directiva la añadimos también en src/index.ts para que tsc
        // y los autodocs la vean en source, pero el banner es la única
        // garantía cross-version de que termine en el dist.
        //
        // H-12 follow-up (codex P1 sobre PR #73): el banner se aplica
        // SOLO al chunk del entry `index`. El subpath `cn` (utility
        // pura, sin hooks ni browser APIs) es server-safe y NO debe
        // llevar "use client" — si lo hiciera, RSC (Next.js App Router
        // server files) lo rechazaría, defeating el propósito del
        // subpath. clsx ya no es chunk compartido desde beta.24 (es
        // peer-dep externalizada).
        banner: (chunk) =>
          chunk.name === "index" ? '"use client";' : "",
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
