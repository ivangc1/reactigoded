import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { Rating } from "./Rating";

const meta = {
  title: "Componentes/Rating",
  component: Rating,
  parameters: {
    docs: {
      description: {
        component:
          "Estrellas clicables con preview por hover. Wrapped en `role=\"radiogroup\"` y cada estrella tiene `aria-label`.",
      },
    },
  },
  argTypes: {
    value: { control: { type: "number", min: 0, max: 10 } },
    max: { control: { type: "number", min: 1, max: 10 } },
    readOnly: { control: "boolean" },
    size: { control: "select", options: ["sm", "md", "lg", "xl"] },
    onValueChange: { action: "change" },
  },
  args: { value: 3, max: 5, size: "md", onValueChange: fn() },
} satisfies Meta<typeof Rating>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {};

export const Sizes: Story = {
  render: () => (
    <div className="ig-story-stack ig-story-stack--full">
      <Rating size="sm" value={4} readOnly aria-label="Pequeño" />
      <Rating size="md" value={4} readOnly aria-label="Mediano" />
      <Rating size="lg" value={4} readOnly aria-label="Grande" />
      <Rating size="xl" value={4} readOnly aria-label="Extra grande" />
    </div>
  ),
};

export const SoloLectura: Story = {
  args: { readOnly: true, value: 4 },
};

export const Controlado: Story = {
  render: () => {
    function Demo() {
      const [v, setV] = useState(0);
      return (
        <div>
          <Rating value={v} onValueChange={setV} />
          <p style={{ marginTop: 8, fontSize: 14 }}>
            Has elegido: <strong>{v}</strong>
          </p>
        </div>
      );
    }
    return <Demo />;
  },
};

export const FocusVisibleStar: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Captura el contraste focus-visible sobre la estrella activa (filled brand). Story con `play()` que pone foco programático en la estrella checked para que axe evalúe el ring contra el fondo de la estrella rellena. Cierra capa 2.2 del debt doc.",
      },
    },
    chromatic: {
      modes: {
        light: { theme: "light" },
        dark: { theme: "dark" },
      },
    },
  },
  args: { value: 4, max: 5 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const star = canvas.getByRole("radio", { name: "4 estrellas" });
    star.focus();
    await new Promise((r) => setTimeout(r, 50));
  },
};

export const ClickEstrella: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Demo interactiva en modo **uncontrolled** (`defaultValue`): el click persiste el valor en el estado interno del componente, así la estrella pulsada se queda marcada. Si se usara `value` (controlled) sin un handler que actualice el estado del padre, el click dispararía `onValueChange` pero el valor volvería al prop fijo — ver story `Controlado` para el patrón controlled con `useState`.",
      },
    },
  },
  // Uncontrolled: defaultValue (no value) para que el click se quede.
  // Render explícito para no heredar `value: 3` del meta args. El
  // spread condicional de onValueChange satisface exactOptionalPropertyTypes
  // (el tipo inferido de args.onValueChange es `Mock | undefined`).
  render: (args) => (
    <Rating
      defaultValue={0}
      max={5}
      aria-label="Pulsa para puntuar"
      {...(args.onValueChange
        ? { onValueChange: args.onValueChange }
        : {})}
    />
  ),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", { name: "4 estrellas" }));
    await expect(args.onValueChange).toHaveBeenCalledWith(4);
  },
};

export const GrayscaleSimulation: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Simulación grayscale (`filter: grayscale(100%)`) sobre el rating para validar el **canal de forma** sin canal de color (issue #102, WCAG 1.4.1 nivel A). Las estrellas filled (★ U+2605) deben seguir siendo visualmente distintas de las empty (☆ U+2606) por **SHAPE** — si lo único que las diferenciara fuera el hue, en grayscale colapsarían a luminancias casi iguales (rutilus vs text-muted miden 1.85:1 light / 1.88:1 dark sin canal de forma). Aproxima también lo que ven los usuarios con acromatopsia o monitor monocromo, y predice el comportamiento bajo `forced-colors: active`.",
      },
    },
    chromatic: {
      modes: {
        light: { theme: "light" },
        dark: { theme: "dark" },
      },
    },
  },
  args: { value: 3, max: 5, readOnly: true },
  render: (args) => (
    <div style={{ filter: "grayscale(100%)" }}>
      <Rating {...args} aria-label="Rating grayscale (validación canal forma)" />
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
  render: () => (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {(["sm", "md", "lg", "xl"] as const).map((size) => (
        <div key={size} style={{ display: "grid", gap: "0.5rem" }}>
          <strong>size: {size}</strong>
          <Rating size={size} aria-label={`Rating ${size} vacío`} value={0} readOnly />
          <Rating size={size} aria-label={`Rating ${size} parcial`} value={2} readOnly />
          <Rating size={size} aria-label={`Rating ${size} máximo`} value={5} readOnly />
          <Rating
            size={size}
            aria-label={`Rating ${size} readonly`}
            value={3}
            readOnly
          />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const groups = canvasElement.querySelectorAll('[role="radiogroup"]');
    await expect(groups.length).toBeGreaterThanOrEqual(16);
  },
};
