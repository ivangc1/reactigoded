import type { Meta, StoryObj } from "@storybook/react-vite";
import { Progress } from "./Progress";

const meta = {
  title: "Componentes/Progress",
  component: Progress,
  parameters: {
    docs: {
      description: {
        component:
          "Barra de progreso lineal con `role=\"progressbar\"`. Soporta `value/max`, modo `indeterminate`, variants de color y sizes sm/md/lg.",
      },
    },
  },
  argTypes: {
    value: { control: { type: "range", min: 0, max: 100, step: 1 } },
    max: { control: "number" },
    variant: {
      control: "select",
      options: [
        undefined,
        "brand",
        "secondary",
        "success",
        "warning",
        "danger",
        "info",
      ],
    },
    size: { control: "select", options: ["sm", "md", "lg"] },
    indeterminate: { control: "boolean" },
  },
  args: { value: 40, max: 100, size: "md" },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {
  decorators: [
    (Story) => (
      <div className="ig-story-stack ig-story-stack--md">
        <Story />
      </div>
    ),
  ],
};

export const Variantes: Story = {
  render: () => (
    <div className="ig-story-stack ig-story-stack--md">
      <Progress value={20} variant="brand" />
      <Progress value={40} variant="success" />
      <Progress value={60} variant="warning" />
      <Progress value={80} variant="danger" />
      <Progress value={50} variant="info" />
    </div>
  ),
};

export const Tamaños: Story = {
  render: () => (
    <div className="ig-story-stack ig-story-stack--md">
      <Progress value={50} size="sm" variant="brand" />
      <Progress value={50} size="md" variant="brand" />
      <Progress value={50} size="lg" variant="brand" />
    </div>
  ),
};

export const Indeterminate: Story = {
  args: { indeterminate: true, variant: "brand" },
  decorators: [
    (Story) => (
      <div className="ig-story-stack ig-story-stack--md">
        <Story />
      </div>
    ),
  ],
};

export const ConLabelCustom: Story = {
  args: { value: 70, ariaLabel: "Subiendo archivo (70%)" },
  decorators: [
    (Story) => (
      <div className="ig-story-stack ig-story-stack--md">
        <Story />
      </div>
    ),
  ],
};
