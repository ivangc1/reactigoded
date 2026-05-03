import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { Chip } from "./Chip";

const meta = {
  title: "Componentes/Chip",
  component: Chip,
  parameters: {
    docs: {
      description: {
        component:
          "Etiqueta compacta. Inline por defecto; `selectable` la convierte en botón con estado seleccionado. `onRemove` añade una X de eliminación.",
      },
    },
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["brand", "secondary", "success", "warning", "danger", "info"],
    },
    size: { control: "select", options: ["sm", "md", "lg"] },
    selectable: { control: "boolean" },
    selected: { control: "boolean" },
  },
  args: { children: "Etiqueta", size: "md" },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {};

export const Variantes: Story = {
  args: { children: undefined },
  render: () => (
    <div className="ig-story-row ig-story-row--gap-sm">
      <Chip variant="brand">Brand</Chip>
      <Chip variant="secondary">Secondary</Chip>
      <Chip variant="success">Success</Chip>
      <Chip variant="warning">Warning</Chip>
      <Chip variant="danger">Danger</Chip>
      <Chip variant="info">Info</Chip>
    </div>
  ),
};

export const Sizes: Story = {
  args: { children: undefined },
  render: () => (
    <div className="ig-story-row ig-story-row--gap-sm">
      <Chip size="sm">Small</Chip>
      <Chip size="md">Medium</Chip>
      <Chip size="lg">Large</Chip>
    </div>
  ),
};

export const ConRemove: Story = {
  args: { onRemove: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Eliminar" }));
    await expect(args.onRemove).toHaveBeenCalledOnce();
  },
};

export const Seleccionable: Story = {
  render: () => {
    function Demo() {
      const [active, setActive] = useState<string | null>("react");
      const tags = ["react", "vue", "svelte", "solid"];
      return (
        <div className="ig-story-row ig-story-row--gap-sm">
          {tags.map((t) => (
            <Chip
              key={t}
              selectable
              selected={active === t}
              onClick={() => {
                setActive(t);
              }}
              variant="brand"
            >
              {t}
            </Chip>
          ))}
        </div>
      );
    }
    return <Demo />;
  },
};
