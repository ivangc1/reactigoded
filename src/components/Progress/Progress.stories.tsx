import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Progress } from "./Progress";
import { MatrixGrid, type Variant } from "../../stories/_matrix";

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
  parameters: {
    docs: {
      description: {
        story:
          "Las 6 variantes de color. Se renderizan en `size=\"lg\"` con label visible para distinguirlas — en `size=\"md\"` (8 px de alto) los matices oscuros del modo light pueden parecer iguales.",
      },
    },
  },
  render: () => (
    <div className="ig-story-stack ig-story-stack--md">
      {(
        ["brand", "secondary", "success", "warning", "danger", "info"] as const
      ).map((v, i) => (
        <div key={v} className="ig-story-stack ig-story-stack--sm">
          <span className="ig-story-label">{v}</span>
          <Progress
            value={20 + i * 12}
            size="lg"
            variant={v}
            aria-label={`${v} ejemplo`}
          />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    // Regresión: cada variant debe resolver a un background-color computado
    // distinto. Si alguien rompe la cascade (token huérfano, override pisando
    // `.ig-progress-{v} .ig-progress-bar`, etc.) este test cae.
    const canvas = within(canvasElement);
    const bars = canvas
      .getAllByRole("progressbar")
      .map((el) => el.querySelector(".ig-progress-bar") as HTMLElement);
    await expect(bars).toHaveLength(6);
    const colors = bars.map((b) => getComputedStyle(b).backgroundColor);
    const unique = new Set(colors);
    await expect(unique.size).toBe(6);
  },
};

export const Sizes: Story = {
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
  args: { value: 70, "aria-label": "Subiendo archivo (70%)" },
  decorators: [
    (Story) => (
      <div className="ig-story-stack ig-story-stack--md">
        <Story />
      </div>
    ),
  ],
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
      <MatrixGrid
        renderRow={(v) => (
          <div style={{ display: "grid", gap: "0.25rem", flex: 1 }}>
            <Progress variant={v as Variant} value={0} />
            <Progress variant={v as Variant} value={50} />
            <Progress variant={v as Variant} value={100} />
            <Progress variant={v as Variant} indeterminate />
          </div>
        )}
      />
      <div style={{ display: "grid", gap: "0.25rem" }}>
        <strong>sizes</strong>
        <Progress size="sm" value={50} />
        <Progress size="md" value={50} />
        <Progress size="lg" value={50} />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bars = canvas.queryAllByRole("progressbar");
    await expect(bars.length).toBeGreaterThan(20);
  },
};
