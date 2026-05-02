import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
//
// Esta config es para playground dev y para Storybook (que la importa via
// `viteFinal` automático en `@storybook/react-vite`). NO contiene `build.lib`
// ni `dts` plugin — esos viven en `vite.lib.config.ts` desde `1.0.0-beta.4`,
// invocada explícitamente por `npm run build` (`vite build -c vite.lib.config.ts`).
//
//   npm run dev            → playground (serve src/main.tsx)
//   npm run build          → vite.lib.config.ts (no este archivo)
//   npm run storybook      → este archivo (compartido con Storybook builder)
//   storybook build        → idem
export default defineConfig({
  plugins: [react()],
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
});
