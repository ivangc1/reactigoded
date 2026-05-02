import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Tooltip } from "./Tooltip";
import { Button } from "../Button";

const meta = {
  title: "Componentes/Tooltip",
  component: Tooltip,
  parameters: {
    docs: {
      description: {
        component:
          "Wrapper CSS-only que muestra un texto contextual al hover/focus. Para a11y inyecta `aria-describedby` en el child y un `<span role=\"tooltip\">` sr-only.",
      },
    },
  },
  argTypes: {
    text: { control: "text" },
    placement: {
      control: "select",
      options: ["top", "bottom", "left", "right"],
    },
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
  },
  args: {
    text: "Texto del tooltip",
    placement: "top",
    children: <Button>Hover me</Button>,
  },
  // El tooltip flota fuera del trigger; necesita espacio en todos los lados
  // para no recortarse contra el borde del iframe. `ig-story-frame` aporta
  // padding generoso + min-height + un marco discreto.
  decorators: [
    (Story) => (
      <div className="ig-story-frame">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {
  render: (args) => (
    <Tooltip {...args}>
      <Button>Hover me</Button>
    </Tooltip>
  ),
};

export const Placements: Story = {
  decorators: [
    (Story) => (
      <div className="ig-story-frame ig-story-frame--lg">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="ig-story-row ig-story-row--gap-lg">
      <Tooltip text="Arriba" placement="top">
        <Button variant="secondary">top</Button>
      </Tooltip>
      <Tooltip text="Abajo" placement="bottom">
        <Button variant="secondary">bottom</Button>
      </Tooltip>
      <Tooltip text="Izquierda" placement="left">
        <Button variant="secondary">left</Button>
      </Tooltip>
      <Tooltip text="Derecha" placement="right">
        <Button variant="secondary">right</Button>
      </Tooltip>
    </div>
  ),
};

export const Variantes: Story = {
  render: () => (
    <div className="ig-story-row">
      <Tooltip text="Brand" variant="brand">
        <Button>brand</Button>
      </Tooltip>
      <Tooltip text="Success" variant="success">
        <Button variant="success">success</Button>
      </Tooltip>
      <Tooltip text="Danger" variant="danger">
        <Button variant="danger">danger</Button>
      </Tooltip>
    </div>
  ),
};

export const A11yInteraction: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "El child recibe `aria-describedby` apuntando al `<span role=\"tooltip\">` sr-only. Verifica enlace para SR sin necesidad de hover.",
      },
    },
  },
  render: () => (
    <Tooltip text="Eliminar elemento" placement="top">
      <Button icon aria-label="Eliminar">
        ×
      </Button>
    </Tooltip>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const btn = canvas.getByRole("button", { name: "Eliminar" });
    const describedBy = btn.getAttribute("aria-describedby");
    await expect(describedBy).toBeTruthy();
    // El span con ese id debe contener el texto del tooltip.
    const tooltipNode = canvas.getByRole("tooltip", { hidden: true });
    await expect(tooltipNode.id).toBe(describedBy);
    await expect(tooltipNode).toHaveTextContent("Eliminar elemento");
  },
};
