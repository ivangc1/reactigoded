import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { Switch } from "./Switch";

const meta = {
  title: "Componentes/Switch",
  component: Switch,
  parameters: {
    docs: {
      description: {
        component:
          "Toggle accesible. `<input type=\"checkbox\" role=\"switch\" aria-checked>` envuelto en `<label>` con pista visual decorativa.",
      },
    },
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["brand", "secondary", "success", "warning", "danger", "info"],
    },
    disabled: { control: "boolean" },
    onChange: { action: "change" },
  },
  args: { children: "Notificaciones", variant: "brand", onChange: fn() },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {};

export const Variantes: Story = {
  render: () => (
    <div className="ig-story-stack ig-story-stack--sm">
      {(
        ["brand", "secondary", "success", "warning", "danger", "info"] as const
      ).map((v) => (
        <Switch key={v} variant={v} defaultChecked>
          {v}
        </Switch>
      ))}
    </div>
  ),
};

export const Deshabilitado: Story = {
  args: { disabled: true, defaultChecked: true },
};

export const Controlado: Story = {
  render: () => {
    function Demo() {
      const [on, setOn] = useState(false);
      return (
        <Switch
          checked={on}
          onChange={(e) => {
            setOn(e.target.checked);
          }}
        >
          {on ? "Activado" : "Desactivado"}
        </Switch>
      );
    }
    return <Demo />;
  },
};

export const Toggle: Story = {
  args: { children: "Habilitar" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("switch");
    await expect(input).not.toBeChecked();
    await userEvent.click(input);
    await expect(args.onChange).toHaveBeenCalled();
  },
};
