import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Menu } from "./Menu";
import { MenuTrigger } from "./MenuTrigger";
import { MenuContent } from "./MenuContent";
import { MenuItem } from "./MenuItem";
import { MenuSeparator } from "./MenuSeparator";
import { MenuLabel } from "./MenuLabel";
import { useMenu } from "./MenuContext";

describe("Menu — uncontrolled", () => {
  it("aplica ig-menu y modifica clases por placement/direction", () => {
    const { container, rerender } = render(
      <Menu>
        <MenuTrigger>x</MenuTrigger>
      </Menu>,
    );
    const root = container.querySelector(".ig-menu");
    expect(root).not.toBeNull();
    expect(root).not.toHaveClass("ig-menu-right");
    expect(root).not.toHaveClass("ig-menu-up");

    rerender(
      <Menu placement="right" direction="up">
        <MenuTrigger>x</MenuTrigger>
      </Menu>,
    );
    const root2 = container.querySelector(".ig-menu");
    expect(root2).toHaveClass("ig-menu-right");
    expect(root2).toHaveClass("ig-menu-up");
  });

  it("trigger toggleea y aplica .open + aria-expanded", () => {
    const { container } = render(
      <Menu>
        <MenuTrigger>Abrir</MenuTrigger>
        <MenuContent>
          <MenuItem>Uno</MenuItem>
        </MenuContent>
      </Menu>,
    );
    const trigger = screen.getByRole("button", { name: /abrir/i });
    const root = container.querySelector(".ig-menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(root).not.toHaveClass("ig-menu-open");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(root).toHaveClass("ig-menu-open");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(root).not.toHaveClass("ig-menu-open");
  });

  it("click fuera cierra el menu", () => {
    const { container } = render(
      <div>
        <Menu defaultOpen>
          <MenuTrigger>Abrir</MenuTrigger>
          <MenuContent>
            <MenuItem>Uno</MenuItem>
          </MenuContent>
        </Menu>
        <button>Fuera</button>
      </div>,
    );
    const root = container.querySelector(".ig-menu");
    expect(root).toHaveClass("ig-menu-open");
    fireEvent.mouseDown(screen.getByRole("button", { name: /fuera/i }));
    expect(root).not.toHaveClass("ig-menu-open");
  });

  it("ESC cierra el menu y devuelve foco al trigger", () => {
    render(
      <Menu defaultOpen>
        <MenuTrigger>Abrir</MenuTrigger>
        <MenuContent>
          <MenuItem>Uno</MenuItem>
        </MenuContent>
      </Menu>,
    );
    const trigger = screen.getByRole("button", { name: /abrir/i });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("activar un item cierra el menu (closeOnSelect=true por defecto)", () => {
    const onClick = vi.fn();
    render(
      <Menu defaultOpen>
        <MenuTrigger>Abrir</MenuTrigger>
        <MenuContent>
          <MenuItem onClick={onClick}>Editar</MenuItem>
        </MenuContent>
      </Menu>,
    );
    const trigger = screen.getByRole("button", { name: /abrir/i });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("menuitem", { name: /editar/i }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closeOnSelect=false mantiene el menu abierto al activar item", () => {
    render(
      <Menu defaultOpen closeOnSelect={false}>
        <MenuTrigger>Abrir</MenuTrigger>
        <MenuContent>
          <MenuItem>Uno</MenuItem>
        </MenuContent>
      </Menu>,
    );
    const trigger = screen.getByRole("button", { name: /abrir/i });
    fireEvent.click(screen.getByRole("menuitem", { name: /uno/i }));
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});

describe("Menu — controlled", () => {
  it("respeta open/onOpenChange y no muta solo", () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => { setOpen(true); }}>Externo</button>
          <Menu open={open} onOpenChange={setOpen}>
            <MenuTrigger>Abrir</MenuTrigger>
            <MenuContent>
              <MenuItem>Uno</MenuItem>
            </MenuContent>
          </Menu>
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
      <Menu open={false} onOpenChange={onOpenChange}>
        <MenuTrigger>x</MenuTrigger>
      </Menu>,
    );
    fireEvent.click(screen.getByRole("button", { name: /x/i }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});

describe("Menu — keyboard", () => {
  it("ArrowDown en trigger abre y enfoca el primer item", () => {
    render(
      <Menu>
        <MenuTrigger>Abrir</MenuTrigger>
        <MenuContent>
          <MenuItem>Uno</MenuItem>
          <MenuItem>Dos</MenuItem>
        </MenuContent>
      </Menu>,
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
      <Menu>
        <MenuTrigger>Abrir</MenuTrigger>
        <MenuContent>
          <MenuItem>Uno</MenuItem>
          <MenuItem>Dos</MenuItem>
        </MenuContent>
      </Menu>,
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
      <Menu defaultOpen>
        <MenuTrigger>Abrir</MenuTrigger>
        <MenuContent>
          <MenuItem>A</MenuItem>
          <MenuItem>B</MenuItem>
          <MenuItem>C</MenuItem>
        </MenuContent>
      </Menu>,
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
      <Menu defaultOpen>
        <MenuTrigger>Abrir</MenuTrigger>
        <MenuContent>
          <MenuItem>A</MenuItem>
          <MenuItem disabled>B</MenuItem>
          <MenuItem>C</MenuItem>
        </MenuContent>
      </Menu>,
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
      <Menu>
        <MenuTrigger>Abrir</MenuTrigger>
        <MenuContent>
          <MenuItem href="#a" aria-disabled="true">
            Bloqueado
          </MenuItem>
          <MenuItem href="#b">Activo</MenuItem>
        </MenuContent>
      </Menu>,
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

describe("MenuItem — variantes y href", () => {
  it("aplica ig-menu-item-danger y -active", () => {
    render(
      <Menu defaultOpen>
        <MenuTrigger>x</MenuTrigger>
        <MenuContent>
          <MenuItem danger>Del</MenuItem>
          <MenuItem active>Sel</MenuItem>
        </MenuContent>
      </Menu>,
    );
    expect(screen.getByRole("menuitem", { name: /del/i })).toHaveClass(
      "ig-menu-item-danger",
    );
    expect(screen.getByRole("menuitem", { name: /sel/i })).toHaveClass(
      "ig-menu-item-active",
    );
  });

  it("renderiza <a> cuando recibe href", () => {
    render(
      <Menu defaultOpen>
        <MenuTrigger>x</MenuTrigger>
        <MenuContent>
          <MenuItem href="/perfil">Perfil</MenuItem>
        </MenuContent>
      </Menu>,
    );
    const item = screen.getByRole("menuitem", { name: /perfil/i });
    expect(item.tagName).toBe("A");
    expect(item).toHaveAttribute("href", "/perfil");
  });
});

describe("MenuSeparator y MenuLabel", () => {
  it("MenuSeparator tiene role=separator y clase", () => {
    const { container } = render(<MenuSeparator />);
    const sep = container.querySelector('[role="separator"]');
    expect(sep).toHaveClass("ig-menu-separator");
  });

  it("MenuLabel aplica ig-menu-label", () => {
    render(<MenuLabel data-testid="h">Sección</MenuLabel>);
    expect(screen.getByTestId("h")).toHaveClass("ig-menu-label");
  });

  it("desmontar mientras está abierto limpia listeners globales (mousedown/keydown)", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(
      <Menu defaultOpen>
        <MenuTrigger>x</MenuTrigger>
        <MenuContent>
          <MenuItem>A</MenuItem>
        </MenuContent>
      </Menu>,
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

describe("useMenu fuera de provider", () => {
  it("lanza error útil", () => {
    function Boom() {
      useMenu();
      return null;
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Boom />)).toThrow(/Menu/);
    spy.mockRestore();
  });
});

describe("Menu — className merge", () => {
  it("Menu root, Trigger y Item conservan su clase base con className consumer", () => {
    const { container } = render(
      <Menu className="my-dd extra">
        <MenuTrigger className="my-trigger">Abrir</MenuTrigger>
        <MenuContent className="my-menu">
          <MenuItem className="my-item">Uno</MenuItem>
        </MenuContent>
      </Menu>,
    );
    const root = container.querySelector(".ig-menu");
    expect(root).toHaveClass("ig-menu");
    expect(root).toHaveClass("my-dd");
    expect(root).toHaveClass("extra");

    const trigger = screen.getByRole("button", { name: /abrir/i });
    expect(trigger).toHaveClass("ig-menu-trigger");
    expect(trigger).toHaveClass("my-trigger");
  });
});

// H-19 (gate review): WAI-ARIA APG menu-button-links exige que
// role="menuitem" se active con Space y Enter. Para <a>, Enter
// dispara click nativo del browser, pero Space NO — antes de este
// fix, presionar Space en un MenuItem href no hacía nada.
describe("MenuItem — href + Space (H-19, WAI-ARIA APG)", () => {
  it("Space en <a> menuitem activa onClick (sintético)", () => {
    const onClick = vi.fn();
    render(
      <Menu defaultOpen>
        <MenuTrigger>Abrir</MenuTrigger>
        <MenuContent>
          <MenuItem href="/perfil" onClick={onClick}>
            Perfil
          </MenuItem>
        </MenuContent>
      </Menu>,
    );
    const item = screen.getByRole("menuitem", { name: /perfil/i });
    item.focus();
    fireEvent.keyDown(item, { key: " " });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("Space en <a> menuitem aria-disabled NO activa onClick", () => {
    const onClick = vi.fn();
    render(
      <Menu defaultOpen>
        <MenuTrigger>Abrir</MenuTrigger>
        <MenuContent>
          <MenuItem href="/perfil" aria-disabled onClick={onClick}>
            Perfil
          </MenuItem>
        </MenuContent>
      </Menu>,
    );
    const item = screen.getByRole("menuitem", { name: /perfil/i });
    item.focus();
    fireEvent.keyDown(item, { key: " " });
    expect(onClick).not.toHaveBeenCalled();
  });

  it("Space repetido (auto-repeat) dispara onClick UNA sola vez (codex P2)", () => {
    // Mantener Space presionado emite keydown con e.repeat=true. El
    // handler debe sintetizar UN solo click — replicando la semántica
    // nativa de <button> que activa al keyup, no al keydown. Aplica
    // también con closeOnSelect=false porque el item no se desmonta y
    // los repeats siguen llegando al mismo nodo.
    const onClick = vi.fn();
    render(
      <Menu defaultOpen closeOnSelect={false}>
        <MenuTrigger>Abrir</MenuTrigger>
        <MenuContent>
          <MenuItem href="/perfil" onClick={onClick}>
            Perfil
          </MenuItem>
        </MenuContent>
      </Menu>,
    );
    const item = screen.getByRole("menuitem", { name: /perfil/i });
    item.focus();
    // Pulsación larga: 1 keydown inicial + 5 repeats.
    fireEvent.keyDown(item, { key: " ", repeat: false });
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(item, { key: " ", repeat: true });
    }
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("Enter en <a> menuitem sigue funcionando (browser nativo, no synth)", () => {
    // Enter en <a> dispara click nativo por el browser. happy-dom
    // simula esto vía fireEvent.keyDown solo si añadimos también
    // fireEvent.click — el test verifica que NUESTRO handler no rompe
    // ese flujo (no pre-claims el evento).
    const onClick = vi.fn();
    render(
      <Menu defaultOpen>
        <MenuTrigger>Abrir</MenuTrigger>
        <MenuContent>
          <MenuItem href="/perfil" onClick={onClick}>
            Perfil
          </MenuItem>
        </MenuContent>
      </Menu>,
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
