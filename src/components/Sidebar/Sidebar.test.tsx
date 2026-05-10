import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "./Sidebar";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarNav } from "./SidebarNav";
import { SidebarItem } from "./SidebarItem";
import { SidebarFooter } from "./SidebarFooter";
import { SidebarToggle } from "./SidebarToggle";
import { SidebarDivider } from "./SidebarDivider";
import { SidebarSection } from "./SidebarSection";
import { useSidebar } from "./SidebarContext";

describe("Sidebar — root", () => {
  it("renderiza un <aside> con ig-sidebar y aria-label por defecto", () => {
    render(
      <Sidebar>
        <SidebarNav />
      </Sidebar>,
    );
    const aside = screen.getByRole("complementary", {
      name: /navegación lateral/i,
    });
    expect(aside).toHaveClass("ig-sidebar");
    expect(aside).not.toHaveClass("ig-sidebar-collapsed");
  });

  it("aplica ig-sidebar-collapsed cuando defaultCollapsed", () => {
    render(
      <Sidebar defaultCollapsed>
        <SidebarNav />
      </Sidebar>,
    );
    expect(
      screen.getByRole("complementary", { name: /navegación lateral/i }),
    ).toHaveClass("ig-sidebar-collapsed");
  });

  it("aria-label custom", () => {
    render(
      <Sidebar aria-label="Menú admin">
        <SidebarNav />
      </Sidebar>,
    );
    expect(
      screen.getByRole("complementary", { name: /menú admin/i }),
    ).toBeInTheDocument();
  });
});

describe("Sidebar — toggle (uncontrolled)", () => {
  it("toggle alterna collapsed y aria-expanded del botón", () => {
    render(
      <Sidebar>
        <SidebarFooter>
          <SidebarToggle />
        </SidebarFooter>
      </Sidebar>,
    );
    const aside = screen.getByRole("complementary");
    const toggle = screen.getByRole("button", { name: /colapsar sidebar/i });
    expect(aside).not.toHaveClass("ig-sidebar-collapsed");
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(toggle);
    expect(aside).toHaveClass("ig-sidebar-collapsed");
    const toggleColapsada = screen.getByRole("button", {
      name: /expandir sidebar/i,
    });
    expect(toggleColapsada).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggleColapsada);
    expect(aside).not.toHaveClass("ig-sidebar-collapsed");
  });

  // H-10 (gate review): completar par aria-expanded + aria-controls.
  // El SidebarToggle debe apuntar al <aside> via aria-controls para
  // que el SR sepa qué panel se expande/colapsa.
  it("aria-controls del toggle apunta al id del <aside> (H-10)", () => {
    render(
      <Sidebar>
        <SidebarFooter>
          <SidebarToggle />
        </SidebarFooter>
      </Sidebar>,
    );
    const aside = screen.getByRole("complementary");
    const toggle = screen.getByRole("button", { name: /colapsar sidebar/i });
    const asideId = aside.getAttribute("id");
    expect(asideId).toBeTruthy();
    expect(toggle).toHaveAttribute("aria-controls", asideId!);
  });

  it("respeta id custom del consumer en aria-controls (H-10)", () => {
    render(
      <Sidebar id="my-sidebar">
        <SidebarFooter>
          <SidebarToggle />
        </SidebarFooter>
      </Sidebar>,
    );
    expect(screen.getByRole("complementary")).toHaveAttribute(
      "id",
      "my-sidebar",
    );
    expect(
      screen.getByRole("button", { name: /colapsar/i }),
    ).toHaveAttribute("aria-controls", "my-sidebar");
  });

  it("dispara onValueChange en cada toggle", () => {
    const onChange = vi.fn();
    render(
      <Sidebar onValueChange={onChange}>
        <SidebarFooter>
          <SidebarToggle />
        </SidebarFooter>
      </Sidebar>,
    );
    fireEvent.click(screen.getByRole("button", { name: /colapsar/i }));
    expect(onChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: /expandir/i }));
    expect(onChange).toHaveBeenLastCalledWith(false);
  });
});

