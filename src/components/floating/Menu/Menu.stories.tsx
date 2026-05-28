import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  Menu,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuLabel,
} from "./index";

const meta = {
  title: "Componentes/Menu",
  component: Menu,
  parameters: {
    docs: {
      description: {
        component:
          "Menú desplegable accesible. Compón con `MenuTrigger`, `MenuContent`, `MenuItem`, `MenuSeparator`, `MenuLabel`. Cierra con ESC y al hacer click fuera; navegación con ↑/↓/Home/End/Enter siguiendo el patrón WAI-ARIA menu button. Slot pattern (D14 Bloque D beta.27): `<MenuTrigger asChild>` permite usar cualquier elemento como trigger (e.g., `<Button>` del DS) propagando aria + handlers sin wrapper.",
      },
    },
  },
  argTypes: {
    placement: { control: "select", options: ["left", "right"] },
    direction: { control: "select", options: ["down", "up"] },
    closeOnSelect: { control: "boolean" },
  },
  args: {
    placement: "left",
    direction: "down",
    closeOnSelect: true,
  },
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {
  render: (args) => (
    <div style={{ minHeight: 240 }}>
      <Menu {...args}>
        <MenuTrigger>Acciones ▼</MenuTrigger>
        <MenuContent>
          <MenuItem>Editar</MenuItem>
          <MenuItem>Duplicar</MenuItem>
          <MenuItem>Compartir</MenuItem>
        </MenuContent>
      </Menu>
    </div>
  ),
};

export const ConDivisorYDanger: Story = {
  render: (args) => (
    <div style={{ minHeight: 240 }}>
      <Menu {...args}>
        <MenuTrigger>Más opciones ▼</MenuTrigger>
        <MenuContent>
          <MenuItem>Editar</MenuItem>
          <MenuItem>Duplicar</MenuItem>
          <MenuSeparator />
          <MenuItem danger>Eliminar</MenuItem>
        </MenuContent>
      </Menu>
    </div>
  ),
};

export const ConHeader: Story = {
  render: (args) => (
    <div style={{ minHeight: 280 }}>
      <Menu {...args}>
        <MenuTrigger>Cuenta ▼</MenuTrigger>
        <MenuContent>
          <MenuLabel>Sesión</MenuLabel>
          <MenuItem href="#perfil">Perfil</MenuItem>
          <MenuItem href="#ajustes">Ajustes</MenuItem>
          <MenuSeparator />
          <MenuLabel>Workspace</MenuLabel>
          <MenuItem>Equipo</MenuItem>
          <MenuItem>Facturación</MenuItem>
          <MenuSeparator />
          <MenuItem danger>Cerrar sesión</MenuItem>
        </MenuContent>
      </Menu>
    </div>
  ),
};

export const AlineadoDerecha: Story = {
  args: { placement: "right" },
  render: (args) => (
    <div style={{ minHeight: 240, display: "flex", justifyContent: "flex-end" }}>
      <Menu {...args}>
        <MenuTrigger>Opciones ▼</MenuTrigger>
        <MenuContent>
          <MenuItem>Compartir</MenuItem>
          <MenuItem>Exportar</MenuItem>
          <MenuItem>Imprimir</MenuItem>
        </MenuContent>
      </Menu>
    </div>
  ),
};

export const AbreHaciaArriba: Story = {
  args: { direction: "up" },
  render: (args) => (
    <div style={{ minHeight: 280, display: "flex", alignItems: "flex-end" }}>
      <Menu {...args}>
        <MenuTrigger>Acciones ▲</MenuTrigger>
        <MenuContent>
          <MenuItem>Editar</MenuItem>
          <MenuItem>Duplicar</MenuItem>
          <MenuItem>Archivar</MenuItem>
        </MenuContent>
      </Menu>
    </div>
  ),
};

export const ItemActivo: Story = {
  render: (args) => (
    <div style={{ minHeight: 240 }}>
      <Menu {...args}>
        <MenuTrigger>Ordenar ▼</MenuTrigger>
        <MenuContent>
          <MenuItem>Más reciente</MenuItem>
          <MenuItem active>Más antiguo</MenuItem>
          <MenuItem>Alfabético</MenuItem>
        </MenuContent>
      </Menu>
    </div>
  ),
};

export const Interaction: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Click en el trigger abre el menú (`aria-expanded=\"true\"`); ↓ mueve foco al primer item.",
      },
    },
    a11y: {
      // D2 (RC1 gate review beta.24): Floating UI FloatingFocusManager inyecta
      // focus-guard spans con tabindex=0 + aria-hidden=true para trap inicial
      // y tab cycling. Patrón canónico FUI/Radix — axe flag-ea como
      // aria-hidden-focus pero es comportamiento intencional documentado.
      // Suppression scoped al pattern específico, no global.
      config: {
        rules: [{ id: "aria-hidden-focus", enabled: false }],
      },
    },
  },
  render: (args) => (
    <div style={{ minHeight: 240 }}>
      <Menu {...args}>
        <MenuTrigger>Acciones ▼</MenuTrigger>
        <MenuContent>
          <MenuItem>Editar</MenuItem>
          <MenuItem>Duplicar</MenuItem>
        </MenuContent>
      </Menu>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: /acciones/i });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    // Tras abrir, el menu debe estar accesible (aria-controls apunta al
    // `#menuId` que ahora tiene contenido visible).
    const menuId = trigger.getAttribute("aria-controls");
    await expect(menuId).toBeTruthy();
    const menu = document.getElementById(menuId ?? "");
    await expect(menu).not.toBeNull();
    await expect(menu?.textContent ?? "").toContain("Editar");
  },
};

