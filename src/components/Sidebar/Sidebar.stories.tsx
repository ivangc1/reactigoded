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

// Iconos SVG inline (16×16, currentColor) — sin emojis para que el catálogo se
// vea igual en cualquier SO/navegador.
const Icon = ({
  d,
  size = 18,
}: {
  d: string;
  size?: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d={d} />
  </svg>
);

const I = {
  star: <Icon d="M12 3l2.7 6 6.3.6-4.8 4.3 1.5 6.1L12 17l-5.7 3 1.5-6.1L3 9.6 9.3 9z" />,
  home: <Icon d="M3 11l9-8 9 8M5 9.5V21h14V9.5" />,
  folder: <Icon d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />,
  users: <Icon d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
  plug: <Icon d="M9 7V3M15 7V3M5 11h14v3a7 7 0 0 1-14 0v-3zM12 21v-3" />,
  chart: <Icon d="M3 21h18M6 17V9M12 17V5M18 17v-6" />,
  settings: <Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />,
  bolt: <Icon d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
  plus: <Icon d="M12 5v14M5 12h14" />,
  upload: <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />,
  refresh: <Icon d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />,
};

const Demo = ({ navLabel }: { navLabel?: string } = {}) => (
  <>
    <SidebarHeader icon={I.star}>Mi App</SidebarHeader>
    <SidebarNav aria-label={navLabel ?? "Principal"}>
      <SidebarSection>Principal</SidebarSection>
      <SidebarItem href="#inicio" icon={I.home} active>
        Inicio
      </SidebarItem>
      <SidebarItem href="#proyectos" icon={I.folder}>
        Proyectos
      </SidebarItem>
      <SidebarItem href="#equipo" icon={I.users}>
        Equipo
      </SidebarItem>
      <SidebarDivider />
      <SidebarSection>Herramientas</SidebarSection>
      <SidebarItem href="#integraciones" icon={I.plug}>
        Integraciones
      </SidebarItem>
      <SidebarItem href="#informes" icon={I.chart}>
        Informes
      </SidebarItem>
      <SidebarItem href="#ajustes" icon={I.settings}>
        Ajustes
      </SidebarItem>
    </SidebarNav>
    <SidebarFooter>
      <SidebarToggle />
    </SidebarFooter>
  </>
);

export const PorDefecto: Story = {
  render: (args) => (
    <div className="ig-story-shell">
      <Sidebar {...args}>
        <Demo />
      </Sidebar>
      <main className="ig-story-shell__main">
        <h2>Contenido principal</h2>
        <p>La sidebar arranca expandida. Pulsa ☰ para colapsar.</p>
      </main>
    </div>
  ),
};

export const Colapsada: Story = {
  args: { defaultCollapsed: true },
  render: (args) => (
    <div className="ig-story-shell">
      <Sidebar {...args}>
        <Demo />
      </Sidebar>
      <main className="ig-story-shell__main">
        <h2>Modo "rail"</h2>
        <p>Solo iconos visibles. Pulsa ☰ para expandir.</p>
      </main>
    </div>
  ),
};

export const Controlado: Story = {
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
        <div className="ig-story-shell">
          <Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed}>
            <Demo />
          </Sidebar>
          <main className="ig-story-shell__main">
            <h2>Sidebar controlado</h2>
            <p>
              Estado actual: <strong>{collapsed ? "colapsada" : "expandida"}</strong>
            </p>
            <div className="ig-story-row ig-story-row--gap-sm">
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
    <div className="ig-story-shell">
      <Sidebar>
        <SidebarHeader icon={I.bolt}>Acciones</SidebarHeader>
        <SidebarNav>
          <SidebarItem icon={I.plus}>Nuevo proyecto</SidebarItem>
          <SidebarItem icon={I.upload}>Importar</SidebarItem>
          <SidebarItem icon={I.refresh}>Sincronizar</SidebarItem>
        </SidebarNav>
        <SidebarFooter>
          <SidebarToggle />
        </SidebarFooter>
      </Sidebar>
      <main className="ig-story-shell__main">
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
  render: (args) => (
    <div className="ig-story-shell">
      <Sidebar {...args}>
        <SidebarHeader>App</SidebarHeader>
        <SidebarNav>
          <SidebarItem href="#" icon={I.home}>
            Inicio
          </SidebarItem>
        </SidebarNav>
        <SidebarFooter>
          <SidebarToggle />
        </SidebarFooter>
      </Sidebar>
      <main className="ig-story-shell__main">Contenido</main>
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

export const AllStates: Story = {
  parameters: {
    layout: "fullscreen",
    docs: { disable: true },
    chromatic: {
      modes: {
        light: { theme: "light" },
        dark: { theme: "dark" },
      },
    },
  },
  render: () => (
    // aria-label único por cada landmark (axe rule landmark-unique):
    // por cada Sidebar (`<aside>`) Y por cada SidebarNav (`<nav>`).
    <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
      <div className="ig-story-shell">
        <Sidebar ariaLabel="Sidebar expandida">
          <Demo navLabel="Navegación expandida" />
        </Sidebar>
      </div>
      <div className="ig-story-shell">
        <Sidebar ariaLabel="Sidebar colapsada" defaultCollapsed>
          <Demo navLabel="Navegación colapsada" />
        </Sidebar>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const sidebars = canvasElement.querySelectorAll(".ig-sidebar");
    await expect(sidebars.length).toBe(2);
    const collapsed = canvasElement.querySelectorAll(".ig-sidebar-collapsed");
    await expect(collapsed.length).toBe(1);
  },
};
