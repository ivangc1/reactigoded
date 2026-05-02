import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Slider } from "./Slider";

const meta = {
  title: "Componentes/Slider",
  component: Slider,
  parameters: {
    docs: {
      description: {
        component:
          "`<input type=\"range\">` estilizado. Con `showValue` muestra el valor; `formatValue` permite formatear (ej. porcentajes, monedas).",
      },
    },
  },
  argTypes: {
    min: { control: "number" },
    max: { control: "number" },
    step: { control: "number" },
    showValue: { control: "boolean" },
    disabled: { control: "boolean" },
    onChange: { action: "change" },
  },
  args: {
    "aria-label": "Volumen",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 30,
    onChange: fn(),
  },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {};

export const ConValor: Story = {
  args: { showValue: true },
};

export const Porcentaje: Story = {
  args: {
    showValue: true,
    formatValue: (v) => `${String(v)}%`,
    defaultValue: 60,
  },
};

export const Pasos: Story = {
  args: { min: 0, max: 10, step: 0.5, showValue: true, defaultValue: 2.5 },
};

export const Deshabilitado: Story = {
  args: { disabled: true, showValue: true, defaultValue: 50 },
};

export const OnValueChange: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`onValueChange(v: number)` recibe el valor decodificado (alternativa al `onChange` nativo que recibe el `ChangeEvent`). `formatValue` además se aplica a `aria-valuetext` para que los lectores de pantalla anuncien el formato (`50%` en vez de `50`).",
      },
    },
  },
  render: () => {
    function Demo() {
      const [value, setValue] = useState(60);
      return (
        <div className="ig-story-stack ig-story-stack--md">
          <Slider
            aria-label="Volumen"
            min={0}
            max={100}
            value={value}
            showValue
            formatValue={(v) => `${String(v)}%`}
            onValueChange={setValue}
          />
          <p style={{ fontSize: 14, margin: 0 }}>
            Valor numérico: <strong>{value}</strong>
          </p>
        </div>
      );
    }
    return <Demo />;
  },
};
