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
        "neutral",
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
    variant: "neutral",
    title: "Guardado",
    message: "Los cambios se guardaron correctamente.",
    dismissible: true,
  },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {};

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
    <div className="ig-story-stack ig-story-stack--lg">
      {(
        ["neutral", "success", "warning", "danger", "info", "brand", "secondary"] as const
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

export const FireInteraction: Story = {
  args: { variant: "success", title: "Lanzado" },
  parameters: {
    docs: {
      description: {
        story:
          "Click en el botón llama a `toast()` y aparece un Toast con `role=\"status\"` y la variant aplicada. El payload (variant/title/message) se lee de los Controls.",
      },
    },
  },
  render: (args) => {
    function Trigger() {
      const { toast } = useToast();
      return (
        <Button
          onClick={() => {
            toast({
              duration: 0,
              ...(args.title !== undefined && { title: args.title }),
              ...(args.message !== undefined && { message: args.message }),
              ...(args.variant !== undefined && { variant: args.variant }),
            });
          }}
        >
          Lanzar toast
        </Button>
      );
    }
    return (
      <ToastProvider container={null}>
        <Trigger />
      </ToastProvider>
    );
  },
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
    <div className="ig-story-row ig-story-row--gap-sm">
      <Button onClick={() => toast({ title: "Hola", variant: "neutral" })}>
        Neutral
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
    <div className="ig-story-row ig-story-row--gap-sm">
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

function AllVariantsTrigger() {
  const { toast } = useToast();
  const variants = ["brand", "secondary", "success", "warning", "danger", "info", "neutral"] as const;
  return (
    <div className="ig-story-row ig-story-row--gap-sm">
      <Button
        onClick={() => {
          for (const v of variants) {
            toast({
              title: v.charAt(0).toUpperCase() + v.slice(1),
              message: `Toast variant ${v}`,
              variant: v,
              duration: 0,
            });
          }
        }}
      >
        Disparar todos los toasts
      </Button>
    </div>
  );
}

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
    <ToastProvider position="top-right">
      <AllVariantsTrigger />
    </ToastProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: /disparar todos los toasts/i });
    await userEvent.click(trigger);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const toasts = document.querySelectorAll(".ig-toast");
    await expect(toasts.length).toBeGreaterThanOrEqual(4);
  },
};
