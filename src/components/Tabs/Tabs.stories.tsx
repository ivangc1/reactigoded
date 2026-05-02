import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Tabs, TabList, Tab, TabPanel } from "./index";

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
      <TabList aria-label="Cuenta">
        <Tab value="perfil">Perfil</Tab>
        <Tab value="notificaciones">Notificaciones</Tab>
        <Tab value="seguridad">Seguridad</Tab>
      </TabList>
      <TabPanel value="perfil">Datos personales del usuario.</TabPanel>
      <TabPanel value="notificaciones">Email, push, in-app.</TabPanel>
      <TabPanel value="seguridad">Contraseña y 2FA.</TabPanel>
    </Tabs>
  ),
};

export const Pills: Story = {
  args: { pills: true, variant: "brand" },
  render: (args) => (
    <Tabs {...args}>
      <TabList>
        <Tab value="perfil">Perfil</Tab>
        <Tab value="notificaciones">Notificaciones</Tab>
        <Tab value="seguridad">Seguridad</Tab>
      </TabList>
      <TabPanel value="perfil">Perfil</TabPanel>
      <TabPanel value="notificaciones">Notif</TabPanel>
      <TabPanel value="seguridad">Seg</TabPanel>
    </Tabs>
  ),
};

export const Vertical: Story = {
  args: { orientation: "vertical", variant: "secondary" },
  render: (args) => (
    <Tabs {...args}>
      <TabList aria-label="Settings">
        <Tab value="perfil">Perfil</Tab>
        <Tab value="notificaciones">Notificaciones</Tab>
        <Tab value="seguridad">Seguridad</Tab>
      </TabList>
      <TabPanel value="perfil">Perfil contenido</TabPanel>
      <TabPanel value="notificaciones">Notif contenido</TabPanel>
      <TabPanel value="seguridad">Seg contenido</TabPanel>
    </Tabs>
  ),
};

export const ConDisabled: Story = {
  render: () => (
    <Tabs defaultValue="a">
      <TabList>
        <Tab value="a">Alpha</Tab>
        <Tab value="b" disabled>
          Beta (off)
        </Tab>
        <Tab value="c">Gamma</Tab>
      </TabList>
      <TabPanel value="a">A</TabPanel>
      <TabPanel value="b">B</TabPanel>
      <TabPanel value="c">C</TabPanel>
    </Tabs>
  ),
};

export const KeepMounted: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`keepMounted` mantiene el `TabPanel` en el DOM aunque no esté activo. Útil para preservar estado interno (formularios, scroll, video pausado).",
      },
    },
  },
  render: () => (
    <Tabs defaultValue="a">
      <TabList aria-label="Demo keepMounted">
        <Tab value="a">A (mounted)</Tab>
        <Tab value="b">B (mounted)</Tab>
        <Tab value="c">C (lazy)</Tab>
      </TabList>
      <TabPanel value="a" keepMounted>
        <input
          type="text"
          placeholder="Escribe algo y cambia de tab"
          style={{ padding: 6 }}
        />
        <p style={{ marginTop: 8 }}>
          Este panel persiste con <code>keepMounted</code>: el valor del input
          sobrevive al cambio de tab.
        </p>
      </TabPanel>
      <TabPanel value="b" keepMounted>
        <input
          type="text"
          placeholder="Idéntico"
          style={{ padding: 6 }}
        />
      </TabPanel>
      <TabPanel value="c">
        <p>Este panel es lazy: se monta solo al activarse.</p>
      </TabPanel>
    </Tabs>
  ),
};

export const KeyboardNavInteraction: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Click cambia tab y `aria-selected` se mueve. Flecha derecha activa el siguiente tab.",
      },
    },
  },
  render: () => (
    <Tabs defaultValue="a">
      <TabList aria-label="Demo nav">
        <Tab value="a">A</Tab>
        <Tab value="b">B</Tab>
        <Tab value="c">C</Tab>
      </TabList>
      <TabPanel value="a">Panel A</TabPanel>
      <TabPanel value="b">Panel B</TabPanel>
      <TabPanel value="c">Panel C</TabPanel>
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