export const ItemDisabled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`MenuItem` admite el atributo nativo `disabled` (botón) o `aria-disabled` (anchor); el keyboard nav los salta automáticamente.",
      },
    },
  },
  render: (args) => (
    <div style={{ minHeight: 240 }}>
      <Menu {...args}>
        <MenuTrigger>Acciones ▼</MenuTrigger>
        <MenuContent>
          <MenuItem>Editar</MenuItem>
          <MenuItem disabled>Duplicar (deshabilitado)</MenuItem>
          <MenuItem>Compartir</MenuItem>
          <MenuSeparator />
          <MenuItem danger>Eliminar</MenuItem>
        </MenuContent>
      </Menu>
    </div>
  ),
};

export const HoverItemAndDanger: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Hover programático sobre item normal e item danger para que axe evalúe contraste en hover. Estados hover sub-perceptibles eran zona ciega — fondo claro + texto poco contrastante en hover puede degradar bajo umbral WCAG sin que axe lo capture en snapshot estática. Cierra capa 2.3 del debt doc.",
      },
    },
    chromatic: {
      modes: {
        light: { theme: "light" },
        dark: { theme: "dark" },
      },
    },
    a11y: {
      // D2: ver Interaction story para razón. FUI focus guards canon.
      config: {
        rules: [{ id: "aria-hidden-focus", enabled: false }],
      },
    },
  },
  render: () => (
    <Menu defaultOpen>
      <MenuTrigger>Menu</MenuTrigger>
      <MenuContent>
        <MenuItem>Editar</MenuItem>
        <MenuItem data-testid="hover-item">Duplicar</MenuItem>
        <MenuItem danger data-testid="hover-danger">
          Eliminar
        </MenuItem>
      </MenuContent>
    </Menu>
  ),
  play: async () => {
    // D2 post-portal: MenuContent + items viven en document.body (portal),
    // NO en canvasElement. Query global via within(document.body).
    const root = within(document.body);
    const item = root.getByTestId("hover-item");
    await userEvent.hover(item);
    await new Promise((r) => setTimeout(r, 30));
    const danger = root.getByTestId("hover-danger");
    await userEvent.hover(danger);
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
    a11y: {
      // D2: ver Interaction story para razón. FUI focus guards canon.
      config: {
        rules: [{ id: "aria-hidden-focus", enabled: false }],
      },
    },
  },
  render: () => (
    <div
      style={{
        display: "grid",
        gap: "3rem",
        gridTemplateColumns: "1fr 1fr",
        minHeight: 360,
      }}
    >
      <div>
        <strong>Cerrado</strong>
        <Menu>
          <MenuTrigger>Cerrado ▼</MenuTrigger>
          <MenuContent>
            <MenuItem>Editar</MenuItem>
            <MenuItem>Compartir</MenuItem>
          </MenuContent>
        </Menu>
      </div>
      <div>
        <strong>Abierto con todos los slots</strong>
        <Menu defaultOpen>
          <MenuTrigger>Acciones ▼</MenuTrigger>
          <MenuContent>
            <MenuLabel>Cuenta</MenuLabel>
            <MenuItem>Perfil</MenuItem>
            <MenuItem active>Ajustes (active)</MenuItem>
            <MenuItem disabled>Bloqueado</MenuItem>
            <MenuSeparator />
            <MenuItem danger>Cerrar sesión</MenuItem>
          </MenuContent>
        </Menu>
      </div>
      <div>
        <strong>Placement right</strong>
        <Menu defaultOpen placement="right">
          <MenuTrigger>Right ▼</MenuTrigger>
          <MenuContent>
            <MenuItem>Uno</MenuItem>
            <MenuItem>Dos</MenuItem>
          </MenuContent>
        </Menu>
      </div>
      <div>
        <strong>Direction up</strong>
        <Menu defaultOpen direction="up">
          <MenuTrigger>Up ▼</MenuTrigger>
          <MenuContent>
            <MenuItem>Uno</MenuItem>
            <MenuItem>Dos</MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    // 4 wrappers .ig-menu siguen en canvas (containers del trigger).
    const dropdowns = canvasElement.querySelectorAll(".ig-menu");
    await expect(dropdowns.length).toBe(4);
    // D2 post-portal: MenuContent (role=menu) vive en document.body.
    // 3 de los 4 Menus son defaultOpen → 3 role=menu en portal global.
    // Pre-D2 contábamos `.ig-menu-open` en canvas; clase eliminada por D2.
    const opens = document.body.querySelectorAll('[role="menu"]');
    await expect(opens.length).toBe(3);
  },
};
