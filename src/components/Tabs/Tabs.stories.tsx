import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./index";

const meta = {
  title: "Componentes/Tabs",
  component: Tabs,
  parameters: {
    docs: {
      description: {
        component:
          "Tabs accesibles con `role=\"tablist\"`/`role=\"tab\"`/`role=\"tabpanel\"`, `aria-selected`, roving tabindex y keyboard nav (←→/↑↓ + Home/End). Soporta controlled, uncontrolled, variants, pills y orientación vertical.",
      },
    },
  },
  argTypes: {
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
    pills: { control: "boolean" },
    orientation: { control: "select", options: ["horizontal", "vertical"] },
  },
  args: { defaultValue: "perfil" },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {
  render: (args) => (
    <Tabs {...args}>
      <TabsList aria-label="Cuenta">
        <TabsTrigger value="perfil">Perfil</TabsTrigger>
        <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
        <TabsTrigger value="seguridad">Seguridad</TabsTrigger>
      </TabsList>
      <TabsContent value="perfil">Datos personales del usuario.</TabsContent>
      <TabsContent value="notificaciones">Email, push, in-app.</TabsContent>
      <TabsContent value="seguridad">Contraseña y 2FA.</TabsContent>
    </Tabs>
  ),
};

export const Pills: Story = {
  args: { pills: true, variant: "brand" },
  render: (args) => (
    <Tabs {...args}>
      <TabsList>
        <TabsTrigger value="perfil">Perfil</TabsTrigger>
        <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
        <TabsTrigger value="seguridad">Seguridad</TabsTrigger>
      </TabsList>
      <TabsContent value="perfil">Perfil</TabsContent>
      <TabsContent value="notificaciones">Notif</TabsContent>
      <TabsContent value="seguridad">Seg</TabsContent>
    </Tabs>
  ),
};

export const Vertical: Story = {
  args: { orientation: "vertical", variant: "secondary" },
  render: (args) => (
    <Tabs {...args}>
      <TabsList aria-label="Settings">
        <TabsTrigger value="perfil">Perfil</TabsTrigger>
        <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
        <TabsTrigger value="seguridad">Seguridad</TabsTrigger>
      </TabsList>
      <TabsContent value="perfil">Perfil contenido</TabsContent>
      <TabsContent value="notificaciones">Notif contenido</TabsContent>
      <TabsContent value="seguridad">Seg contenido</TabsContent>
    </Tabs>
  ),
};

export const ConDisabled: Story = {
  render: () => (
    <Tabs defaultValue="a">
      <TabsList>
        <TabsTrigger value="a">Alpha</TabsTrigger>
        <TabsTrigger value="b" disabled>
          Beta (off)
        </TabsTrigger>
        <TabsTrigger value="c">Gamma</TabsTrigger>
      </TabsList>
      <TabsContent value="a">A</TabsContent>
      <TabsContent value="b">B</TabsContent>
      <TabsContent value="c">C</TabsContent>
    </Tabs>
  ),
};

export const KeepMounted: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`keepMounted` mantiene el `TabsContent` en el DOM aunque no esté activo. Útil para preservar estado interno (formularios, scroll, video pausado).",
      },
    },
  },
  render: () => (
    <Tabs defaultValue="a">
      <TabsList aria-label="Demo keepMounted">
        <TabsTrigger value="a">A (mounted)</TabsTrigger>
        <TabsTrigger value="b">B (mounted)</TabsTrigger>
        <TabsTrigger value="c">C (lazy)</TabsTrigger>
      </TabsList>
      <TabsContent value="a" keepMounted>
        <input
          type="text"
          placeholder="Escribe algo y cambia de tab"
          style={{ padding: 6 }}
        />
        <p style={{ marginTop: 8 }}>
          Este panel persiste con <code>keepMounted</code>: el valor del input
          sobrevive al cambio de tab.
        </p>
      </TabsContent>
      <TabsContent value="b" keepMounted>
        <input
          type="text"
          placeholder="Idéntico"
          style={{ padding: 6 }}
        />
      </TabsContent>
      <TabsContent value="c">
        <p>Este panel es lazy: se monta solo al activarse.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const KeyboardNavInteraction: Story = {
  args: { defaultValue: "a" },
  parameters: {
    docs: {
      description: {
        story:
          "Click cambia tab y `aria-selected` se mueve. Flecha derecha activa el siguiente tab.",
      },
    },
  },
  render: (args) => (
    <Tabs {...args}>
      <TabsList aria-label="Demo nav">
        <TabsTrigger value="a">A</TabsTrigger>
        <TabsTrigger value="b">B</TabsTrigger>
        <TabsTrigger value="c">C</TabsTrigger>
      </TabsList>
      <TabsContent value="a">Panel A</TabsContent>
      <TabsContent value="b">Panel B</TabsContent>
      <TabsContent value="c">Panel C</TabsContent>
    </Tabs>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tabA = canvas.getByRole("tab", { name: "A" });
    const tabB = canvas.getByRole("tab", { name: "B" });
    await expect(tabA).toHaveAttribute("aria-selected", "true");

    // Click cambia.
    await userEvent.click(tabB);
    await expect(tabB).toHaveAttribute("aria-selected", "true");
    await expect(canvas.getByText("Panel B")).toBeInTheDocument();

    // Flecha derecha desde B activa C.
    tabB.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(
      canvas.getByRole("tab", { name: "C" }),
    ).toHaveAttribute("aria-selected", "true");
  },
};

export const FocusVisibleActiveTab: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Foco programático sobre la tab activa para que axe evalúe el ring de focus contra el fondo de la tab seleccionada (que en algunas variantes es brand-filled). Cierra capa 2.2 del debt doc.",
      },
    },
    chromatic: {
      modes: {
        light: { theme: "light" },
        dark: { theme: "dark" },
      },
    },
  },
  render: () => (
    <Tabs defaultValue="b">
      <TabsList>
        <TabsTrigger value="a">A</TabsTrigger>
        <TabsTrigger value="b">B activa</TabsTrigger>
        <TabsTrigger value="c">C</TabsTrigger>
      </TabsList>
      <TabsContent value="a">A</TabsContent>
      <TabsContent value="b">B</TabsContent>
      <TabsContent value="c">C</TabsContent>
    </Tabs>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const activeTab = canvas.getByRole("tab", { name: "B activa" });
    activeTab.focus();
    await new Promise((r) => setTimeout(r, 50));
  },
};

