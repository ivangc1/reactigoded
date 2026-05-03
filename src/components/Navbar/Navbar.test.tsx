import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Navbar,
  NavbarBrand,
  NavbarNav,
  NavbarLink,
  NavbarActions,
  NavbarMenuButton,
} from "./index";

describe("Navbar", () => {
  it("renderiza un <header> con la clase ig-navbar", () => {
    render(<Navbar data-testid="nb">x</Navbar>);
    const el = screen.getByTestId("nb");
    expect(el.tagName).toBe("HEADER");
    expect(el).toHaveClass("ig-navbar");
  });

  describe.each([
    ["sticky", "ig-navbar-sticky"],
    ["fixed", "ig-navbar-fixed"],
    ["glass", "ig-navbar-glass"],
  ] as const)("modifier %s", (prop, klass) => {
    it(`aplica clase ${klass}`, () => {
      const props = { [prop]: true } as Record<string, boolean>;
      render(<Navbar data-testid="nb" {...props} />);
      expect(screen.getByTestId("nb")).toHaveClass(klass);
    });
  });

  it("NavbarBrand sin href renderiza <div>; con href renderiza <a>", () => {
    const { rerender } = render(
      <NavbarBrand data-testid="b">App</NavbarBrand>,
    );
    expect(screen.getByTestId("b").tagName).toBe("DIV");
    rerender(
      <NavbarBrand data-testid="b" href="/home">
        App
      </NavbarBrand>,
    );
    const a = screen.getByTestId("b");
    expect(a.tagName).toBe("A");
    expect(a).toHaveAttribute("href", "/home");
    expect(a).toHaveClass("ig-navbar-brand");
  });

  it("NavbarNav usa <nav> con aria-label por defecto 'Principal'", () => {
    render(
      <NavbarNav>
        <NavbarLink href="#">x</NavbarLink>
      </NavbarNav>,
    );
    expect(screen.getByRole("navigation", { name: "Principal" })).toHaveClass(
      "ig-navbar-nav",
    );
  });

  it("NavbarLink active: aplica aria-current y la clase active", () => {
    render(
      <NavbarNav>
        <NavbarLink href="/inicio" active>
          Inicio
        </NavbarLink>
        <NavbarLink href="/about">About</NavbarLink>
      </NavbarNav>,
    );
    const inicio = screen.getByRole("link", { name: "Inicio" });
    const about = screen.getByRole("link", { name: "About" });
    expect(inicio).toHaveAttribute("aria-current", "page");
    expect(inicio).toHaveClass("ig-navbar-link", "ig-navbar-link-active");
    expect(about).not.toHaveAttribute("aria-current");
    expect(about).not.toHaveClass("ig-navbar-link-active");
  });

  it("NavbarActions usa <div class=ig-navbar-actions>", () => {
    render(
      <NavbarActions data-testid="a">
        <button>x</button>
      </NavbarActions>,
    );
    expect(screen.getByTestId("a")).toHaveClass("ig-navbar-actions");
  });

  it("NavbarMenuButton expone aria-expanded y aria-controls", () => {
    render(<NavbarMenuButton expanded controlsId="menu" />);
    const btn = screen.getByRole("button", { name: "Abrir menú" });
    expect(btn).toHaveClass("ig-navbar-menu-btn");
    expect(btn).toHaveAttribute("aria-expanded", "true");
    expect(btn).toHaveAttribute("aria-controls", "menu");
  });
});
