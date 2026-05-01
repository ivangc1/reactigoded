import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Dos proyectos:
//   - "unit": tests rápidos en happy-dom para lógica de hooks/utils y render shallow.
//   - "storybook": ejecuta los stories como tests reales en browser (Chromium
//     vía Playwright) usando @storybook/addon-vitest. Detecta regresiones de
//     render y corre las funciones `play()` como interaction tests + axe a11y.
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: {
          alias: {
            "@": resolve(__dirname, "./src"),
          },
        },
        test: {
          name: "unit",
          environment: "happy-dom",
          globals: true,
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
          css: true,
          // WSL: el arranque frío del entorno DOM pasa de 30s y vitest
          // mata workers. Subimos el hookTimeout y usamos el pool threads
          // (más ligero que forks) con singleThread como red de seguridad
          // para que ningún test file se pierda silenciosamente.
          testTimeout: 30000,
          hookTimeout: 120000,
          pool: "threads",
          maxWorkers: 1,
          isolate: false,
        },
      },
      // Proyecto "storybook": ejecuta cada story en Chromium real via Playwright,
      // captura regresiones de render, corre los `play()` como interaction tests
      // y aplica axe-core (a11y). Requiere libs del sistema instaladas con
      // `sudo npx playwright install-deps chromium`.
      {
        plugins: [
          storybookTest({ configDir: resolve(__dirname, ".storybook") }),
        ],
        resolve: { alias: { "@": resolve(__dirname, "./src") } },
        test: {
          name: "storybook",
          // WSL + Playwright: un solo browser secuencial evita que los
          // workers compitan por arrancar Chromium y mueran por timeout.
          testTimeout: 30000,
          hookTimeout: 120000,
          pool: "forks",
          maxWorkers: 1,
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
