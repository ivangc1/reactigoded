import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Dropdown } from "./Dropdown";
import { DropdownTrigger } from "./DropdownTrigger";
import { DropdownMenu } from "./DropdownMenu";
import { DropdownItem } from "./DropdownItem";
import { DropdownDivider } from "./DropdownDivider";
import { DropdownHeader } from "./DropdownHeader";
import { useDropdown } from "./DropdownContext";

describe("Dropdown — uncontrolled", () => {
  it("aplica ig-dropdown y modifica clases por placement/direction", () => {
    const { container, rerender } = render(
      <Dropdown>
        <DropdownTrigger>x</DropdownTrigger>
      </Dropdown>,
    );
    const root = container.querySelector(".ig-dropdown");
    expect(root).not.toBeNull();
    expect(root).not.toHaveClass("ig-dropdown-right");
    expect(root).not.toHaveClass("ig-dropdown-up");

    rerender(
      <Dropdown placement="right" direction="up">
        <DropdownTrigger>x</DropdownTrigger>
      </Dropdown>,
    );
    const root2 = container.querySelector(".ig-dropdown");
    expect(root2).toHaveClass("ig-dropdown-right");
    expect(root2).toHaveClass("ig-dropdown-up");
  });

  it("trigger toggleea y aplica .open + aria-expanded", () => {
    const { container } = render(
      <Dropdown>
        <DropdownTrigger>Abrir</DropdownTrigger>
        <DropdownMenu>
          <DropdownItem>Uno</DropdownItem>
        </DropdownMenu>
      </Dropdown>,
    );
    const trigger = screen.getByRole("button", { name: /abrir/i });
    const root = container.querySelector(".ig-dropdown");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(root).not.toHaveClass("ig-dropdown-open");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(root).toHaveClass("ig-dropdown-open");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(root).not.toHaveClass("ig-dropdown-open");
  });

  it("click fuera cierra el menu", () => {
    const { container } = render(
      <div>
        <Dropdown defaultOpen>
          <DropdownTrigger>Abrir</DropdownTrigger>
          <DropdownMenu>
            <DropdownItem>Uno</DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <button>Fuera</button>
      </div>,
    );
    const root = container.querySelector(".ig-dropdown");
    expect(root).toHaveClass("ig-dropdown-open");
    fireEvent.mouseDown(screen.getByRole("button", { name: /fuera/i }));
    expect(root).not.toHaveClass("ig-dropdown-open");
  });

  it("ESC cierra el menu y devuelve foco al trigger", () => {
    render(
      <Dropdown defaultOpen>
        <DropdownTrigger>Abrir</DropdownTrigger>
        <DropdownMenu>
          <DropdownItem>Uno</DropdownItem>
        </DropdownMenu>
      </Dropdown>,
    );
    const trigger = screen.getByRole("button", { name: /abrir/i });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("activar un item cierra el menu (closeOnSelect=true por defecto)", () => {
    const onClick = vi.fn();
    render(
      <Dropdown defaultOpen>
        <DropdownTrigger>Abrir</DropdownTrigger>
        <DropdownMenu>
          <DropdownItem onClick={onClick}>Editar</DropdownItem>
        </DropdownMenu>
      </Dropdown>,
    );
    const trigger = screen.getByRole("button", { name: /abrir/i });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("menuitem", { name: /editar/i }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closeOnSelect=false mantiene el menu abierto al activar item", () => {
    render(
      <Dropdown defaultOpen closeOnSelect={false}>
        <DropdownTrigger>Abrir</DropdownTrigger>
        <DropdownMenu>
          <DropdownItem>Uno</DropdownItem>
        </DropdownMenu>
      </Dropdown>,
    );
    const trigger = screen.getByRole("button", { name: /abrir/i });
    fireEvent.click(screen.getByRole("menuitem", { name: /uno/i }));
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});

describe("Dropdown — controlled", () => {
  it("respeta open/onOpenChange y no muta solo", () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => { setOpen(true); }}>Externo</button>
          <Dropdown open={open} onOpenChange={setOpen}>
            <DropdownTrigger>Abrir</DropdownTrigger>
            <DropdownMenu>
              <DropdownItem>Uno</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </>
      );
    }
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: /abrir/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: /externo/i }));
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("dispara onOpenChange al togglear desde el trigger", () => {
    const onOpenChange = vi.fn();
    render(
      <Dropdown open={false} onOpenChange={onOpenChange}>
        <DropdownTrigger>x</DropdownTrigger>
      </Dropdown>,
    );
    fireEvent.click(screen.getByRole("button", { name: /x/i }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});

describe("Dropdown — keyboard", () => {
  it("ArrowDown en trigger abre y enfoca el primer item", () => {
    render(
      <Dropdown>
        <DropdownTrigger>Abrir</DropdownTrigger>
        <DropdownMenu>
          <DropdownItem>Uno</DropdownItem>
          <DropdownItem>Dos</DropdownItem>
        </DropdownMenu>
      </Dropdown>,
    );
    const trigger = screen.getByRole("button", { name: /abrir/i });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    // requestAnimationFrame se invoca síncronamente en happy-dom; el foco debe
    // estar en el primer item.
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        expect(screen.getByRole("menuitem", { name: /uno/i })).toHaveFocus();
        resolve();
      });
    });
  });

  it("ArrowUp en trigger abre y enfoca el último item", () => {
    render(
      <Dropdown>
        <DropdownTrigger>Abrir</DropdownTrigger>
        <DropdownMenu>
          <DropdownItem>Uno</DropdownItem>
          <DropdownItem>Dos</DropdownItem>
        </DropdownMenu>
      </Dropdown>,
    );
    const trigger = screen.getByRole("button", { name: /abrir/i });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "ArrowUp" });
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        expect(screen.getByRole("menuitem", { name: /dos/i })).toHaveFocus();
        resolve();
      });
    });
  });

  it("ArrowDown/ArrowUp en items hace ciclo y Home/End van a extremos", () => {
    render(
      <Dropdown defaultOpen>
        <DropdownTrigger>Abrir</DropdownTrigger>
        <DropdownMenu>
          <DropdownItem>A</DropdownItem>
          <DropdownItem>B</DropdownItem>
          <DropdownItem>C</DropdownItem>
        </DropdownMenu>
      </Dropdown>,
    );
    const a = screen.getByRole("menuitem", { name: "A" });
    const b = screen.getByRole("menuitem", { name: "B" });
    const c = screen.getByRole("menuitem", { name: "C" });

    a.focus();
    fireEvent.keyDown(a, { key: "ArrowDown" });
    expect(b).toHaveFocus();

    fireEvent.keyDown(b, { key: "End" });
    expect(c).toHaveFocus();

    fireEvent.keyDown(c, { key: "ArrowDown" });
    expect(a).toHaveFocus();

    fireEvent.keyDown(a, { key: "ArrowUp" });
    expect(c).toHaveFocus();

    fireEvent.keyDown(c, { key: "Home" });
    expect(a).toHaveFocus();
  });

  it("items disabled se saltan en la navegación", () => {
    render(
      <Dropdown defaultOpen>
        <DropdownTrigger>Abrir</DropdownTrigger>
        <DropdownMenu>
          <DropdownItem>A</DropdownItem>
          <DropdownItem disabled>B</DropdownItem>
          <DropdownItem>C</DropdownItem>
        </DropdownMenu>
      </Dropdown>,
    );
    const a = screen.getByRole("menuitem", { name: "A" });
    const c = screen.getByRole("menuitem", { name: "C" });
    a.focus();
    fireEvent.keyDown(a, { key: "ArrowDown" });
    expect(c).toHaveFocus();
  });

  it("ArrowDown desde trigger salta primer item con aria-disabled (anchor)", () => {
    // Regresión: trigger usaba selector más laxo que items y enfocaba el
    // primer <a aria-disabled="true">. Ahora ambos comparten
    // NAVIGABLE_ITEM_SELECTOR y deben coincidir.
    render(
      <Dropdown>
        <DropdownTrigger>Abrir</DropdownTrigger>
        <DropdownMenu>
          <DropdownItem href="#a" aria-disabled="true">
            Bloqueado
          </DropdownItem>
          <DropdownItem href="#b">Activo</DropdownItem>
        </DropdownMenu>
      </Dropdown>,
    );
    const trigger = screen.getByRole("button", { name: /abrir/i });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        expect(screen.getByRole("menuitem", { name: /activo/i })).toHaveFocus();
        resolve();
      });
    });
  });
});

