import type { Meta, StoryObj } from "@storybook/react-vite";
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
    ariaLabel: { control: "text" },
  },
  args: { separator: "/", ariaLabel: "Migas de pan" },
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
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
