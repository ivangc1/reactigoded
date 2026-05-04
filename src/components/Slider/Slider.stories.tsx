import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, within } from "storybook/test";

// Nota: el `args.onChange` (vi.fn) tampoco es viable para verificar input
// nativo bajo Playwright headless porque React filtra eventos sintéticos
// no provenientes de su own listener. Dejamos solo smoke render + a11y.
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

export const RenderEstadoInicial: Story = {
  args: { showValue: true, defaultValue: 42, formatValue: (v) => `${String(v)}%` },
  parameters: {
    docs: {
      description: {
        story:
          "Smoke test (sin `play`): el render coincide con `defaultValue` y aplica `formatValue`. Los tests de keyboard real viven en `Slider.test.tsx` (happy-dom), porque Chromium headless intercepta ArrowRight sobre `type=range` de forma inconsistente y React tampoco capta dispatchEvent('input') manual sin el setter low-level.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const slider = canvas.getByLabelText<HTMLInputElement>("Volumen");
    await expect(Number(slider.value)).toBe(42);
    await expect(slider).toHaveAttribute("aria-valuetext", "42%");
  },
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
    <div style={{ display: "grid", gap: "1rem", maxWidth: 400 }}>
      <Slider aria-label="Slider mínimo" defaultValue={0} />
      <Slider aria-label="Slider intermedio" defaultValue={50} />
      <Slider aria-label="Slider máximo" defaultValue={100} />
      <Slider
        aria-label="Slider con valor visible"
        defaultValue={60}
        showValue
      />
      <Slider
        aria-label="Slider porcentaje"
        defaultValue={75}
        showValue
        formatValue={(v) => `${String(v)}%`}
      />
      <Slider
        aria-label="Slider con pasos"
        defaultValue={40}
        min={0}
        max={100}
        step={20}
        showValue
      />
      <Slider aria-label="Slider deshabilitado" defaultValue={30} disabled />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const sliders = canvasElement.querySelectorAll('input[type="range"]');
    await expect(sliders.length).toBeGreaterThanOrEqual(7);
  },
};
