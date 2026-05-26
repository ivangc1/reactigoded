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
