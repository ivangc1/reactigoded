import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
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

export const PorDefecto: Story = {};

export const Variantes: Story = {
  render: () => (
    <div className="ig-story-stack ig-story-stack--md">
      {(
        ["default", "brand", "secondary", "success", "warning", "danger", "info"] as const
      ).map((v) => (
        <div key={v}>
          <span className="ig-story-label">{v}</span>
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
    <div className="ig-story-row" style={{ height: "3.75rem" }}>
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
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div>
        <strong>horizontal solid</strong>
        <Divider />
        <Divider variant="brand" />
        <Divider variant="success" />
        <Divider variant="danger" />
      </div>
      <div>
        <strong>horizontal dashed</strong>
        <Divider dashed />
        <Divider variant="brand" dashed />
      </div>
      <div>
        <strong>con texto</strong>
        <Divider>OR</Divider>
        <Divider variant="brand">SECTION</Divider>
        <Divider variant="success">SAVED</Divider>
      </div>
      <div
        style={{
          display: "flex",
          height: 32,
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <strong>vertical</strong>
        <span>A</span>
        <Divider vertical />
        <span>B</span>
        <Divider vertical variant="brand" />
        <span>C</span>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const seps = canvasElement.querySelectorAll('[role="separator"], hr');
    await expect(seps.length).toBeGreaterThanOrEqual(8);
  },
};
