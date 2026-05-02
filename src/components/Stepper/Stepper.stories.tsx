import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Stepper, Step } from "./index";
import { Button } from "../Button";

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
    ariaLabel: { control: "text" },
  },
  args: {
    active: 1,
    labeled: false,
    ariaLabel: "Checkout",
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
  render: () => {
    function Demo() {
      const [active, setActive] = useState(0);
      const total = 4;
      return (
        <div className="ig-story-stack ig-story-stack--full">
          <Stepper active={active} labeled>
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
};
