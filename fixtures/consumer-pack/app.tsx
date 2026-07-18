/**
 * Consumer-pack fixture — MEDIUM-1 beta.26.
 *
 * Smoke type-check del API público desde el tarball INSTALADO via
 * `npm pack` + `npm install` (no via `compilerOptions.paths`). El
 * orquestador `scripts/test-consumer-pack.mjs` corre `tsc --noEmit`
 * sobre este archivo dos veces:
 *   - `tsconfig.bundler.json`: consumer típico (vite/webpack).
 *   - `tsconfig.nodenext.json`: consumer ESM estricto (NodeNext).
 *
 * Cobertura:
 *   - Root barrel: 5 componentes + 3 types (cubre primitives + compound
 *     surface + hook + cn utility).
 *   - Subpath `/server-safe`: **superficie COMPLETA** (los 36 re-exports)
 *     vía namespace import + `satisfies` — fuerza a tsc a resolver y
 *     materializar el `.d.ts` de cada uno desde el tarball, no solo un
 *     sample. Cierra #24 (era 2/36). Caza una regresión de `.d.ts`
 *     per-componente (import relativo/`@/` roto, contradicción
 *     `stripInternal`) en cualquiera de los 36, invisible con el sample.
 *   - Subpath `/cn`: cn helper individual.
 *
 * Si una regresión rompe el `exports` field, los `.d.ts` resueltos via
 * `node_modules`, o la cadena de peer deps (@floating-ui/react ^0.27
 * pre-1.0), este fixture lo caza pre-publish.
 *
 * NO duplica `fixtures/consumer-types/` y `fixtures/consumer-types-nodenext/`:
 * aquellos prueban resolución via `paths`, este via tarball real.
 * Diferencia capturada por Codex en el cruce beta.25 — el bug NodeNext
 * .d.ts (259× TS2834) era invisible con `paths` y solo emergía con
 * tarball real.
 */
import {
  AlertDialogContent,
  Button,
  FloatingTreeRoot,
  ThemeToggle,
  Tooltip,
  cn,
  useControllableState,
  type AlertDialogContentProps,
  type ButtonProps,
  type TooltipProps,
} from "reactigoded";
import { Button as ServerButton, Toast } from "reactigoded/server-safe";
import * as ServerSafe from "reactigoded/server-safe";
import { cn as cnSubpath } from "reactigoded/cn";

// #24 — cobertura EXHAUSTIVA del subpath `./server-safe` desde el tarball.
// El namespace import + `satisfies` obliga a tsc a resolver el `.d.ts` de
// TODOS los re-exports (los 36 componentes server-safe), no solo el sample
// Button/Toast de abajo. Un `.d.ts` per-componente que no resuelva (import
// roto tras el build) o cuya superficie no materialice rompe aquí, bajo
// bundler Y NodeNext. `Record<string, unknown>` es permisivo: no impone
// forma, solo fuerza la materialización completa del namespace.
const _serverSafeSurface = ServerSafe satisfies Record<string, unknown>;
void _serverSafeSurface;

const buttonProps: ButtonProps = {
  children: "Guardar",
  variant: "brand",
};

const alertDialogProps: AlertDialogContentProps = {
  children: "Confirmar",
  closeOnBackdrop: false,
};

const tooltipProps: TooltipProps = {
  text: "Ayuda",
  children: <button type="button">?</button>,
};

export function App() {
  const { value, setValue } = useControllableState({
    defaultValue: 1,
    onChange: () => {},
  });

  return (
    <FloatingTreeRoot>
      <Button {...buttonProps} onClick={() => setValue((prev) => prev + 1)}>
        {value}
      </Button>
      <AlertDialogContent {...alertDialogProps} />
      <Tooltip {...tooltipProps} />
      <ThemeToggle aria-label="Cambiar tema" />
      <ServerButton>SSR</ServerButton>
      <Toast title={cn("ok", cnSubpath("server"))} />
    </FloatingTreeRoot>
  );
}
