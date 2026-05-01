import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Radio } from "./Radio";

const meta = {
  title: "Componentes/Radio",
  component: Radio,
  parameters: {
    docs: {
      description: {
        component:
          "`<input type=\"radio\">` con punto visual custom. Agrupa varios radios con el mismo `name`.",
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
  args: {
    children: "Opción A",
    variant: "brand",
    name: "demo",
    value: "a",
    onChange: fn(),
  },
} satisfies Meta<typeof Radio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Grupo: Story = {
  render: () => (
    <div role="radiogroup" aria-label="Plan" style={{ display: "grid", gap: 6 }}>
      <Radio name="plan" value="free" defaultChecked>
        Free
      </Radio>
      <Radio name="plan" value="pro">
        Pro
      </Radio>
      <Radio name="plan" value="enterprise">
        Enterprise
      </Radio>
    </div>
  ),
};

export const Variantes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 6 }}>
      {(
        ["brand", "secondary", "success", "warning", "danger", "info"] as const
      ).map((v) => (
        <Radio key={v} name={`v-${v}`} variant={v} defaultChecked>
          {v}
        </Radio>
      ))}
    </div>
  ),
};

export const Deshabilitado: Story = {
  args: { disabled: true, defaultChecked: true },
};

export const SelectInteraction: Story = {
  render: () => (
    <div role="radiogroup" aria-label="Plan" style={{ display: "grid", gap: 6 }}>
      <Radio name="plan-int" value="free" data-testid="r-free">Free</Radio>
      <Radio name="plan-int" value="pro" data-testid="r-pro">Pro</Radio>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const free = canvas.getByTestId("r-free");
    const pro = canvas.getByTestId("r-pro");
    await expect(free).not.toBeChecked();
    await userEvent.click(pro);
    await expect(pro).toBeChecked();
    await expect(free).not.toBeChecked();
  },
};
