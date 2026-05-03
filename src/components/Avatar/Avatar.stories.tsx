import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Avatar } from "./Avatar";
import { AvatarGroup } from "./AvatarGroup";

// Avatar de demo embebido como data URI (SVG): silueta abstracta sobre un
// gradiente Vitreus→Axis. Sin dependencia de servicios externos como
// pravatar.cc — el catálogo se ve igual offline y no varía entre runs.
const demoAvatar =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">` +
      `<defs>` +
        `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
          `<stop offset="0%" stop-color="#3ae2f7"/>` +
          `<stop offset="100%" stop-color="#d2bff7"/>` +
        `</linearGradient>` +
      `</defs>` +
      `<rect width="120" height="120" fill="url(#g)"/>` +
      `<circle cx="60" cy="48" r="20" fill="#0c1515" opacity="0.85"/>` +
      `<path d="M22 110c4-22 22-32 38-32s34 10 38 32z" fill="#0c1515" opacity="0.85"/>` +
    `</svg>`,
  );

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
    src: demoAvatar,
    alt: "Jane Doe",
    size: "md",
  },
};

export const ConIniciales: Story = {
  args: { initials: "JD", size: "md" },
};

export const Sizes: Story = {
  args: { initials: "X" },
  render: () => (
    <div className="ig-story-row">
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
    <div className="ig-story-row">
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
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {(["xs", "sm", "md", "lg", "xl", "2xl"] as const).map((size) => (
        <div
          key={size}
          style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
        >
          <span style={{ minWidth: 60, fontFamily: "var(--ig-font-mono)" }}>
            {size}
          </span>
          <Avatar src={demoAvatar} alt="user" size={size} />
          <Avatar initials="IG" size={size} />
          <Avatar src={demoAvatar} alt="user" size={size} status="online" />
          <Avatar src={demoAvatar} alt="user" size={size} rounded />
          <Avatar initials="AB" size={size} status="busy" />
        </div>
      ))}
      <div>
        <strong>AvatarGroup</strong>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <AvatarGroup>
            <Avatar initials="A" />
            <Avatar initials="B" />
            <Avatar initials="C" />
          </AvatarGroup>
          <AvatarGroup>
            <Avatar initials="A" />
            <Avatar initials="B" />
            <Avatar initials="C" />
            <Avatar initials="D" />
            <Avatar initials="E" />
          </AvatarGroup>
        </div>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const avatars = canvasElement.querySelectorAll(".ig-avatar");
    await expect(avatars.length).toBeGreaterThan(15);
  },
};
