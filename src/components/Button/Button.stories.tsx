import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Button } from "./Button";
import { MatrixGrid, type Variant } from "@/stories/_matrix";

const meta = {
  title: "Componentes/Button",
  component: Button,
  parameters: {
    docs: {
      description: {
        component:
          "Botón base del design system. **API en dos ejes ortogonales**: `variant` (color semántico, 6 opciones) × `appearance` (estilo visual: `solid`/`outline`/`ghost`/`link`). 5 tamaños, estado `loading`, modo `block` (ancho completo) y modo `icon` (cuadrado).",
      },
    },
  },
  argTypes: {
    variant: {
      description:
        "Color semántico. `appearance=\"solid\"` → `.ig-btn-<variant>`; combinado con `outline`/`ghost` → `.ig-btn-<appearance>-<variant>`.",
      control: "select",
      options: ["brand", "secondary", "success", "warning", "danger", "info"],
      table: { defaultValue: { summary: "brand" } },
    },
    appearance: {
      description:
        "Apariencia visual. `solid` (fondo color), `outline` (borde + transparente), `ghost` (sin borde), `link` (aspecto de enlace).",
      control: "select",
      options: ["solid", "outline", "ghost", "link"],
      table: { defaultValue: { summary: "solid" } },
    },
    size: {
      description: "Tamaño. `md` no añade clase modificadora.",
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl"],
      table: { defaultValue: { summary: "md" } },
    },
    loading: {
      description: "Muestra spinner y bloquea click.",
      control: "boolean",
    },
    block: {
      description: "Ocupa el ancho del contenedor.",
      control: "boolean",
    },
    icon: {
      description: "Botón cuadrado solo-icono.",
      control: "boolean",
    },
    disabled: { control: "boolean" },
    onClick: { action: "click" },
  },
  args: {
    children: "Botón",
    variant: "brand",
    size: "md",
    onClick: fn(),
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {};

export const Variantes: Story = {
  args: { children: undefined },
  parameters: {
    docs: {
      description: {
        story:
          "Las 6 variantes semánticas con `appearance=\"solid\"` (default).",
      },
    },
  },
  render: () => (
    <div className="ig-flex ig-flex-wrap ig-gap-3">
      <Button variant="brand">Brand</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="success">Success</Button>
      <Button variant="warning">Warning</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="info">Info</Button>
    </div>
  ),
};

export const Sizes: Story = {
  args: { children: undefined },
  render: () => (
    <div className="ig-flex ig-flex-wrap ig-items-center ig-gap-3">
      <Button size="xs">Extra small</Button>
      <Button size="sm">Small</Button>
      <Button size="md">Medium (default)</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra large</Button>
    </div>
  ),
};

export const Estados: Story = {
  args: { children: undefined },
  render: () => (
    <div className="ig-flex ig-flex-wrap ig-gap-3">
      <Button>Normal</Button>
      <Button disabled>Disabled</Button>
      <Button loading>Loading</Button>
    </div>
  ),
};

export const BloqueCompleto: Story = {
  args: { block: true, children: "Botón a ancho completo" },
};

export const SoloIcono: Story = {
  args: { icon: true, children: "★", "aria-label": "Favorito" },
};

export const AppearanceOutline: Story = {
  args: { children: undefined },
  parameters: {
    docs: {
      description: {
        story:
          "`appearance=\"outline\"` combinado con una variant color produce `.ig-btn-outline-<variant>`: borde y texto del color, fondo transparente.",
      },
    },
  },
  render: () => (
    <div className="ig-flex ig-flex-wrap ig-gap-3">
      <Button variant="brand" appearance="outline">Brand</Button>
      <Button variant="secondary" appearance="outline">Secondary</Button>
      <Button variant="success" appearance="outline">Success</Button>
      <Button variant="warning" appearance="outline">Warning</Button>
      <Button variant="danger" appearance="outline">Danger</Button>
      <Button variant="info" appearance="outline">Info</Button>
    </div>
  ),
};

export const AppearanceGhost: Story = {
  args: { children: undefined },
  parameters: {
    docs: {
      description: {
        story:
          "`appearance=\"ghost\"` combinado con variant color produce `.ig-btn-ghost-<variant>`: sin borde, color del texto en hover.",
      },
    },
  },
  render: () => (
    <div className="ig-flex ig-flex-wrap ig-gap-3">
      <Button variant="brand" appearance="ghost">Brand</Button>
      <Button variant="secondary" appearance="ghost">Secondary</Button>
      <Button variant="success" appearance="ghost">Success</Button>
      <Button variant="warning" appearance="ghost">Warning</Button>
      <Button variant="danger" appearance="ghost">Danger</Button>
      <Button variant="info" appearance="ghost">Info</Button>
    </div>
  ),
};

export const AppearanceLink: Story = {
  args: { children: undefined },
  parameters: {
    docs: {
      description: {
        story:
          "`appearance=\"link\"` aplica `.ig-btn-link` (aspecto de enlace de texto). El `variant` se ignora porque la clase es plana.",
      },
    },
  },
  render: () => (
    <div className="ig-flex ig-flex-wrap ig-gap-3">
      <Button appearance="link">Saber más</Button>
      <Button appearance="link" disabled>
        Disabled link
      </Button>
    </div>
  ),
};

/**
 * Interaction test: cuando `loading=true`, hacer click no dispara onClick.
 *
 * El CSS aplica `pointer-events: none` al botón loading, así que userEvent
 * normalmente lanzaría error al detectar que el elemento no es clickeable.
 * Forzamos el intento con `pointerEventsCheck: 0` para verificar que aún
 * así onClick no se dispara (la lógica `disabled || loading` lo bloquea).
 */
export const LoadingBloqueaClick: Story = {
  args: { loading: true, children: "Guardando…" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const btn = canvas.getByRole("button", { name: /guardando/i });
    await expect(btn).toBeDisabled();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(btn);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

/**
 * Interaction test: en estado normal, click sí dispara `onClick`.
 */
export const ClickDispara: Story = {
  args: { children: "Pulsa" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Pulsa" }));
    await expect(args.onClick).toHaveBeenCalledOnce();
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
      <MatrixGrid
        renderRow={(v) => (
          <>
            <Button variant={v as Variant}>solid</Button>
            <Button variant={v as Variant} appearance="outline">
              outline
            </Button>
            <Button variant={v as Variant} appearance="ghost">
              ghost
            </Button>
            <Button variant={v as Variant} disabled>
              disabled
            </Button>
            <Button variant={v as Variant} loading>
              loading
            </Button>
          </>
        )}
      />
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <span style={{ minWidth: 80 }}>sizes</span>
        <Button size="xs">xs</Button>
        <Button size="sm">sm</Button>
        <Button size="md">md</Button>
        <Button size="lg">lg</Button>
        <Button size="xl">xl</Button>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <span style={{ minWidth: 80 }}>link</span>
        <Button appearance="link">link variant</Button>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const buttons = canvas.queryAllByRole("button");
    await expect(buttons.length).toBeGreaterThan(35);
  },
};
