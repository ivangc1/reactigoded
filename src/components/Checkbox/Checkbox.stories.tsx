import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Checkbox } from "./Checkbox";

const meta = {
  title: "Componentes/Checkbox",
  component: Checkbox,
  parameters: {
    docs: {
      description: {
        component:
          "`<input type=\"checkbox\">` con marca visual custom. 6 colores semánticos cuando está marcado.",
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
  args: { children: "Acepto los términos", variant: "brand", onChange: fn() },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Marcado: Story = {
  args: { defaultChecked: true },
};

export const Variantes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 6 }}>
      {(
        ["brand", "secondary", "success", "warning", "danger", "info"] as const
      ).map((v) => (
        <Checkbox key={v} variant={v} defaultChecked>
          {v}
        </Checkbox>
      ))}
    </div>
  ),
};

export const Deshabilitado: Story = {
  args: { disabled: true, defaultChecked: true },
};

export const Indeterminate: Story = {
  args: { children: "Selección parcial" },
  render: (args) => (
    <Checkbox
      {...args}
      ref={(el) => {
        if (el) el.indeterminate = true;
      }}
    />
  ),
};

export const ToggleInteraction: Story = {
  args: { children: "Acepto" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("checkbox", { name: "Acepto" });
    await expect(input).not.toBeChecked();
    await userEvent.click(input);
    await expect(input).toBeChecked();
    await expect(args.onChange).toHaveBeenCalled();
  },
};
