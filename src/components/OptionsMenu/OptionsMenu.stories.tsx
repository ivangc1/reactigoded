import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  OptionsMenu,
  OptionsMenuTrigger,
  OptionsMenuContent,
  OptionsMenuItem,
  OptionsMenuDivider,
  OptionsMenuHeader,
} from "./index";

const meta = {
  title: "Componentes/OptionsMenu",
  component: OptionsMenu,
  parameters: {
    docs: {
      description: {
        component:
          "Menú desplegable accesible. Compón con `OptionsMenuTrigger`, `OptionsMenuContent`, `OptionsMenuItem`, `OptionsMenuDivider`, `OptionsMenuHeader`. Cierra con ESC y al hacer click fuera; navegación con ↑/↓/Home/End/Enter siguiendo el patrón WAI-ARIA menu button.",
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
} satisfies Meta<typeof OptionsMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {
  render: (args) => (
    <div style={{ minHeight: 240 }}>
      <OptionsMenu {...args}>
        <OptionsMenuTrigger>Acciones ▼</OptionsMenuTrigger>
        <OptionsMenuContent>
          <OptionsMenuItem>Editar</OptionsMenuItem>
          <OptionsMenuItem>Duplicar</OptionsMenuItem>
          <OptionsMenuItem>Compartir</OptionsMenuItem>
        </OptionsMenuContent>
      </OptionsMenu>
    </div>
  ),
};

export const ConDivisorYDanger: Story = {
  render: (args) => (
    <div style={{ minHeight: 240 }}>
      <OptionsMenu {...args}>
        <OptionsMenuTrigger>Más opciones ▼</OptionsMenuTrigger>
        <OptionsMenuContent>
          <OptionsMenuItem>Editar</OptionsMenuItem>
          <OptionsMenuItem>Duplicar</OptionsMenuItem>
          <OptionsMenuDivider />
          <OptionsMenuItem danger>Eliminar</OptionsMenuItem>
        </OptionsMenuContent>
      </OptionsMenu>
    </div>
  ),
};

export const ConHeader: Story = {
  render: (args) => (
    <div style={{ minHeight: 280 }}>
      <OptionsMenu {...args}>
        <OptionsMenuTrigger>Cuenta ▼</OptionsMenuTrigger>
        <OptionsMenuContent>
          <OptionsMenuHeader>Sesión</OptionsMenuHeader>
          <OptionsMenuItem href="#perfil">Perfil</OptionsMenuItem>
          <OptionsMenuItem href="#ajustes">Ajustes</OptionsMenuItem>
          <OptionsMenuDivider />
          <OptionsMenuHeader>Workspace</OptionsMenuHeader>
          <OptionsMenuItem>Equipo</OptionsMenuItem>
          <OptionsMenuItem>Facturación</OptionsMenuItem>
          <OptionsMenuDivider />
          <OptionsMenuItem danger>Cerrar sesión</OptionsMenuItem>
        </OptionsMenuContent>
      </OptionsMenu>
    </div>
  ),
};

export const AlineadoDerecha: Story = {
  args: { placement: "right" },
  render: (args) => (
    <div style={{ minHeight: 240, display: "flex", justifyContent: "flex-end" }}>
      <OptionsMenu {...args}>
        <OptionsMenuTrigger>Opciones ▼</OptionsMenuTrigger>
        <OptionsMenuContent>
          <OptionsMenuItem>Compartir</OptionsMenuItem>
          <OptionsMenuItem>Exportar</OptionsMenuItem>
          <OptionsMenuItem>Imprimir</OptionsMenuItem>
        </OptionsMenuContent>
      </OptionsMenu>
    </div>
  ),
};

export const AbreHaciaArriba: Story = {
  args: { direction: "up" },
  render: (args) => (
    <div style={{ minHeight: 280, display: "flex", alignItems: "flex-end" }}>
      <OptionsMenu {...args}>
        <OptionsMenuTrigger>Acciones ▲</OptionsMenuTrigger>
        <OptionsMenuContent>
          <OptionsMenuItem>Editar</OptionsMenuItem>
          <OptionsMenuItem>Duplicar</OptionsMenuItem>
          <OptionsMenuItem>Archivar</OptionsMenuItem>
        </OptionsMenuContent>
      </OptionsMenu>
    </div>
  ),
};

export const ItemActivo: Story = {
  render: (args) => (
    <div style={{ minHeight: 240 }}>
      <OptionsMenu {...args}>
        <OptionsMenuTrigger>Ordenar ▼</OptionsMenuTrigger>
        <OptionsMenuContent>
          <OptionsMenuItem>Más reciente</OptionsMenuItem>
          <OptionsMenuItem active>Más antiguo</OptionsMenuItem>
          <OptionsMenuItem>Alfabético</OptionsMenuItem>
        </OptionsMenuContent>
      </OptionsMenu>
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
  },
  render: (args) => (
    <div style={{ minHeight: 240 }}>
      <OptionsMenu {...args}>
        <OptionsMenuTrigger>Acciones ▼</OptionsMenuTrigger>
        <OptionsMenuContent>
          <OptionsMenuItem>Editar</OptionsMenuItem>
          <OptionsMenuItem>Duplicar</OptionsMenuItem>
        </OptionsMenuContent>
      </OptionsMenu>
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
          "`OptionsMenuItem` admite el atributo nativo `disabled` (botón) o `aria-disabled` (anchor); el keyboard nav los salta automáticamente.",
      },
    },
  },
  render: (args) => (
    <div style={{ minHeight: 240 }}>
      <OptionsMenu {...args}>
        <OptionsMenuTrigger>Acciones ▼</OptionsMenuTrigger>
        <OptionsMenuContent>
          <OptionsMenuItem>Editar</OptionsMenuItem>
          <OptionsMenuItem disabled>Duplicar (deshabilitado)</OptionsMenuItem>
          <OptionsMenuItem>Compartir</OptionsMenuItem>
          <OptionsMenuDivider />
          <OptionsMenuItem danger>Eliminar</OptionsMenuItem>
        </OptionsMenuContent>
      </OptionsMenu>
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
  },
  render: () => (
    <OptionsMenu defaultOpen>
      <OptionsMenuTrigger>Menu</OptionsMenuTrigger>
      <OptionsMenuContent>
        <OptionsMenuItem>Editar</OptionsMenuItem>
        <OptionsMenuItem data-testid="hover-item">Duplicar</OptionsMenuItem>
        <OptionsMenuItem danger data-testid="hover-danger">
          Eliminar
        </OptionsMenuItem>
      </OptionsMenuContent>
    </OptionsMenu>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // hover en item normal
    const item = canvas.getByTestId("hover-item");
    await userEvent.hover(item);
    await new Promise((r) => setTimeout(r, 30));
    // hover en item danger
    const danger = canvas.getByTestId("hover-danger");
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
        <OptionsMenu>
          <OptionsMenuTrigger>Cerrado ▼</OptionsMenuTrigger>
          <OptionsMenuContent>
            <OptionsMenuItem>Editar</OptionsMenuItem>
            <OptionsMenuItem>Compartir</OptionsMenuItem>
          </OptionsMenuContent>
        </OptionsMenu>
      </div>
      <div>
        <strong>Abierto con todos los slots</strong>
        <OptionsMenu defaultOpen>
          <OptionsMenuTrigger>Acciones ▼</OptionsMenuTrigger>
          <OptionsMenuContent>
            <OptionsMenuHeader>Cuenta</OptionsMenuHeader>
            <OptionsMenuItem>Perfil</OptionsMenuItem>
            <OptionsMenuItem active>Ajustes (active)</OptionsMenuItem>
            <OptionsMenuItem disabled>Bloqueado</OptionsMenuItem>
            <OptionsMenuDivider />
            <OptionsMenuItem danger>Cerrar sesión</OptionsMenuItem>
          </OptionsMenuContent>
        </OptionsMenu>
      </div>
      <div>
        <strong>Placement right</strong>
        <OptionsMenu defaultOpen placement="right">
          <OptionsMenuTrigger>Right ▼</OptionsMenuTrigger>
          <OptionsMenuContent>
            <OptionsMenuItem>Uno</OptionsMenuItem>
            <OptionsMenuItem>Dos</OptionsMenuItem>
          </OptionsMenuContent>
        </OptionsMenu>
      </div>
      <div>
        <strong>Direction up</strong>
        <OptionsMenu defaultOpen direction="up">
          <OptionsMenuTrigger>Up ▼</OptionsMenuTrigger>
          <OptionsMenuContent>
            <OptionsMenuItem>Uno</OptionsMenuItem>
            <OptionsMenuItem>Dos</OptionsMenuItem>
          </OptionsMenuContent>
        </OptionsMenu>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const dropdowns = canvasElement.querySelectorAll(".ig-options-menu");
    await expect(dropdowns.length).toBe(4);
    const opens = canvasElement.querySelectorAll(".ig-options-menu-open");
    await expect(opens.length).toBe(3);
  },
};
