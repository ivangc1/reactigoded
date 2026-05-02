import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Navbar,
  NavbarBrand,
  NavbarNav,
  NavbarLink,
  NavbarActions,
  NavbarMenuButton,
} from "./index";
import { Button } from "../Button";

const meta = {
  title: "Componentes/Navbar",
  component: Navbar,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "`<header class=\"ig-navbar\">` con subcomponentes: `NavbarBrand`, `NavbarNav` (`<nav aria-label>`), `NavbarLink` (con prop `active` que aplica `aria-current=\"page\"`), `NavbarActions` y `NavbarMenuButton` (botón hamburguesa visible vía CSS sólo en mobile). Variantes: `sticky`, `fixed`, `glass`.",
      },
    },
  },
  argTypes: {
    sticky: { control: "boolean" },
    fixed: { control: "boolean" },
    glass: { control: "boolean" },
  },
} satisfies Meta<typeof Navbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {
  render: (args) => (
    <Navbar {...args}>
      <NavbarBrand href="#">
        <span style={{ fontWeight: 600 }}>reactigoded</span>
      </NavbarBrand>
      <NavbarNav>
        <NavbarLink href="#" active>
          Inicio
        </NavbarLink>
        <NavbarLink href="#">Componentes</NavbarLink>
        <NavbarLink href="#">Docs</NavbarLink>
      </NavbarNav>
      <NavbarActions>
        <Button appearance="ghost">Login</Button>
        <Button variant="brand">Sign Up</Button>
      </NavbarActions>
    </Navbar>
  ),
};

export const Sticky: Story = {
  args: { sticky: true },
  render: (args) => (
    <div style={{ minHeight: "200vh" }}>
      <Navbar {...args}>
        <NavbarBrand>reactigoded</NavbarBrand>
        <NavbarNav>
          <NavbarLink href="#" active>
            Inicio
          </NavbarLink>
          <NavbarLink href="#">Productos</NavbarLink>
        </NavbarNav>
        <NavbarActions>
          <Button variant="brand">Sign Up</Button>
        </NavbarActions>
      </Navbar>
      <div style={{ padding: "2rem" }}>
        <p>Scroll para ver el navbar fijo.</p>
      </div>
    </div>
  ),
};

export const Glass: Story = {
  args: { glass: true, sticky: true },
  render: (args) => (
    <div
      // Fondo con tokens del DS (Vitreus + Axis sobre fundus). Antes usaba un
      // gradiente Tailwind genérico (#4f46e5/#ec4899/#f59e0b) que no
      // representaba la identidad igoded.
      style={{
        minHeight: "100vh",
        backgroundImage:
          "radial-gradient(circle at 18% 14%, color-mix(in srgb, var(--ig-vitreus) 35%, transparent) 0%, transparent 36rem)," +
          "radial-gradient(circle at 82% 18%, color-mix(in srgb, var(--ig-axis) 32%, transparent) 0%, transparent 38rem)," +
          "linear-gradient(180deg, var(--ig-bg-base), var(--ig-bg-sunken))",
      }}
    >
      <Navbar {...args}>
        <NavbarBrand>Brand</NavbarBrand>
        <NavbarNav>
          <NavbarLink href="#" active>
            Inicio
          </NavbarLink>
          <NavbarLink href="#">Sobre</NavbarLink>
        </NavbarNav>
        <NavbarActions>
          <Button appearance="ghost">Login</Button>
        </NavbarActions>
      </Navbar>
    </div>
  ),
};

export const ConMenuMobile: Story = {
  render: () => (
    <Navbar>
      <NavbarBrand>App</NavbarBrand>
      <NavbarNav>
        <NavbarLink href="#" active>
          Inicio
        </NavbarLink>
        <NavbarLink href="#">Pricing</NavbarLink>
      </NavbarNav>
      <NavbarActions>
        <NavbarMenuButton />
      </NavbarActions>
    </Navbar>
  ),
};
