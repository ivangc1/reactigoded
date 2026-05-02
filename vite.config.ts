import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdirSync, copyFileSync, writeFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Copia los CSS del design system a dist/styles/ y genera un index.css que
// hace `@import` de los principales (no concatenación, para no duplicar bytes).
// Cubre los `exports` declarados en package.json:
//   "./styles/tokens.css"      → solo variables --ig-* + keyframes (~98 KB)
//   "./styles/base.css"        → globales mínimos (a11y/scrollbar/selection)
//   "./styles/components.css"  → utilities + componentes (.ig-*)
//   "./styles/design.css"      → tokens + base + components vía @import
//   "./styles/reset.css"       → estilos por defecto HTML nativo (opt-in)
//   "./styles/state.css"       → utilities pseudo-class (opt-in, 7.1 MB)
//   "./styles/all.css"         → design + reset + state vía @import
function copyDesignSystemStyles(): PluginOption {
  return {
    name: "copy-design-system-styles",
    apply: "build",
    closeBundle() {
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
        copyFileSync(resolve(srcDir, f), resolve(outDir, f));
      }
      // `all.css` referencia los otros vía @import — no copiar bytes.
      // Orden: design (= tokens + base + components vía @import) → reset → state.
      const allCss =
        `@import "./igoded-design.css";\n` +
        `@import "./igoded-reset.css";\n` +
        `@import "./igoded-state-css.css";\n`;
      writeFileSync(resolve(outDir, "index.css"), allCss);
    },
  };
}

// https://vite.dev/config/
//
// Dual mode:
//   `npm run dev`         → playground (serve src/main.tsx)
//   `npm run build`       → library mode (empaqueta src/index.ts a dist/)
//   `npm run storybook`   → Storybook builder (NO library mode)
//   `storybook build`     → Storybook static (NO library mode)
//
// El switch lib build se activa SOLO cuando es realmente un build de
// librería: `command === "build"` (no es dev), `mode === "production"`
// (no playground), y NO hay `STORYBOOK=true` en env (Storybook lo setea
// al arrancar). Sin este guard, `storybook build` pasaba mode=production
// y disparaba dts plugin + copyDesignSystemStyles innecesariamente.
export default defineConfig(({ command, mode }) => {
  const isLibBuild =
    command === "build" &&
    mode === "production" &&
    process.env["STORYBOOK"] !== "true";

  return {
    plugins: [
      react(),
      ...(isLibBuild
        ? [
            dts({
              tsconfigPath: "./tsconfig.build.json",
              insertTypesEntry: true,
              copyDtsFiles: true,
            }),
            copyDesignSystemStyles(),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
    // Pre-optimiza react-dom para que la primera ejecución de los tests de
    // Storybook (que importan stories que usan `createPortal`) no dispare un
    // reload del optimizer y tumbe la suite.
    optimizeDeps: {
      include: ["react-dom"],
    },
    ...(isLibBuild
      ? {
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
                assetFileNames: (assetInfo: {
                  names: string[];
                }) => {
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
        }
      : {}),
  };
});