describe("DropdownItem — variantes y href", () => {
  it("aplica ig-dropdown-item-danger y -active", () => {
    render(
      <Dropdown defaultOpen>
        <DropdownTrigger>x</DropdownTrigger>
        <DropdownMenu>
          <DropdownItem danger>Del</DropdownItem>
          <DropdownItem active>Sel</DropdownItem>
        </DropdownMenu>
      </Dropdown>,
    );
    expect(screen.getByRole("menuitem", { name: /del/i })).toHaveClass(
      "ig-dropdown-item-danger",
    );
    expect(screen.getByRole("menuitem", { name: /sel/i })).toHaveClass(
      "ig-dropdown-item-active",
    );
  });

  it("renderiza <a> cuando recibe href", () => {
    render(
      <Dropdown defaultOpen>
        <DropdownTrigger>x</DropdownTrigger>
        <DropdownMenu>
          <DropdownItem href="/perfil">Perfil</DropdownItem>
        </DropdownMenu>
      </Dropdown>,
    );
    const item = screen.getByRole("menuitem", { name: /perfil/i });
    expect(item.tagName).toBe("A");
    expect(item).toHaveAttribute("href", "/perfil");
  });
});

describe("DropdownDivider y DropdownHeader", () => {
  it("DropdownDivider tiene role=separator y clase", () => {
    const { container } = render(<DropdownDivider />);
    const sep = container.querySelector('[role="separator"]');
    expect(sep).toHaveClass("ig-dropdown-divider");
  });

  it("DropdownHeader aplica ig-dropdown-header", () => {
    render(<DropdownHeader data-testid="h">Sección</DropdownHeader>);
    expect(screen.getByTestId("h")).toHaveClass("ig-dropdown-header");
  });

  it("desmontar mientras está abierto limpia listeners globales (mousedown/keydown)", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(
      <Dropdown defaultOpen>
        <DropdownTrigger>x</DropdownTrigger>
        <DropdownMenu>
          <DropdownItem>A</DropdownItem>
        </DropdownMenu>
      </Dropdown>,
    );
    // Al abrirse se añaden mousedown + keydown.
    const addedTypes = addSpy.mock.calls.map((c) => c[0]);
    expect(addedTypes).toContain("mousedown");
    expect(addedTypes).toContain("keydown");
    addSpy.mockClear();
    removeSpy.mockClear();
    unmount();
    // Tras unmount, los listeners deben haberse limpiado.
    const removedTypes = removeSpy.mock.calls.map((c) => c[0]);
    expect(removedTypes).toContain("mousedown");
    expect(removedTypes).toContain("keydown");
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});

describe("useDropdown fuera de provider", () => {
  it("lanza error útil", () => {
    function Boom() {
      useDropdown();
      return null;
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Boom />)).toThrow(/Dropdown/);
    spy.mockRestore();
  });
});

