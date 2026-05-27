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
 * Cobertura representativa, no exhaustiva:
 *   - Root barrel: 5 componentes + 3 types (cubre primitives + compound
 *     surface + hook + cn utility).
 *   - Subpath `/server-safe`: subset RSC-safe.
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
import { cn as cnSubpath } from "reactigoded/cn";

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