describe("Sidebar — controlled", () => {
  it("respeta la prop collapsed y no muta solo", () => {
    function Harness() {
      const [collapsed, setCollapsed] = useState(true);
      return (
        <>
          <button onClick={() => { setCollapsed(false); }}>externo</button>
          <Sidebar collapsed={collapsed} onValueChange={setCollapsed}>
            <SidebarFooter>
              <SidebarToggle />
            </SidebarFooter>
          </Sidebar>
        </>
      );
    }
    render(<Harness />);
    const aside = screen.getByRole("complementary");
    expect(aside).toHaveClass("ig-sidebar-collapsed");
    fireEvent.click(screen.getByRole("button", { name: /externo/i }));
    expect(aside).not.toHaveClass("ig-sidebar-collapsed");
  });
});

describe("SidebarItem", () => {
  it("renderiza <a> cuando recibe href con aria-current si active", () => {
    render(
      <Sidebar>
        <SidebarNav>
          <SidebarItem href="/" icon="🏠" active>
            Inicio
          </SidebarItem>
        </SidebarNav>
      </Sidebar>,
    );
    const link = screen.getByRole("link", { name: /inicio/i });
    expect(link).toHaveAttribute("href", "/");
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link).toHaveClass("ig-sidebar-item-active");
    // Icono y texto separados con sus clases.
    expect(link.querySelector(".ig-sidebar-icon")).toHaveTextContent("🏠");
    expect(link.querySelector(".ig-sidebar-text")).toHaveTextContent("Inicio");
  });

  it("renderiza <button> cuando NO recibe href, sin aria-current si !active", () => {
    const onClick = vi.fn();
    render(
      <Sidebar>
        <SidebarNav>
          <SidebarItem onClick={onClick}>Acción</SidebarItem>
        </SidebarNav>
      </Sidebar>,
    );
    const btn = screen.getByRole("button", { name: /acción/i });
    expect(btn.tagName).toBe("BUTTON");
    expect(btn).not.toHaveAttribute("aria-current");
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("SidebarHeader / Divider / Section / Nav / Footer", () => {
  it("Header pone el icono fuera y el texto en <span>", () => {
    const { container } = render(
      <SidebarHeader icon={<i data-testid="logo" />}>Mi App</SidebarHeader>,
    );
    expect(container.firstChild).toHaveClass("ig-sidebar-header");
    expect(screen.getByTestId("logo")).toBeInTheDocument();
    expect(screen.getByText("Mi App").tagName).toBe("SPAN");
  });

  it("Divider tiene role=separator", () => {
    const { container } = render(<SidebarDivider />);
    const sep = container.querySelector('[role="separator"]');
    expect(sep).toHaveClass("ig-sidebar-divider");
  });

  it("Section aplica ig-sidebar-section", () => {
    render(<SidebarSection data-testid="s">Principal</SidebarSection>);
    expect(screen.getByTestId("s")).toHaveClass("ig-sidebar-section");
  });

  it("Nav es un <nav> con aria-label custom", () => {
    render(<SidebarNav aria-label="Admin">x</SidebarNav>);
    expect(
      screen.getByRole("navigation", { name: /admin/i }),
    ).toHaveClass("ig-sidebar-nav");
  });

  it("Footer aplica ig-sidebar-footer", () => {
    render(<SidebarFooter data-testid="f">x</SidebarFooter>);
    expect(screen.getByTestId("f")).toHaveClass("ig-sidebar-footer");
  });
});

describe("useSidebar fuera de provider", () => {
  it("lanza error al usar el hook sin <Sidebar>", () => {
    function Boom() {
      useSidebar();
      return null;
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Boom />)).toThrow(/Sidebar/);
    spy.mockRestore();
  });
});

describe("Sidebar — i18n aria-label", () => {
  // La prop separada `ariaLabel` se eliminó en beta.22 (B-09). Estos
  // tests validan el patrón actual: aria-label HTML estándar vía rest.
  it("aria-label custom override aria-label default", () => {
    render(<Sidebar aria-label="Side navigation" />);
    expect(screen.getByRole("complementary")).toHaveAttribute(
      "aria-label",
      "Side navigation",
    );
  });

  it("sin override cae a 'Navegación lateral' ES", () => {
    render(<Sidebar />);
    expect(screen.getByRole("complementary")).toHaveAttribute(
      "aria-label",
      "Navegación lateral",
    );
  });
});