describe("Dropdown — className merge", () => {
  it("Dropdown root, Trigger y Item conservan su clase base con className consumer", () => {
    const { container } = render(
      <Dropdown className="my-dd extra">
        <DropdownTrigger className="my-trigger">Abrir</DropdownTrigger>
        <DropdownMenu className="my-menu">
          <DropdownItem className="my-item">Uno</DropdownItem>
        </DropdownMenu>
      </Dropdown>,
    );
    const root = container.querySelector(".ig-dropdown");
    expect(root).toHaveClass("ig-dropdown");
    expect(root).toHaveClass("my-dd");
    expect(root).toHaveClass("extra");

    const trigger = screen.getByRole("button", { name: /abrir/i });
    expect(trigger).toHaveClass("ig-dropdown-trigger");
    expect(trigger).toHaveClass("my-trigger");
  });
});

// H-19 (gate review): WAI-ARIA APG menu-button-links exige que
// role="menuitem" se active con Space y Enter. Para <a>, Enter
// dispara click nativo del browser, pero Space NO — antes de este
// fix, presionar Space en un DropdownItem href no hacía nada.
describe("DropdownItem — href + Space (H-19, WAI-ARIA APG)", () => {
  it("Space en <a> menuitem activa onClick (sintético)", () => {
    const onClick = vi.fn();
    render(
      <Dropdown defaultOpen>
        <DropdownTrigger>Abrir</DropdownTrigger>
        <DropdownMenu>
          <DropdownItem href="/perfil" onClick={onClick}>
            Perfil
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>,
    );
    const item = screen.getByRole("menuitem", { name: /perfil/i });
    item.focus();
    fireEvent.keyDown(item, { key: " " });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("Space en <a> menuitem aria-disabled NO activa onClick", () => {
    const onClick = vi.fn();
    render(
      <Dropdown defaultOpen>
        <DropdownTrigger>Abrir</DropdownTrigger>
        <DropdownMenu>
          <DropdownItem href="/perfil" aria-disabled onClick={onClick}>
            Perfil
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>,
    );
    const item = screen.getByRole("menuitem", { name: /perfil/i });
    item.focus();
    fireEvent.keyDown(item, { key: " " });
    expect(onClick).not.toHaveBeenCalled();
  });

  it("Enter en <a> menuitem sigue funcionando (browser nativo, no synth)", () => {
    // Enter en <a> dispara click nativo por el browser. happy-dom
    // simula esto vía fireEvent.keyDown solo si añadimos también
    // fireEvent.click — el test verifica que NUESTRO handler no rompe
    // ese flujo (no pre-claims el evento).
    const onClick = vi.fn();
    render(
      <Dropdown defaultOpen>
        <DropdownTrigger>Abrir</DropdownTrigger>
        <DropdownMenu>
          <DropdownItem href="/perfil" onClick={onClick}>
            Perfil
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>,
    );
    const item = screen.getByRole("menuitem", { name: /perfil/i });
    item.focus();
    // Simulamos Enter: nuestro keydown no llama preventDefault, el
    // browser activaría click nativo. En happy-dom replicamos con
    // fireEvent.click (consistente con cómo el resto de tests del
    // repo verifican activaciones de anchor).
    fireEvent.keyDown(item, { key: "Enter" });
    fireEvent.click(item);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
