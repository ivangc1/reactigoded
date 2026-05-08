import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Alert } from "./Alert";
import { Button } from "@/components/Button";

const meta = {
  title: "Componentes/Alert",
  component: Alert,
  parameters: {
    docs: {
      description: {
        component:
          "Mensaje de feedback con variants semánticos. `danger`/`warning` se anuncian como `role=\"alert\"` assertive; el resto como `role=\"status\"` polite. Opcionalmente `dismissible` con icono y título.",
      },
    },
  },
  argTypes: {
    variant: {
      control: "select",
      options: [
        "success",
        "warning",
        "danger",
        "info",
        "brand",
        "secondary",
        "neutral",
      ],
    },
    dismissible: { control: "boolean" },
  },
  args: {
    variant: "info",
    title: "Sin conexión",
    children: "Vuelve a intentarlo cuando recuperes señal.",
    onClose: fn(),
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {};

export const Variantes: Story = {
  render: () => (
    <div className="ig-story-stack ig-story-stack--xl">
      <Alert variant="success" title="Guardado">
        Cambios persistidos correctamente.
      </Alert>
      <Alert variant="warning" title="Advertencia">
        Tu plan vence en 3 días.
      </Alert>
      <Alert variant="danger" title="Error" dismissible>
        No se pudo procesar el pago.
      </Alert>
      <Alert variant="info" title="Info">
        Hay una nueva versión disponible.
      </Alert>
      <Alert variant="brand" title="Brand">
        Mensaje destacado por marca.
      </Alert>
      <Alert variant="secondary" title="Secondary">
        Variante secundaria.
      </Alert>
      <Alert variant="neutral" title="Neutral">
        Aviso neutral sin color semántico.
      </Alert>
    </div>
  ),
};

export const ConIcono: Story = {
  args: {
    variant: "warning",
    icon: <span aria-hidden="true">⚠️</span>,
    title: "Atención",
    children: "Este alert tiene icono al inicio.",
  },
};

export const Dismissible: Story = {
  args: { dismissible: true, variant: "info" },
};

export const DismissInteraction: Story = {
  args: { dismissible: true, variant: "info" },
  parameters: {
    docs: {
      description: {
        story:
          "Click en el botón × dispara `onClose` y oculta el alert (uncontrolled).",
      },
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/vuelve a intentarlo/i)).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: /cerrar/i }));
    await expect(args.onClose).toHaveBeenCalled();
    await expect(canvas.queryByText(/vuelve a intentarlo/i)).toBeNull();
  },
};

export const ControlledDismissible: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Modo controlado: la app gestiona el `open` y reacciona a `onOpenChange`. Re-mostrar requiere setear `open=true`.",
      },
    },
  },
  render: () => {
    function ControlledDemo() {
      const [open, setOpen] = useState(true);
      return (
        <div className="ig-story-stack ig-story-stack--xl">
          <Alert
            variant="warning"
            title="Aviso controlado"
            dismissible
            open={open}
            onOpenChange={setOpen}
          >
            Cierra y reábrelo desde el botón.
          </Alert>
          <Button
            variant="secondary"
            onClick={() => {
              setOpen((v) => !v);
            }}
          >
            {open ? "Ocultar alerta" : "Mostrar alerta"}
          </Button>
        </div>
      );
    }
    return <ControlledDemo />;
  },
};

export const AllStates: Story = {
  parameters: {
    layout: "padded",
    docs: { disable: true },
    chromatic: {
      modes: {
        light: { theme: "light" },
        dark: { theme: "dark" },
      },
    },
  },
  render: () => (
    <div style={{ display: "grid", gap: "1rem" }}>
      <Alert variant="brand" title="Brand">Mensaje informativo brand.</Alert>
      <Alert variant="secondary" title="Secondary">
        Mensaje informativo secondary.
      </Alert>
      <Alert variant="success" title="Éxito">
        Operación completada correctamente.
      </Alert>
      <Alert variant="warning" title="Aviso">
        Revisa antes de continuar.
      </Alert>
      <Alert variant="danger" title="Error">
        No se pudo completar la operación.
      </Alert>
      <Alert variant="info" title="Info">
        Información adicional para el usuario.
      </Alert>
      <Alert variant="neutral" title="Neutral">
        Comentario neutro sin variant semántica.
      </Alert>
      <Alert variant="success" title="Con icono" icon="✓">
        Variante con icono custom.
      </Alert>
      <Alert variant="warning" title="Dismissible" dismissible>
        Se puede cerrar.
      </Alert>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const alerts = canvasElement.querySelectorAll(".ig-alert");
    await expect(alerts.length).toBeGreaterThanOrEqual(9);
  },
};
