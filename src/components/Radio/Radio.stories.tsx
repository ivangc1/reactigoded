import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { Radio } from "./Radio";
import { MatrixGrid, type Variant } from "@/stories/_matrix";

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

export const PorDefecto: Story = {};

export const Grupo: Story = {
  render: () => (
    <div role="radiogroup" aria-label="Plan" className="ig-story-stack ig-story-stack--sm">
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
    <div className="ig-story-stack ig-story-stack--sm">
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
    <MatrixGrid
      renderRow={(v) => (
        <>
          <Radio name={`row-${v}-unchecked`} variant={v as Variant}>
            unchecked
          </Radio>
          <Radio name={`row-${v}-checked`} variant={v as Variant} defaultChecked>
            checked
          </Radio>
          <Radio name={`row-${v}-disabled`} variant={v as Variant} disabled>
            disabled
          </Radio>
          <Radio
            name={`row-${v}-checked-disabled`}
            variant={v as Variant}
            defaultChecked
            disabled
          >
            checked disabled
          </Radio>
        </>
      )}
    />
  ),
  play: async ({ canvasElement }) => {
    const radios = canvasElement.querySelectorAll('input[type="radio"]');
    await expect(radios.length).toBeGreaterThanOrEqual(20);
  },
};

