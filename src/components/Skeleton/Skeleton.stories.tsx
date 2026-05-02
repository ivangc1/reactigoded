import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "./Skeleton";

const meta = {
  title: "Componentes/Skeleton",
  component: Skeleton,
  parameters: {
    docs: {
      description: {
        component:
          "Placeholder animado mientras carga contenido. 7 formas predefinidas. Extiende dimensiones con `style`.",
      },
    },
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["text", "title", "avatar", "avatar-lg", "card", "image", "button"],
    },
  },
  args: { variant: "text" },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {};

export const Variantes: Story = {
  render: () => (
    <div className="ig-story-stack ig-story-stack--md">
      <Skeleton variant="title" />
      <Skeleton variant="text" />
      <Skeleton variant="text" style={{ width: "80%" }} />
      <Skeleton variant="text" style={{ width: "60%" }} />
      <div className="ig-story-row">
        <Skeleton variant="avatar" />
        <div style={{ flex: 1 }}>
          <Skeleton variant="text" />
          <Skeleton variant="text" style={{ width: "70%", marginTop: 6 }} />
        </div>
      </div>
      <Skeleton variant="image" style={{ height: 140 }} />
      <Skeleton variant="button" />
    </div>
  ),
};

export const Card: Story = {
  args: { variant: "card", style: { width: 280, height: 180 } },
};
