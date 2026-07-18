import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import {
  Navbar,
  NavbarLogo,
  NavbarNav,
  NavbarLink,
  NavbarActions,
  NavbarMenuButton,
} from "./index";
import { Button } from "@/components/Button";

const meta = {
  title: "Componentes/Navbar",
  component: Navbar,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "`<header class=\"ig-navbar\">` con subcomponentes: `NavbarLogo`, `NavbarNav` (`<nav aria-label>`), `NavbarLink` (con prop `active` que aplica `aria-current=\"page\"`), `NavbarActions` y `NavbarMenuButton` (botón hamburguesa visible vía CSS sólo en mobile). Variantes: `position=\"sticky\"`/`\"fixed\"`, `glass`.",
      },
    },
  },
  argTypes: {
    position: {
      control: { type: "inline-radio" },
      options: [undefined, "sticky", "fixed"],
    },
    glass: { control: "boolean" },
  },
} satisfies Meta<typeof Navbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {
  render: (args) => (
    <Navbar {...args}>
      <NavbarLogo href="#">
        <span style={{ fontWeight: 600 }}>reactigoded</span>
      </NavbarLogo>
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
  args: { position: "sticky" },
  render: (args) => (
    <div style={{ minHeight: "200vh" }}>
      <Navbar {...args}>
        <NavbarLogo>reactigoded</NavbarLogo>
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
  args: { glass: true, position: "sticky" },
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
        <NavbarLogo>Brand</NavbarLogo>
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
      <NavbarLogo>App</NavbarLogo>
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
  // Cada <Navbar> es <header> = landmark `banner`. Axe regla
  // landmark-no-duplicate-banner solo permite UN banner top-level por
  // documento. Para mostrar varios en el grid AllStates envolvemos
  // todos los Navbar en <section aria-label="..."> que los despromueve
  // a region landmark — patrón estándar para galerías de landmarks.
  render: () => (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <section aria-label="Demo Navbar default">
        <Navbar aria-label="Navbar default">
          <NavbarLogo href="#">
            <span style={{ fontWeight: 600 }}>Default</span>
          </NavbarLogo>
          <NavbarNav aria-label="Navegación default">
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
      </section>
      <section aria-label="Demo Navbar sticky">
        <Navbar aria-label="Navbar sticky" position="sticky">
          <NavbarLogo href="#">
            <span style={{ fontWeight: 600 }}>Sticky</span>
          </NavbarLogo>
          <NavbarNav aria-label="Navegación sticky">
            <NavbarLink href="#" active>
              Inicio
            </NavbarLink>
            <NavbarLink href="#">Pricing</NavbarLink>
          </NavbarNav>
        </Navbar>
      </section>
      <section aria-label="Demo Navbar glass">
        <Navbar aria-label="Navbar glass + sticky" glass position="sticky">
          <NavbarLogo>
            <span style={{ fontWeight: 600 }}>Glass</span>
          </NavbarLogo>
          <NavbarNav aria-label="Navegación glass">
            <NavbarLink href="#">Solo brand</NavbarLink>
          </NavbarNav>
        </Navbar>
      </section>
      <section aria-label="Demo Navbar mobile">
        <Navbar aria-label="Navbar mobile menu">
          <NavbarLogo>App</NavbarLogo>
          <NavbarNav aria-label="Navegación mobile">
            <NavbarLink href="#" active>
              Inicio
            </NavbarLink>
            <NavbarLink href="#">Pricing</NavbarLink>
          </NavbarNav>
          <NavbarActions>
            <NavbarMenuButton controlsId="navbar-mobile-menu" />
          </NavbarActions>
        </Navbar>
      </section>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const navbars = canvasElement.querySelectorAll(".ig-navbar");
    await expect(navbars.length).toBe(4);
  },
};
