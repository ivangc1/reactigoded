/**
 * Consumer type-check fixture — gate beta.25 B3.alias-leak + Step.d.ts.
 *
 * Simula a un consumer enterprise con `skipLibCheck: false` que importa
 * varios componentes del paquete via `paths` mapeados a `dist/`. Si
 * cualquier `.d.ts` publicado es autocontradictorio (Step.d.ts pre-B3:
 * destructuring de `@internal` borradas) o referencia paths irresolubles
 * (alias `@/...` pre-B3.alias: emitidos sin resolver por tsc), este
 * typecheck falla y caza la regresión pre-publish.
 *
 * Diferencias clave con `fixtures/rsc/`:
 *   - `skipLibCheck: false` (vs `true` en RSC): valida CADA `.d.ts` del
 *     dist como lo haría un consumer real.
 *   - SIN `customConditions: ["react-server"]`: emula consumer ESM
 *     normal (browser/server full app), no RSC.
 *
 * Si añades un componente al barrel principal con surface API nueva
 * o re-exports cross-componente, añádelo aquí también — solo cubrimos
 * los `.d.ts` de lo importado. Coverage representativa, no exhaustiva:
 * basta con tocar familias compound (Dialog, AlertDialog, Stepper) y
 * primitives que dependen de hooks/componentes vía alias (ThemeToggle).
 */
import {
  type AlertProps,
  type ButtonProps,
  type DialogProps,
  type StepProps,
  type StepperProps,
  type ThemeToggleProps,
  type TooltipProps,
  Alert,
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  Button,
  Dialog,
  DialogContent,
  DialogTrigger,
  Step,
  Stepper,
  ThemeToggle,
  Tooltip,
} from "reactigoded";

declare const _alertProps: AlertProps;
declare const _buttonProps: ButtonProps;
declare const _dialogProps: DialogProps;
declare const _stepProps: StepProps;
declare const _stepperProps: StepperProps;
declare const _themeToggleProps: ThemeToggleProps;
declare const _tooltipProps: TooltipProps;

export function ConsumerApp(): React.ReactElement {
  return (
    <>
      <Alert>Hello</Alert>
      <Button>Click</Button>
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>content</DialogContent>
      </Dialog>
      <AlertDialog>
        <AlertDialogContent>
          <AlertDialogClose>Cancel</AlertDialogClose>
        </AlertDialogContent>
      </AlertDialog>
      <Stepper>
        <Step />
      </Stepper>
      <ThemeToggle />
      <Tooltip text="hint">
        <span>target</span>
      </Tooltip>
    </>
  );
}

export type {
  _alertProps,
  _buttonProps,
  _dialogProps,
  _stepProps,
  _stepperProps,
  _themeToggleProps,
  _tooltipProps,
};
