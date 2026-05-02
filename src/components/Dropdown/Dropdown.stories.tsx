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
