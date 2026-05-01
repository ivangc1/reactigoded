import type { Meta, StoryObj } from "@storybook/react-vite";
import { Divider } from "./Divider";

const meta = {
  title: "Componentes/Divider",
  component: Divider,
  parameters: {
    docs: {
      description: {
        component:
          "Línea separadora horizontal (`<hr>`) o vertical (`<span>`). Con `children` se convierte en separador con texto centrado.",
      },
    },
  },
  argTypes: {
    vertical: { control: "boolean" },
    dashed: { control: "boolean" },
    variant: {
      control: "select",
      options: [
        "default",
        "brand",
        "secondary",
        "success",
        "warning",
        "danger",
        "info",
      ],
    },
  },
  args: { variant: "default", vertical: false, dashed: false },
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variantes: Story = {
  render: () => (
    <div style={{ width: 320 }}>
      {(
        ["default", "brand", "secondary", "success", "warning", "danger", "info"] as const
      ).map((v) => (
        <div key={v} style={{ marginBottom: 12 }}>
          <span
            style={{
              fontSize: 13,
              color: "var(--ig-text-body)",
              fontFamily: "var(--ig-font-mono)",
            }}
          >
            {v}
          </span>
          <Divider variant={v} />
        </div>
      ))}
    </div>
  ),
};

export const Discontinuo: Story = {
  args: { dashed: true },
};

export const Vertical: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", height: 60, gap: 12 }}>
      <span>Izquierda</span>
      <Divider vertical />
      <span>Centro</span>
      <Divider vertical dashed />
      <span>Derecha</span>
    </div>
  ),
};

export const ConTexto: Story = {
  args: { children: "ó" },
};

export const ConTextoVariante: Story = {
  args: { children: "Sección importante", variant: "brand" },
};
