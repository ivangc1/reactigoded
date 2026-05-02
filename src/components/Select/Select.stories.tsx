import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Select } from "./Select";

const meta = {
  title: "Componentes/Select",
  component: Select,
  parameters: {
    docs: {
      description: {
        component:
          "`<select>` nativo estilizado con estados de validación. Pasa `<option>` como children.",
      },
    },
  },
  argTypes: {
    state: { control: "select", options: ["default", "error", "success"] },
    disabled: { control: "boolean" },
    onChange: { action: "change" },
  },
  args: {
    state: "default",
    "aria-label": "Plan",
    onChange: fn(),
    children: (
      <>
        <option value="">— elige —</option>
        <option value="free">Free</option>
        <option value="pro">Pro</option>
        <option value="enterprise">Enterprise</option>
      </>
    ),
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {};

export const Error: Story = { args: { state: "error" } };

export const Success: Story = { args: { state: "success", defaultValue: "pro" } };

export const Deshabilitado: Story = { args: { disabled: true } };

export const ChangeInteraction: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Interaction test: cambiar la opción dispara `onChange` con el nuevo `value`.",
      },
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const select = canvas.getByLabelText<HTMLSelectElement>("Plan");
    await userEvent.selectOptions(select, "pro");
    await expect(select.value).toBe("pro");
    await expect(args.onChange).toHaveBeenCalled();
  },
};
