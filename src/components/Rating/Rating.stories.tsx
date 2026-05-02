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

export const Tamaños: Story = {
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

export const ClickEstrella: Story = {
  args: { value: 0 },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", { name: "4 estrellas" }));
    await expect(args.onValueChange).toHaveBeenCalledWith(4);
  },
};
