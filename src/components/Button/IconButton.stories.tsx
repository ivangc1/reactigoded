import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { IconButton } from "./IconButton";

const meta = {
  title: "Componentes/IconButton",
  component: IconButton,
  parameters: {
    docs: {
      description: {
        component:
          "**Sub-componente de `Button`** con `icon=true` enforced y `aria-label` como prop **required vía TS**. Cuando un botón solo contiene un icono (sin texto visible), olvidar `aria-label` es un fallo a11y frecuente que axe captura solo en runtime; este componente lo eleva a error de compilación. Hereda todo el resto de `ButtonProps` (variant, appearance, size, loading, block, disabled).",
      },
    },
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["brand", "secondary", "success", "warning", "danger", "info"],
    },
    appearance: {
      control: "select",
      options: ["solid", "outline", "ghost", "link"],
    },
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl"],
    },
    loading: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    "aria-label": "Favorito",
    children: "★",
    variant: "brand",
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {};

export const Variantes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Hereda las 6 variantes de color del Button base. La forma cuadrada y el padding equilibrado vienen de `.ig-btn-icon`.",
      },
    },
  },
  render: () => (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      <IconButton aria-label="Brand" variant="brand">★</IconButton>
      <IconButton aria-label="Secondary" variant="secondary">★</IconButton>
      <IconButton aria-label="Success" variant="success">✓</IconButton>
      <IconButton aria-label="Warning" variant="warning">!</IconButton>
      <IconButton aria-label="Danger" variant="danger">×</IconButton>
      <IconButton aria-label="Info" variant="info">i</IconButton>
    </div>
  ),
};

export const Apariencias: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      <IconButton aria-label="Solid" appearance="solid" variant="brand">
        ★
      </IconButton>
      <IconButton aria-label="Outline" appearance="outline" variant="brand">
        ★
      </IconButton>
      <IconButton aria-label="Ghost" appearance="ghost" variant="brand">
        ★
      </IconButton>
    </div>
  ),
};

export const Tamaños: Story = {
  render: () => (
    <div
      style={{
        display: "flex",
        gap: "0.5rem",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <IconButton aria-label="xs" size="xs" variant="info">i</IconButton>
      <IconButton aria-label="sm" size="sm" variant="info">i</IconButton>
      <IconButton aria-label="md" size="md" variant="info">i</IconButton>
      <IconButton aria-label="lg" size="lg" variant="info">i</IconButton>
      <IconButton aria-label="xl" size="xl" variant="info">i</IconButton>
    </div>
  ),
};

export const Loading: Story = {
  args: { loading: true, "aria-label": "Guardando" },
};

export const Disabled: Story = {
  args: { disabled: true, "aria-label": "Deshabilitado" },
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
    <div style={{ display: "grid", gap: "0.75rem", gridAutoFlow: "column" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <IconButton aria-label="Brand solid" variant="brand">★</IconButton>
        <IconButton aria-label="Secondary solid" variant="secondary">★</IconButton>
        <IconButton aria-label="Success solid" variant="success">✓</IconButton>
        <IconButton aria-label="Warning solid" variant="warning">!</IconButton>
        <IconButton aria-label="Danger solid" variant="danger">×</IconButton>
        <IconButton aria-label="Info solid" variant="info">i</IconButton>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <IconButton aria-label="Brand outline" appearance="outline" variant="brand">
          ★
        </IconButton>
        <IconButton aria-label="Brand ghost" appearance="ghost" variant="brand">
          ★
        </IconButton>
        <IconButton aria-label="Loading state" loading variant="brand">
          ★
        </IconButton>
        <IconButton aria-label="Disabled state" disabled variant="brand">
          ★
        </IconButton>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const buttons = canvasElement.querySelectorAll(".ig-btn-icon");
    await expect(buttons.length).toBeGreaterThanOrEqual(10);
  },
};
