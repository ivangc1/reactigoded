import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar } from "./Avatar";
import { AvatarGroup } from "./AvatarGroup";

const meta = {
  title: "Componentes/Avatar",
  component: Avatar,
  parameters: {
    docs: {
      description: {
        component:
          "Imagen de usuario o iniciales. 6 tamaños (`xs`–`2xl`), modo `rounded` y punto de estado opcional.",
      },
    },
  },
  argTypes: {
    size: { control: "select", options: ["xs", "sm", "md", "lg", "xl", "2xl"] },
    status: {
      control: "select",
      options: [undefined, "online", "offline", "busy", "away"],
    },
    rounded: { control: "boolean" },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ConImagen: Story = {
  args: {
    src: "https://i.pravatar.cc/120?img=68",
    alt: "Jane Doe",
    size: "md",
  },
};

export const ConIniciales: Story = {
  args: { initials: "JD", size: "md" },
};

export const Tamaños: Story = {
  args: { initials: "X" },
  render: () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <Avatar size="xs" initials="XS" />
      <Avatar size="sm" initials="SM" />
      <Avatar size="md" initials="MD" />
      <Avatar size="lg" initials="LG" />
      <Avatar size="xl" initials="XL" />
      <Avatar size="2xl" initials="2X" />
    </div>
  ),
};

export const ConEstado: Story = {
  args: { initials: "X" },
  render: () => (
    <div style={{ display: "flex", gap: 12 }}>
      <Avatar initials="ON" status="online" size="lg" />
      <Avatar initials="BS" status="busy" size="lg" />
      <Avatar initials="AW" status="away" size="lg" />
      <Avatar initials="OF" status="offline" size="lg" />
    </div>
  ),
};

export const Redondeado: Story = {
  args: { initials: "JD", rounded: true, size: "lg" },
};

export const Grupo: Story = {
  args: { initials: "X" },
  render: () => (
    <AvatarGroup>
      <Avatar initials="JD" />
      <Avatar initials="AB" />
      <Avatar initials="CD" />
      <Avatar initials="+5" />
    </AvatarGroup>
  ),
};
