import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownDivider,
  DropdownHeader,
} from "./index";

const meta = {
  title: "Componentes/Dropdown",
  component: Dropdown,
  parameters: {
    docs: {
      description: {
        component:
          "Menú desplegable accesible. Compón con `DropdownTrigger`, `DropdownMenu`, `DropdownItem`, `DropdownDivider`, `DropdownHeader`. Cierra con ESC y al hacer click fuera; navegación con ↑/↓/Home/End/Enter siguiendo el patrón WAI-ARIA menu button.",
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
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {
  render: (args) => (
    <div style={{ minHeight: 240 }}>
      <Dropdown {...args}>
        <DropdownTrigger>Acciones ▼</DropdownTrigger>
        <DropdownMenu>
          <DropdownItem>Editar</DropdownItem>
          <DropdownItem>Duplicar</DropdownItem>
          <DropdownItem>Compartir</DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  ),
};

export const ConDivisorYDanger: Story = {
  render: (args) => (
    <div style={{ minHeight: 240 }}>
      <Dropdown {...args}>
        <DropdownTrigger>Más opciones ▼</DropdownTrigger>
        <DropdownMenu>
          <DropdownItem>Editar</DropdownItem>
          <DropdownItem>Duplicar</DropdownItem>
          <DropdownDivider />
          <DropdownItem danger>Eliminar</DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  ),
};

export const ConHeader: Story = {
  render: (args) => (
    <div style={{ minHeight: 280 }}>
      <Dropdown {...args}>
        <DropdownTrigger>Cuenta ▼</DropdownTrigger>
        <DropdownMenu>
          <DropdownHeader>Sesión</DropdownHeader>
          <DropdownItem href="#perfil">Perfil</DropdownItem>
          <DropdownItem href="#ajustes">Ajustes</DropdownItem>
          <DropdownDivider />
          <DropdownHeader>Workspace</DropdownHeader>
          <DropdownItem>Equipo</DropdownItem>
          <DropdownItem>Facturación</DropdownItem>
          <DropdownDivider />
          <DropdownItem danger>Cerrar sesión</DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  ),
};

export const AlineadoDerecha: Story = {
  args: { placement: "right" },
  render: (args) => (
    <div style={{ minHeight: 240, display: "flex", justifyContent: "flex-end" }}>
      <Dropdown {...args}>
        <DropdownTrigger>Opciones ▼</DropdownTrigger>
        <DropdownMenu>
          <DropdownItem>Compartir</DropdownItem>
          <DropdownItem>Exportar</DropdownItem>
          <DropdownItem>Imprimir</DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  ),
};

export const AbreHaciaArriba: Story = {
  args: { direction: "up" },
  render: (args) => (
    <div style={{ minHeight: 280, display: "flex", alignItems: "flex-end" }}>
      <Dropdown {...args}>
        <DropdownTrigger>Acciones ▲</DropdownTrigger>
        <DropdownMenu>
          <DropdownItem>Editar</DropdownItem>
          <DropdownItem>Duplicar</DropdownItem>
          <DropdownItem>Archivar</DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  ),
};

export const ItemActivo: Story = {
  render: (args) => (
    <div style={{ minHeight: 240 }}>
      <Dropdown {...args}>
        <DropdownTrigger>Ordenar ▼</DropdownTrigger>
        <DropdownMenu>
          <DropdownItem>Más reciente</DropdownItem>
          <DropdownItem active>Más antiguo</DropdownItem>
          <DropdownItem>Alfabético</DropdownItem>
        </DropdownMenu>
      </Dropdown>
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
      <Dropdown {...args}>
        <DropdownTrigger>Acciones ▼</DropdownTrigger>
        <DropdownMenu>
          <DropdownItem>Editar</DropdownItem>
          <DropdownItem>Duplicar</DropdownItem>
        </DropdownMenu>
      </Dropdown>
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
          "`DropdownItem` admite el atributo nativo `disabled` (botón) o `aria-disabled` (anchor); el keyboard nav los salta automáticamente.",
      },
    },
  },
  render: (args) => (
    <div style={{ minHeight: 240 }}>
      <Dropdown {...args}>
        <DropdownTrigger>Acciones ▼</DropdownTrigger>
        <DropdownMenu>
          <DropdownItem>Editar</DropdownItem>
          <DropdownItem disabled>Duplicar (deshabilitado)</DropdownItem>
          <DropdownItem>Compartir</DropdownItem>
          <DropdownDivider />
          <DropdownItem danger>Eliminar</DropdownItem>
        </DropdownMenu>
      </Dropdown>
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
    <Dropdown defaultOpen>
      <DropdownTrigger>Menu</DropdownTrigger>
      <DropdownMenu>
        <DropdownItem>Editar</DropdownItem>
        <DropdownItem data-testid="hover-item">Duplicar</DropdownItem>
        <DropdownItem danger data-testid="hover-danger">
          Eliminar
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
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
        <Dropdown>
          <DropdownTrigger>Cerrado ▼</DropdownTrigger>
          <DropdownMenu>
            <DropdownItem>Editar</DropdownItem>
            <DropdownItem>Compartir</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
      <div>
        <strong>Abierto con todos los slots</strong>
        <Dropdown defaultOpen>
          <DropdownTrigger>Acciones ▼</DropdownTrigger>
          <DropdownMenu>
            <DropdownHeader>Cuenta</DropdownHeader>
            <DropdownItem>Perfil</DropdownItem>
            <DropdownItem active>Ajustes (active)</DropdownItem>
            <DropdownItem disabled>Bloqueado</DropdownItem>
            <DropdownDivider />
            <DropdownItem danger>Cerrar sesión</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
      <div>
        <strong>Placement right</strong>
        <Dropdown defaultOpen placement="right">
          <DropdownTrigger>Right ▼</DropdownTrigger>
          <DropdownMenu>
            <DropdownItem>Uno</DropdownItem>
            <DropdownItem>Dos</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
      <div>
        <strong>Direction up</strong>
        <Dropdown defaultOpen direction="up">
          <DropdownTrigger>Up ▼</DropdownTrigger>
          <DropdownMenu>
            <DropdownItem>Uno</DropdownItem>
            <DropdownItem>Dos</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const dropdowns = canvasElement.querySelectorAll(".ig-dropdown");
    await expect(dropdowns.length).toBe(4);
    const opens = canvasElement.querySelectorAll(".ig-dropdown-open");
    await expect(opens.length).toBe(3);
  },
};
