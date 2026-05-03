import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./Badge";

const meta = {
  title: "Componentes/Badge",
  component: Badge,
  parameters: {
    docs: {
      description: {
        component:
          "Etiqueta breve de estado o categoría. Inline, no clickeable. 6 variantes con relleno o outline, 3 tamaños y modo `pill`.",
      },
    },
  },
  argTypes: {
    variant: {
      description: "Color de la badge.",
      control: "select",
      options: ["brand", "secondary", "success", "warning", "danger", "info"],
      table: { defaultValue: { summary: "brand" } },
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      table: { defaultValue: { summary: "md" } },
    },
    pill: {
      description: "Bordes totalmente redondeados.",
      control: "boolean",
    },
    outline: {
      description: "Bordeada en vez de rellena.",
      control: "boolean",
    },
  },
  args: {
    children: "Badge",
    variant: "brand",
    size: "md",
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {};

export const Variantes: Story = {
  args: { children: undefined },
  render: () => (
    <div className="ig-flex ig-flex-wrap ig-gap-2">
      <Badge variant="brand">Brand</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="danger">Danger</Badge>
      <Badge variant="info">Info</Badge>
    </div>
  ),
};

export const Tamaños: Story = {
  args: { children: undefined },
  render: () => (
    <div className="ig-flex ig-items-center ig-gap-2">
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
      <Badge size="lg">Large</Badge>
    </div>
  ),
};

/**
 * `pill` y `variant` son ortogonales: `pill` controla la forma
 * (cápsula vs esquinas suaves) y `variant` el color. Se combinan
 * libremente. Para comparar la forma, mira `Variantes` (mismas
 * variantes sin `pill`, con esquinas `rounded-md`).
 */
export const Pill: Story = {
  args: { children: undefined },
  parameters: {
    docs: {
      description: {
        story:
          "Las 6 variantes con `pill` (cápsula `rounded-full`). `Variantes` muestra las mismas con la forma default (`rounded-md`).",
      },
    },
  },
  render: () => (
    <div className="ig-flex ig-flex-wrap ig-gap-2">
      <Badge pill variant="brand">Brand</Badge>
      <Badge pill variant="secondary">Secondary</Badge>
      <Badge pill variant="success">Success</Badge>
      <Badge pill variant="warning">Warning</Badge>
      <Badge pill variant="danger">Danger</Badge>
      <Badge pill variant="info">Info</Badge>
    </div>
  ),
};

export const Outline: Story = {
  args: { children: undefined },
  render: () => (
    <div className="ig-flex ig-flex-wrap ig-gap-2">
      <Badge outline variant="brand">
        Brand
      </Badge>
      <Badge outline variant="success">
        Success
      </Badge>
      <Badge outline variant="warning">
        Warning
      </Badge>
      <Badge outline variant="danger">
        Danger
      </Badge>
    </div>
  ),
};

export const Dot: Story = {
  args: { children: undefined },
  parameters: {
    docs: {
      description: {
        story:
          "`dot={true}` renderiza un círculo sin texto y mueve los `children` a `aria-label` para SR. Ideal como indicador de estado o notificación.",
      },
    },
  },
  render: () => (
    <div className="ig-flex ig-items-center ig-gap-3">
      <span>
        Online <Badge dot variant="success">Conectado</Badge>
      </span>
      <span>
        Ausente <Badge dot variant="warning">Inactivo</Badge>
      </span>
      <span>
        Offline <Badge dot variant="secondary">Desconectado</Badge>
      </span>
      <span>
        Notificación{" "}
        <Badge dot variant="danger" aria-label="3 mensajes nuevos" />
      </span>
    </div>
  ),
};

export const ConContador: Story = {
  args: { children: undefined },
  render: () => (
    <div className="ig-flex ig-items-center ig-gap-3">
      <span>
        Mensajes <Badge pill>12</Badge>
      </span>
      <span>
        Errores{" "}
        <Badge pill variant="danger">
          3
        </Badge>
      </span>
      <span>
        Pendientes{" "}
        <Badge pill variant="warning">
          7
        </Badge>
      </span>
    </div>
  ),
};
