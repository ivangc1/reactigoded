import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdirSync, copyFileSync, writeFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Copia los CSS del design system a dist/styles/ y genera un index.css que
// hace `@import` de los 4 (no concatenación, para no duplicar bytes).
// Cubre los `exports` declarados en package.json:
//   "./styles/tokens.css"  → solo variables --ig-* + keyframes (~80 KB)
//   "./styles/design.css"  → tokens (vía @import interno) + componentes
//   "./styles/reset.css"   → estilos por defecto para HTML nativo (opt-in)
//   "./styles/state.css"   → utilities pseudo-class (opt-in, 7.1 MB)
//   "./styles/all.css"     → atajo: design + reset + state vía @import
function copyDesignSystemStyles(): PluginOption {
  return {
    name: "copy-design-system-styles",
    apply: "build",
    closeBundle() {
      const srcDir = resolve(__dirname, "src/styles");
      const outDir = resolve(__dirname, "dist/styles");
      mkdirSync(outDir, { recursive: true });
      copyFileSync(
        resolve(srcDir, "igoded-tokens.css"),
        resolve(outDir, "igoded-tokens.css"),
      );
      copyFileSync(
        resolve(srcDir, "igoded-design.css"),
        resolve(outDir, "igoded-design.css"),
      );
      copyFileSync(
        resolve(srcDir, "igoded-reset.css"),
        resolve(outDir, "igoded-reset.css"),
      );
      copyFileSync(
        resolve(srcDir, "igoded-state-css.css"),
        resolve(outDir, "igoded-state-css.css"),
      );
      // `all.css` referencia los otros vía @import — no copiar bytes.
      // El consumer puede usar este path como punto único de entrada CSS.
      // Orden: design (tokens vía @import interno + componentes) → reset → state.
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
//   `npm run dev`     → playground en dev (sirve src/main.tsx + src/App.tsx)
//   `npm run build`   → library mode (empaqueta src/index.ts a dist/)
//
// El switch lo controla la env var STORYBOOK (la pone Storybook al arrancar).
// En build de paquete, generamos también tipos `.d.ts` con vite-plugin-dts.
export default defineConfig(({ mode }) => {
  const isLibBuild = mode === "production";

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
