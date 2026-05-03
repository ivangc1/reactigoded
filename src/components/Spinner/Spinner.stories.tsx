import type { Meta, StoryObj } from "@storybook/react-vite";
import { Spinner } from "./Spinner";

const meta = {
  title: "Componentes/Spinner",
  component: Spinner,
  parameters: {
    docs: {
      description: {
        component:
          "Indicador de carga circular animado. Aplica `role=\"status\"` y un texto `sr-only` para que los lectores de pantalla anuncien el estado.",
      },
    },
  },
  argTypes: {
    variant: {
      description: "Color del spinner.",
      control: "select",
      options: ["brand", "secondary", "success", "warning", "danger", "info"],
      table: { defaultValue: { summary: "brand" } },
    },
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl"],
      table: { defaultValue: { summary: "md" } },
    },
    "aria-label": {
      description: "Texto accesible para lectores de pantalla (`aria-label`).",
      control: "text",
      table: { defaultValue: { summary: "Cargando…" } },
    },
  },
  args: {
    variant: "brand",
    size: "md",
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {};

export const Variantes: Story = {
  render: () => (
    <div className="ig-flex ig-items-center ig-gap-4">
      <Spinner variant="brand" />
      <Spinner variant="secondary" />
      <Spinner variant="success" />
      <Spinner variant="warning" />
      <Spinner variant="danger" />
      <Spinner variant="info" />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="ig-flex ig-items-center ig-gap-4">
      <Spinner size="xs" />
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
      <Spinner size="xl" />
    </div>
  ),
};

export const LabelPersonalizado: Story = {
  args: { "aria-label": "Procesando pago, espera un momento…" },
};
