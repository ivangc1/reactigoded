import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Toast } from "./Toast";
import { ToastProvider } from "./ToastProvider";
import { useToast } from "./ToastContext";
import type { ToastPosition } from "./ToastProvider";
import { Button } from "../Button";

const meta = {
  title: "Componentes/Toast",
  component: Toast,
  parameters: {
    docs: {
      description: {
        component:
          "Notificación efímera. Usa `Toast` como primitivo presentational, o monta `ToastProvider` y dispara con `useToast().toast({...})`. Variants `danger`/`warning` se anuncian con `role=\"alert\"`.",
      },
    },
  },
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "success",
        "warning",
        "danger",
        "info",
        "brand",
        "secondary",
      ],
    },
    dismissible: { control: "boolean" },
  },
  args: {
    variant: "default",
    title: "Guardado",
    message: "Los cambios se guardaron correctamente.",
    dismissible: true,
  },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Success: Story = { args: { variant: "success" } };
export const Warning: Story = {
  args: { variant: "warning", title: "Atención", message: "Comprueba la red." },
};
export const Danger: Story = {
  args: { variant: "danger", title: "Error", message: "Algo ha fallado." },
};
export const Info: Story = {
  args: { variant: "info", title: "Info", message: "Hay una nueva versión." },
};

export const TodasLasVariantes: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {(
        ["default", "success", "warning", "danger", "info", "brand", "secondary"] as const
      ).map((v) => (
        <Toast
          key={v}
          variant={v}
          title={v}
          message={`Toast con variant ${v}.`}
        />
      ))}
    </div>
  ),
};

export const ConProvider: Story = {
  render: () => (
    <ToastProvider position="top-right" defaultDuration={4000}>
      <Demo />
    </ToastProvider>
  ),
};

export const Posiciones: Story = {
  render: () => (
    <ToastProvider position="bottom-center" defaultDuration={3000}>
      <PositionsDemo />
    </ToastProvider>
  ),
};

function FireToastButton() {
  const { toast } = useToast();
  return (
    <Button
      onClick={() => {
        toast({ title: "Lanzado", variant: "success", duration: 0 });
      }}
    >
      Lanzar toast
    </Button>
  );
}

export const FireInteraction: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Click en el botón llama a `toast()` y aparece un Toast con `role=\"status\"` y la variant aplicada.",
      },
    },
  },
  render: () => (
    <ToastProvider container={null}>
      <FireToastButton />
    </ToastProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /lanzar toast/i }));
    const toastNode = await canvas.findByText("Lanzado");
    await expect(toastNode.closest(".ig-toast")).toHaveClass("ig-toast-success");
  },
};

function Demo() {
  const { toast, dismissAll } = useToast();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <Button onClick={() => toast({ title: "Hola", variant: "default" })}>
        Default
      </Button>
      <Button
        variant="success"
        onClick={() =>
          toast({ title: "Guardado", message: "Cambios persistidos", variant: "success" })
        }
      >
        Success
      </Button>
      <Button
        variant="warning"
        onClick={() =>
          toast({ title: "Atención", message: "Sin conexión", variant: "warning" })
        }
      >
        Warning
      </Button>
      <Button
        variant="danger"
        onClick={() =>
          toast({ title: "Error", message: "Operación fallida", variant: "danger", duration: 0 })
        }
      >
        Danger (persistente)
      </Button>
      <Button variant="secondary" onClick={dismissAll}>
        Limpiar
      </Button>
    </div>
  );
}

function PositionsDemo() {
  const { toast } = useToast();
  const positions: ToastPosition[] = [
    "top-right",
    "top-left",
    "bottom-right",
    "bottom-left",
    "top-center",
    "bottom-center",
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {positions.map((p) => (
        <Button
          key={p}
          variant="secondary"
          onClick={() =>
            toast({ title: p, message: `Toast en ${p}`, variant: "info" })
          }
        >
          {p}
        </Button>
      ))}
    </div>
  );
}