export const HoverInactiveTab: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Hover programático sobre tab inactiva para que axe evalúe el contraste hover. Estados hover/active sub-perceptibles eran zona ciega de los gates pre-RC1 — `:hover` no se dispara en una snapshot estática. Cierra capa 2.3 del debt doc.",
      },
    },
    chromatic: {
      modes: {
        light: { theme: "light" },
        dark: { theme: "dark" },
      },
    },
  },
  render: () => (
    <Tabs defaultValue="a">
      <TabsList>
        <TabsTrigger value="a">A activa</TabsTrigger>
        <TabsTrigger value="b">B hover</TabsTrigger>
        <TabsTrigger value="c">C</TabsTrigger>
      </TabsList>
      <TabsContent value="a">A</TabsContent>
      <TabsContent value="b">B</TabsContent>
      <TabsContent value="c">C</TabsContent>
    </Tabs>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const inactiveTab = canvas.getByRole("tab", { name: "B hover" });
    await userEvent.hover(inactiveTab);
    await new Promise((r) => setTimeout(r, 50));
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
    <div style={{ display: "grid", gap: "2rem" }}>
      <div>
        <strong>default</strong>
        <Tabs defaultValue="b">
          <TabsList aria-label="default">
            <TabsTrigger value="a">A</TabsTrigger>
            <TabsTrigger value="b">B</TabsTrigger>
            <TabsTrigger value="c" disabled>
              C disabled
            </TabsTrigger>
          </TabsList>
          <TabsContent value="b">Panel B</TabsContent>
        </Tabs>
      </div>
      <div>
        <strong>pills</strong>
        <Tabs defaultValue="a" pills>
          <TabsList aria-label="pills">
            <TabsTrigger value="a">A</TabsTrigger>
            <TabsTrigger value="b">B</TabsTrigger>
            <TabsTrigger value="c">C</TabsTrigger>
          </TabsList>
          <TabsContent value="a">Panel A</TabsContent>
        </Tabs>
      </div>
      <div>
        <strong>vertical</strong>
        <Tabs defaultValue="a" orientation="vertical">
          <TabsList aria-label="vertical">
            <TabsTrigger value="a">A</TabsTrigger>
            <TabsTrigger value="b">B</TabsTrigger>
          </TabsList>
          <TabsContent value="a">Panel A</TabsContent>
        </Tabs>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tablists = canvas.queryAllByRole("tablist");
    await expect(tablists.length).toBe(3);
  },
};
