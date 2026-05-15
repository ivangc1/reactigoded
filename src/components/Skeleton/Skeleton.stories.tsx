import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
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
          "Patrón A11y completo (B-12): un grupo de Skeleton dentro de un `SkeletonContainer` que anuncia el estado de carga UNA vez al lector de pantalla. Play test verifica el contrato ARIA completo + axe (M-02 soak).",
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
  play: async ({ canvasElement }) => {
    // M-02 (RC1 gate review): soak del breaking change ARIA introducido
    // en beta.22. Pre-beta.22: cada Skeleton emitía role=status →
    // múltiples announcements al SR. Beta.22: SkeletonContainer emite
    // UN solo announcement; los Skeleton internos son decorativos.
    const canvas = within(canvasElement);

    // (1) Exactamente UN role=status en toda la story.
    const statuses = canvas.getAllByRole("status");
    await expect(statuses).toHaveLength(1);
    const container = statuses[0];
    if (!container) throw new Error("status container no encontrado");

    // (2) Container lleva el contrato ARIA completo del live region.
    await expect(container).toHaveAttribute("aria-busy", "true");
    await expect(container).toHaveAttribute("aria-live", "polite");
    await expect(container).toHaveAttribute(
      "aria-label",
      "Cargando perfil de usuario",
    );

    // (3) Los Skeleton internos son decorativos — fuera del a11y tree.
    const skeletons = canvasElement.querySelectorAll(".ig-skeleton");
    await expect(skeletons.length).toBeGreaterThanOrEqual(4);
    for (const el of skeletons) {
      await expect(el).toHaveAttribute("role", "presentation");
      await expect(el).toHaveAttribute("aria-hidden", "true");
    }
  },
};

export const SkeletonsStandaloneNoAnuncian: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Decisión consciente (M-02 soak): un grupo de Skeleton SIN `SkeletonContainer` NO anuncia carga al SR. Es responsabilidad del consumer envolver en container para announce; de lo contrario el SR no oye nada (Skeleton es puramente decorativo).",
      },
    },
  },
  render: () => (
    <div className="ig-story-stack ig-story-stack--md">
      <Skeleton variant="title" />
      <Skeleton variant="text" />
      <Skeleton variant="text" style={{ width: "80%" }} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Sin SkeletonContainer: cero announcements al SR (regresión
    // consciente vs pre-beta.22 que anunciaba N veces).
    await expect(canvas.queryAllByRole("status")).toHaveLength(0);
    // Pero los Skeletons sí se renderizan (visualmente OK).
    const skeletons = canvasElement.querySelectorAll(".ig-skeleton");
    await expect(skeletons).toHaveLength(3);
  },
};

export const MultiplesContainersParalelos: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "M-02 soak: múltiples SkeletonContainer paralelos en la misma página (e.g., card list con loading state cada una). Cada container emite su propio role=status independiente — el SR los anuncia secuencialmente sin conflicto.",
      },
    },
  },
  render: () => (
    <div className="ig-story-stack ig-story-stack--md">
      <SkeletonContainer label="Cargando feed">
        <Skeleton variant="title" />
        <Skeleton variant="text" />
      </SkeletonContainer>
      <SkeletonContainer label="Cargando sidebar">
        <Skeleton variant="avatar" />
        <Skeleton variant="text" />
      </SkeletonContainer>
      <SkeletonContainer label="Cargando notificaciones">
        <Skeleton variant="text" />
      </SkeletonContainer>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const statuses = canvas.getAllByRole("status");
    await expect(statuses).toHaveLength(3);
    // Cada container tiene su label distintivo.
    const labels = statuses.map((s) => s.getAttribute("aria-label"));
    await expect(labels).toEqual([
      "Cargando feed",
      "Cargando sidebar",
      "Cargando notificaciones",
    ]);
    // Todos llevan el contrato aria-busy + aria-live.
    for (const s of statuses) {
      await expect(s).toHaveAttribute("aria-busy", "true");
      await expect(s).toHaveAttribute("aria-live", "polite");
    }
  },
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
