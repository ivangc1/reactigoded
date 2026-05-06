import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Skeleton, SkeletonContainer } from "./Skeleton";

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

export const ConContainer: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Patrón A11y completo (B-12): un grupo de Skeleton dentro de un `SkeletonContainer` que anuncia el estado de carga UNA vez al lector de pantalla.",
      },
    },
  },
  render: () => (
    <SkeletonContainer label="Cargando perfil de usuario">
      <div className="ig-story-stack ig-story-stack--md">
        <div className="ig-story-row">
          <Skeleton variant="avatar" />
          <div style={{ flex: 1 }}>
            <Skeleton variant="title" />
            <Skeleton variant="text" style={{ width: "60%", marginTop: 6 }} />
          </div>
        </div>
        <Skeleton variant="text" />
        <Skeleton variant="text" style={{ width: "80%" }} />
      </div>
    </SkeletonContainer>
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
    <div style={{ display: "grid", gap: "1rem", maxWidth: 400 }}>
      <Skeleton variant="title" />
      <Skeleton variant="text" />
      <Skeleton variant="text" style={{ width: "80%" }} />
      <Skeleton variant="text" style={{ width: "60%" }} />
      <Skeleton variant="avatar" />
      <Skeleton variant="avatar-lg" />
      <Skeleton variant="image" style={{ height: 120 }} />
      <Skeleton variant="card" style={{ height: 160 }} />
      <Skeleton variant="button" />
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <Skeleton variant="avatar" />
        <div style={{ flex: 1, display: "grid", gap: "0.25rem" }}>
          <Skeleton variant="text" style={{ width: "60%" }} />
          <Skeleton variant="text" style={{ width: "40%" }} />
        </div>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const skeletons = canvasElement.querySelectorAll(".ig-skeleton");
    await expect(skeletons.length).toBeGreaterThan(8);
  },
};
