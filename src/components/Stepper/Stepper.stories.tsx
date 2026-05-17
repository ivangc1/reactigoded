import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { Stepper, Step } from "./index";
import { Button } from "@/components/Button";

const meta = {
  title: "Componentes/Stepper",
  component: Stepper,
  parameters: {
    docs: {
      description: {
        component:
          "Secuencia visual de pasos. El step `active` lleva `aria-current=\"step\"`; los anteriores se marcan como completos. Layout compacto por defecto, o `labeled` con etiquetas debajo.",
      },
    },
  },
  argTypes: {
    active: { control: { type: "number", min: 0 } },
    labeled: { control: "boolean" },
    "aria-label": { control: "text" },
  },
  args: {
    active: 1,
    labeled: false,
    "aria-label": "Checkout",
    children: (
      <>
        <Step />
        <Step />
        <Step />
        <Step />
      </>
    ),
  },
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {
  render: (args) => (
    <Stepper {...args}>
      <Step />
      <Step />
      <Step />
      <Step />
    </Stepper>
  ),
};

export const Labeled: Story = {
  args: { labeled: true, active: 1 },
  render: (args) => (
    <Stepper {...args}>
      <Step label="Datos" />
      <Step label="Pago" />
      <Step label="Confirmación" />
    </Stepper>
  ),
};

export const Interactivo: Story = {
  args: { labeled: true, "aria-label": "Demo" },
  parameters: {
    docs: {
      description: {
        story:
          "Interaction test: pulsar 'Siguiente' avanza el step activo y aplica `aria-current=\"step\"` al siguiente.",
      },
    },
  },
  render: (args) => {
    function Demo() {
      const [active, setActive] = useState(0);
      const total = 4;
      return (
        <div className="ig-story-stack ig-story-stack--full">
          <Stepper {...args} active={active}>
            <Step label="Inicio" />
            <Step label="Detalles" />
            <Step label="Revisión" />
            <Step label="Hecho" />
          </Stepper>
          <div className="ig-story-row ig-story-row--gap-sm">
            <Button
              variant="secondary"
              size="sm"
              disabled={active === 0}
              onClick={() => {
                setActive((a) => Math.max(0, a - 1));
              }}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              disabled={active === total - 1}
              onClick={() => {
                setActive((a) => Math.min(total - 1, a + 1));
              }}
            >
              Siguiente
            </Button>
          </div>
        </div>
      );
    }
    return <Demo />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Estado inicial active=0: el primer dot tiene aria-current="step".
    const initial = canvasElement.querySelectorAll('[aria-current="step"]');
    await expect(initial).toHaveLength(1);
    const initialContent = initial[0]?.textContent ?? "";
    await expect(initialContent).toBe("1");
    const next = canvas.getByRole("button", { name: "Siguiente" });
    await userEvent.click(next);
    // Tras 1 click, active=1: el segundo dot lleva aria-current.
    const after = canvasElement.querySelectorAll('[aria-current="step"]');
    await expect(after).toHaveLength(1);
    await expect(after[0]?.textContent ?? "").toBe("2");
  },
};

export const Uncontrolled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "D5 (beta.24): modo uncontrolled. Sin `active` prop, el Stepper gestiona su propio estado. `defaultActive` setea el valor inicial; `onActiveChange` (opcional) actúa como observer. Interactive por defecto: keyboard nav + click activan steps sin necesidad de useState externo.",
      },
    },
  },
  // No spread `args` del meta — el meta default `active: 1` mezclado
  // con `defaultActive=0` resultaría en controlled-presentational
  // (active gana, sin callback dots NO son role=button → play test
  // falla buscando `.ig-step[role="button"]`).
  render: () => (
    <Stepper defaultActive={0} labeled aria-label="Demo uncontrolled">
      <Step label="Datos" />
      <Step label="Pago" />
      <Step label="Confirmación" />
    </Stepper>
  ),
  play: async ({ canvasElement }) => {
    // D5 invariant: uncontrolled siempre es interactive — dots son
    // role=button focuseables sin necesidad de onActiveChange.
    const dots = canvasElement.querySelectorAll<HTMLElement>(
      '.ig-step[role="button"]',
    );
    await expect(dots).toHaveLength(3);
    // Estado inicial defaultActive=0.
    let current = canvasElement.querySelector('[aria-current="step"]');
    await expect(current?.getAttribute("data-step-index")).toBe("0");
    // Click en el step 2: el estado interno avanza sin callback consumer.
    const step2 = dots[2];
    if (!step2) throw new Error("step 2 not rendered");
    step2.focus();
    await userEvent.click(step2);
    current = canvasElement.querySelector('[aria-current="step"]');
    await expect(current?.getAttribute("data-step-index")).toBe("2");
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
    <div style={{ display: "grid", gap: "2rem" }}>
      <div>
        <strong>Compact — todos los stages</strong>
        <Stepper active={0} aria-label="Stepper inicio">
          <Step />
          <Step />
          <Step />
          <Step />
        </Stepper>
        <Stepper active={2} aria-label="Stepper a la mitad">
          <Step />
          <Step />
          <Step />
          <Step />
        </Stepper>
        <Stepper active={3} aria-label="Stepper último">
          <Step />
          <Step />
          <Step />
          <Step />
        </Stepper>
      </div>
      <div>
        <strong>Labeled — todos los stages</strong>
        <Stepper labeled active={0} aria-label="Labeled inicio">
          <Step label="Carrito" />
          <Step label="Pago" />
          <Step label="Confirmación" />
        </Stepper>
        <Stepper labeled active={1} aria-label="Labeled a la mitad">
          <Step label="Carrito" />
          <Step label="Pago" />
          <Step label="Confirmación" />
        </Stepper>
        <Stepper labeled active={2} aria-label="Labeled completo">
          <Step label="Carrito" />
          <Step label="Pago" />
          <Step label="Confirmación" />
        </Stepper>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const groups = canvasElement.querySelectorAll('[role="group"]');
    await expect(groups.length).toBeGreaterThanOrEqual(6);
  },
};
