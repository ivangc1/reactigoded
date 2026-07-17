import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Textarea } from "./Textarea";

const meta = {
  title: "Componentes/Textarea",
  component: Textarea,
  parameters: {
    docs: {
      description: {
        component:
          "`<textarea>` estilizado con `auto` para auto-resize y estados de validación.",
      },
    },
  },
  argTypes: {
    auto: { control: "boolean" },
    state: { control: "select", options: ["default", "invalid", "valid"] },
    disabled: { control: "boolean" },
    rows: { control: "number" },
  },
  args: {
    placeholder: "Escribe varias líneas…",
    rows: 4,
    state: "default",
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {};

export const Auto: Story = {
  args: { auto: true, defaultValue: "Crece automáticamente al añadir texto." },
};

export const Estados: Story = {
  render: () => (
    <div className="ig-story-form">
      <Textarea aria-label="Default" placeholder="Default" rows={3} />
      <Textarea
        aria-label="Success"
        state="valid"
        defaultValue="Texto válido"
        rows={3}
      />
      <Textarea
        aria-label="Error"
        state="invalid"
        defaultValue="Texto con errores"
        rows={3}
      />
    </div>
  ),
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
  // Cada Textarea con aria-label único (axe rule label).
  render: () => (
    <div style={{ display: "grid", gap: "1rem", maxWidth: 500 }}>
      <Textarea
        aria-label="Textarea default"
        placeholder="default"
        rows={3}
      />
      <Textarea
        aria-label="Textarea auto-grow"
        placeholder="auto-grow con field-sizing"
        auto
      />
      <Textarea
        aria-label="Textarea error"
        placeholder="error state"
        state="invalid"
      />
      <Textarea
        aria-label="Textarea success"
        placeholder="success state"
        state="valid"
      />
      <Textarea
        aria-label="Textarea disabled"
        placeholder="disabled"
        disabled
      />
      <Textarea
        aria-label="Textarea con valor"
        defaultValue={"Línea 1\nLínea 2\nLínea 3"}
        rows={4}
      />
      <Textarea
        aria-label="Textarea rows 2"
        placeholder="rows=2"
        rows={2}
      />
      <Textarea
        aria-label="Textarea rows 8"
        placeholder="rows=8"
        rows={8}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const textareas = canvasElement.querySelectorAll("textarea");
    await expect(textareas.length).toBe(8);
  },
};
