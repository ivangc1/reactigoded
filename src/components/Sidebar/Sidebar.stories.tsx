import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  Sidebar,
  SidebarHeader,
  SidebarNav,
  SidebarItem,
  SidebarFooter,
  SidebarToggle,
  SidebarDivider,
  SidebarSection,
} from "./index";
import { Button } from "../Button";

const meta = {
  title: "Componentes/Sidebar",
  component: Sidebar,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Barra lateral persistente con modo colapsado tipo \"rail\". Compón con `SidebarHeader`, `SidebarNav`, `SidebarItem`, `SidebarSection`, `SidebarDivider`, `SidebarFooter`, `SidebarToggle`. En colapsada el CSS oculta texto y secciones; los iconos quedan.",
      },
    },
  },
  argTypes: {
    defaultCollapsed: { control: "boolean" },
  },
  args: {
    defaultCollapsed: false,
  },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

const Demo = () => (
  <>
    <SidebarHeader icon={<span style={{ fontSize: 22 }}>🌟</span>}>
      Mi App
    </SidebarHeader>
    <SidebarNav>
      <SidebarSection>Principal</SidebarSection>
      <SidebarItem href="#inicio" icon="🏠" active>
        Inicio
      </SidebarItem>
      <SidebarItem href="#proyectos" icon="📁">
        Proyectos
      </SidebarItem>
      <SidebarItem href="#equipo" icon="👥">
        Equipo
      </SidebarItem>
      <SidebarDivider />
      <SidebarSection>Herramientas</SidebarSection>
      <SidebarItem href="#integraciones" icon="🔌">
        Integraciones
      </SidebarItem>
      <SidebarItem href="#informes" icon="📊">
        Informes
      </SidebarItem>
      <SidebarItem href="#ajustes" icon="⚙️">
        Ajustes
      </SidebarItem>
    </SidebarNav>
    <SidebarFooter>
      <SidebarToggle />
    </SidebarFooter>
  </>
);

export const Default: Story = {
  render: (args) => (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar {...args}>
        <Demo />
      </Sidebar>
      <main style={{ flex: 1, padding: 24 }}>
        <h2>Contenido principal</h2>
        <p>La sidebar arranca expandida. Pulsa ☰ para colapsar.</p>
      </main>
    </div>
  ),
};

export const Colapsada: Story = {
  args: { defaultCollapsed: true },
  render: (args) => (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar {...args}>
        <Demo />
      </Sidebar>
      <main style={{ flex: 1, padding: 24 }}>
        <h2>Modo "rail"</h2>
        <p>Solo iconos visibles. Pulsa ☰ para expandir.</p>
      </main>
    </div>
  ),
};

export const Controlled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Modo controlado: la app gestiona `collapsed` y reacciona a `onCollapsedChange`. Permite forzar el estado desde fuera (p.ej. al cambiar de página).",
      },
    },
  },
  render: () => {
    function ControlledDemo() {
      const [collapsed, setCollapsed] = useState(false);
      return (
        <div style={{ display: "flex", height: "100vh" }}>
          <Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed}>
            <Demo />
          </Sidebar>
          <main style={{ flex: 1, padding: 24, display: "grid", gap: 12 }}>
            <h2>Sidebar controlado</h2>
            <p>
              Estado actual: <strong>{collapsed ? "colapsada" : "expandida"}</strong>
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <Button onClick={() => { setCollapsed(false); }}>Expandir</Button>
              <Button
                variant="secondary"
                onClick={() => { setCollapsed(true); }}
              >
                Colapsar
              </Button>
            </div>
          </main>
        </div>
      );
    }
    return <ControlledDemo />;
  },
};

export const ConBotones: Story = {
  render: () => (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar>
        <SidebarHeader icon={<span style={{ fontSize: 22 }}>⚡</span>}>
          Acciones
        </SidebarHeader>
        <SidebarNav>
          <SidebarItem icon="➕">Nuevo proyecto</SidebarItem>
          <SidebarItem icon="📤">Importar</SidebarItem>
          <SidebarItem icon="🔄">Sincronizar</SidebarItem>
        </SidebarNav>
        <SidebarFooter>
          <SidebarToggle />
        </SidebarFooter>
      </Sidebar>
      <main style={{ flex: 1, padding: 24 }}>
        <h2>Items como botones</h2>
        <p>Los items sin <code>href</code> renderizan un <code>&lt;button&gt;</code>.</p>
      </main>
    </div>
  ),
};

export const ToggleInteraction: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Click en `SidebarToggle` colapsa/expande el sidebar y `aria-expanded` se actualiza.",
      },
    },
  },
  render: () => (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar>
        <SidebarHeader>App</SidebarHeader>
        <SidebarNav>
          <SidebarItem href="#" icon="🏠">
            Inicio
          </SidebarItem>
        </SidebarNav>
        <SidebarFooter>
          <SidebarToggle />
        </SidebarFooter>
      </Sidebar>
      <main style={{ flex: 1, padding: 24 }}>contenido</main>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole("button", { name: /colapsar/i });
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(toggle);
    // Tras colapsar, el botón cambia su aria-label a "Expandir".
    const expandToggle = canvas.getByRole("button", { name: /expandir/i });
    await expect(expandToggle).toHaveAttribute("aria-expanded", "false");
  },
};
