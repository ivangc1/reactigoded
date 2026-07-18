// Flat config — TypeScript only, modo strict.
// https://typescript-eslint.io/users/configs#strict

import js from "@eslint/js";
import globals from "globals";
import jestDom from "eslint-plugin-jest-dom";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import storybook from "eslint-plugin-storybook";
import testingLibrary from "eslint-plugin-testing-library";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    "dist",
    "storybook-static",
    "coverage",
    "node_modules",
    "playwright-report",
    // fixtures/ tiene su propio tsconfig (e.g., fixtures/rsc/tsconfig.json
    // con customConditions: ["react-server"] + paths a dist/). ESLint
    // del root no debe parsearlo bajo el tsconfig.json principal.
    "fixtures",
    // scripts/runtime-oracle/vercel/ es un proyecto Vercel Edge AISLADO y
    // efímero (su propio package.json/vercel.json + api/probe.ts con tipos del
    // Edge runtime, `new Function` para la sonda eval-sink, etc.). No está en
    // el tsconfig del root → ESLint no debe parsearlo aquí. Se deploya, se mide
    // y se borra (ver su README). #18.
    "scripts/runtime-oracle/vercel",
  ]),

  // Base JS (config files)
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.node },
    },
  },

  // TypeScript estricto + type-checked
  ...tseslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ...config.languageOptions,
      ecmaVersion: 2024,
      globals: { ...globals.browser },
      parserOptions: {
        ...config.languageOptions?.parserOptions,
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: { jsx: true },
      },
    },
  })),
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },

  // Storybook
  ...storybook.configs["flat/recommended"],

  // Tests — Testing Library + jest-dom matchers
  //
  // `eslint-plugin-jest-dom@5.5.0` (última publicada) usa
  // `context.getSourceCode()` retirado en ESLint 9+. v6 lleva bloqueada
  // desde feb 2025 por NPM_TOKEN inválido del bot semantic-release; el
  // maintainer principal (@benmonro) no responde y solo él tiene permisos
  // para republicar (issue upstream:
  // https://github.com/testing-library/eslint-plugin-jest-dom/issues/417).
  //
  // Mientras tanto, aplicamos un patch local con `patch-package` que
  // sustituye `context.getSourceCode()` por `context.sourceCode` en
  // `dist/context.js` + 3 reglas afectadas. El patch vive en
  // `patches/eslint-plugin-jest-dom+5.5.0.patch` y se aplica
  // automáticamente con el script `prepare` del package.json (`npm install`
  // local lo invoca; el consumer del paquete final NO lo ejecuta).
  // Cuando v6 (o un fork bajo @eslint-community / @testing-library) salga,
  // basta `npm install` la versión nueva y `rm patches/eslint-plugin-jest-dom+*`.
  {
    ...testingLibrary.configs["flat/react"],
    files: ["**/*.{test,spec}.{ts,tsx}"],
  },
  {
    ...jestDom.configs["flat/recommended"],
    // T-105: incluido `**/*.stories.tsx` porque 34/35 stories usan
    // jest-dom matchers (`toHaveAttribute`, `toBeInTheDocument`, etc) en
    // `play` functions vía `@storybook/test`. Sin esta ampliación las
    // stories podían usar `toHaveAttribute("aria-disabled", "true")`
    // donde existe el matcher idiomático `toBeDisabled()` y el linter
    // no avisaba — divergencia de estilo entre tests y stories.
    // testing-library NO se amplía: las stories no son tests RTL y
    // varias reglas (await-async-events, prefer-screen-queries) tienen
    // intent contradictorio con el patrón Storybook `within(canvasElement)`.
    files: ["**/*.{test,spec}.{ts,tsx}", "**/*.stories.tsx"],
  },
  {
    files: ["**/*.{test,spec}.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // Tests pueden hacer non-null asserts y expresiones unbound sin penalizar.
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/unbound-method": "off",
      // Para tests de un design system es legítimo verificar clases en el
      // wrapper via container.querySelector — la alternativa (añadir
      // data-testid solo para tests) ensucia el componente público.
      "testing-library/no-container": "off",
      "testing-library/no-node-access": "off",
    },
  },

  // Componentes que integran @floating-ui/react (subfamilia
  // src/components/floating/). Estructura definida pre-rc.1
  // para acomodar Tooltip + futuros Popover, HoverCard, menus
  // (Dropdown/Context/MenuBar/Submenu), selection (Select/Combobox/
  // Autocomplete/MultiSelect/TagInput), pickers (Date/Time/Color/
  // Emoji), editor (FloatingToolbar/MentionMenu/SlashCommand) y
  // overlays (Tour/FloatingActionMenu).
  //
  // La regla `react-hooks/refs` (eslint-plugin-react-hooks v7+,
  // compiler-aware) detecta lecturas de `ref.current` durante render —
  // un anti-patrón que rompe la memoización de React Compiler. Pero NO
  // distingue entre:
  //   (a) lectura de `.current` durante render ❌ (lo que la regla quiere cazar).
  //   (b) acceso a `refs.setReference` / `refs.setFloating` para
  //       pasarlo como callback ref ✅ (Floating UI canónico).
  //   (c) `useMergeRefs([floating, externalRef])` ✅ (canónico FUI).
  //
  // Floating UI usa (b) y (c) en cada componente. La regla y la
  // librería están en desacuerdo arquitectural, no caso por caso —
  // sembrar `eslint-disable-next-line` por cada uso multiplicaría
  // ruido sin beneficio. Apagamos la regla en TODOS los archivos
  // bajo `floating/`. El glob es estable: cualquier nuevo componente
  // de Floating UI añadido a la subfamilia hereda la decisión sin
  // tocar el config.
  {
    files: ["src/components/floating/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/refs": "off",
    },
  },
]);
