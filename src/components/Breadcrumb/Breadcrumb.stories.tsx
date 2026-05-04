import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Breadcrumb } from "./Breadcrumb";
import { BreadcrumbItem } from "./BreadcrumbItem";

const meta = {
  title: "Componentes/Breadcrumb",
  component: Breadcrumb,
  parameters: {
    docs: {
      description: {
        component:
          "`<nav>` con jerarquía de navegación. Pasa `BreadcrumbItem`s como children; el separador se intercala solo. El último item suele llevar `current` (renderiza `<span aria-current=\"page\">`).",
      },
    },
  },
  argTypes: {
    separator: { control: "text" },
    "aria-label": { control: "text" },
  },
  args: { separator: "/", "aria-label": "Migas de pan" },
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {
  render: (args) => (
    <Breadcrumb {...args}>
      <BreadcrumbItem href="/">Inicio</BreadcrumbItem>
      <BreadcrumbItem href="/cat">Categoría</BreadcrumbItem>
      <BreadcrumbItem current>Página actual</BreadcrumbItem>
    </Breadcrumb>
  ),
};

export const SeparatorIcono: Story = {
  args: { separator: "›" },
  render: (args) => (
    <Breadcrumb {...args}>
      <BreadcrumbItem href="/">Inicio</BreadcrumbItem>
      <BreadcrumbItem href="/blog">Blog</BreadcrumbItem>
      <BreadcrumbItem href="/blog/2026">2026</BreadcrumbItem>
      <BreadcrumbItem current>Mi artículo</BreadcrumbItem>
    </Breadcrumb>
  ),
};

export const Corto: Story = {
  render: () => (
    <Breadcrumb>
      <BreadcrumbItem href="/">Inicio</BreadcrumbItem>
      <BreadcrumbItem current>Página</BreadcrumbItem>
    </Breadcrumb>
  ),
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
    // aria-label distinto por instancia para cumplir axe `landmark-unique`:
    // varios <nav> con el mismo aria-label (default "Migas de pan") los
    // marcaría como ambiguos para SR.
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <Breadcrumb aria-label="Migas: ruta corta">
        <BreadcrumbItem href="/">Home</BreadcrumbItem>
        <BreadcrumbItem current>Actual</BreadcrumbItem>
      </Breadcrumb>
      <Breadcrumb aria-label="Migas: ruta media">
        <BreadcrumbItem href="/">Home</BreadcrumbItem>
        <BreadcrumbItem href="/cat">Categoría</BreadcrumbItem>
        <BreadcrumbItem href="/cat/sub">Subcategoría</BreadcrumbItem>
        <BreadcrumbItem current>Producto</BreadcrumbItem>
      </Breadcrumb>
      <Breadcrumb aria-label="Migas: ruta larga" separator="›">
        <BreadcrumbItem href="/">Home</BreadcrumbItem>
        <BreadcrumbItem href="/a">A</BreadcrumbItem>
        <BreadcrumbItem href="/a/b">B</BreadcrumbItem>
        <BreadcrumbItem href="/a/b/c">C</BreadcrumbItem>
        <BreadcrumbItem href="/a/b/c/d">D</BreadcrumbItem>
        <BreadcrumbItem current>Final</BreadcrumbItem>
      </Breadcrumb>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const navs = canvas.queryAllByRole("navigation");
    await expect(navs.length).toBe(3);
  },
};
