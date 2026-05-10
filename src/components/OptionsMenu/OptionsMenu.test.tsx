import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { OptionsMenu } from "./OptionsMenu";
import { OptionsMenuTrigger } from "./OptionsMenuTrigger";
import { OptionsMenuContent } from "./OptionsMenuContent";
import { OptionsMenuItem } from "./OptionsMenuItem";
import { OptionsMenuDivider } from "./OptionsMenuDivider";
import { OptionsMenuHeader } from "./OptionsMenuHeader";
import { useOptionsMenu } from "./OptionsMenuContext";

describe("OptionsMenu — uncontrolled", () => {
  it("aplica ig-options-menu y modifica clases por placement/direction", () => {
    const { container, rerender } = render(
      <OptionsMenu>
        <OptionsMenuTrigger>x</OptionsMenuTrigger>
      </OptionsMenu>,
    );
    const root = container.querySelector(".ig-options-menu");
    expect(root).not.toBeNull();
    expect(root).not.toHaveClass("ig-options-menu-right");
    expect(root).not.toHaveClass("ig-options-menu-up");

    rerender(
      <OptionsMenu placement="right" direction="up">
        <OptionsMenuTrigger>x</OptionsMenuTrigger>
      </OptionsMenu>,
    );
    const root2 = container.querySelector(".ig-options-menu");
    expect(root2).toHaveClass("ig-options-menu-right");
    expect(root2).toHaveClass("ig-options-menu-up");
  });

  it("trigger toggleea y aplica .open + aria-expanded", () => {
    const { container } = render(
      <OptionsMenu>
        <OptionsMenuTrigger>Abrir</OptionsMenuTrigger>
        <OptionsMenuContent>
          <OptionsMenuItem>Uno</OptionsMenuItem>
        </OptionsMenuContent>
      </OptionsMenu>,
    );
    const trigger = screen.getByRole("button", { name: /abrir/i });
    const root = container.querySelector(".ig-options-menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(root).not.toHaveClass("ig-options-menu-open");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(root).toHaveClass("ig-options-menu-open");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(root).not.toHaveClass("ig-options-menu-open");
  });

  it("click fuera cierra el menu", () => {
    const { container } = render(
      <div>
        <OptionsMenu defaultOpen>
          <OptionsMenuTrigger>Abrir</OptionsMenuTrigger>
          <OptionsMenuContent>
            <OptionsMenuItem>Uno</OptionsMenuItem>
          </OptionsMenuContent>
        </OptionsMenu>
        <button>Fuera</button>
      </div>,
    );
    const root = container.querySelector(".ig-options-menu");
    expect(root).toHaveClass("ig-options-menu-open");
    fireEvent.mouseDown(screen.getByRole("button", { name: /fuera/i }));
    expect(root).not.toHaveClass("ig-options-menu-open");
  });

  it("ESC cierra el menu y devuelve foco al trigger", () => {
    render(
      <OptionsMenu defaultOpen>
        <OptionsMenuTrigger>Abrir</OptionsMenuTrigger>
        <OptionsMenuContent>
          <OptionsMenuItem>Uno</OptionsMenuItem>
        </OptionsMenuContent>
      </OptionsMenu>,
    );
    const trigger = screen.getByRole("button", { name: /abrir/i });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("activar un item cierra el menu (closeOnSelect=true por defecto)", () => {
    const onClick = vi.fn();
    render(
      <OptionsMenu defaultOpen>
        <OptionsMenuTrigger>Abrir</OptionsMenuTrigger>
        <OptionsMenuContent>
          <OptionsMenuItem onClick={onClick}>Editar</OptionsMenuItem>
        </OptionsMenuContent>
      </OptionsMenu>,
    );
    const trigger = screen.getByRole("button", { name: /abrir/i });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("menuitem", { name: /editar/i }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closeOnSelect=false mantiene el menu abierto al activar item", () => {
    render(
      <OptionsMenu defaultOpen closeOnSelect={false}>
        <OptionsMenuTrigger>Abrir</OptionsMenuTrigger>
        <OptionsMenuContent>
          <OptionsMenuItem>Uno</OptionsMenuItem>
        </OptionsMenuContent>
      </OptionsMenu>,
    );
    const trigger = screen.getByRole("button", { name: /abrir/i });
    fireEvent.click(screen.getByRole("menuitem", { name: /uno/i }));
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});

describe("OptionsMenu — controlled", () => {
  it("respeta open/onOpenChange y no muta solo", () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => { setOpen(true); }}>Externo</button>
          <OptionsMenu open={open} onOpenChange={setOpen}>
            <OptionsMenuTrigger>Abrir</OptionsMenuTrigger>
            <OptionsMenuContent>
              <OptionsMenuItem>Uno</OptionsMenuItem>
            </OptionsMenuContent>
          </OptionsMenu>
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
      <OptionsMenu open={false} onOpenChange={onOpenChange}>
        <OptionsMenuTrigger>x</OptionsMenuTrigger>
      </OptionsMenu>,
    );
    fireEvent.click(screen.getByRole("button", { name: /x/i }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});

describe("OptionsMenu — keyboard", () => {
  it("ArrowDown en trigger abre y enfoca el primer item", () => {
    render(
      <OptionsMenu>
        <OptionsMenuTrigger>Abrir</OptionsMenuTrigger>
        <OptionsMenuContent>
          <OptionsMenuItem>Uno</OptionsMenuItem>
          <OptionsMenuItem>Dos</OptionsMenuItem>
        </OptionsMenuContent>
      </OptionsMenu>,
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
      <OptionsMenu>
        <OptionsMenuTrigger>Abrir</OptionsMenuTrigger>
        <OptionsMenuContent>
          <OptionsMenuItem>Uno</OptionsMenuItem>
          <OptionsMenuItem>Dos</OptionsMenuItem>
        </OptionsMenuContent>
      </OptionsMenu>,
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
      <OptionsMenu defaultOpen>
        <OptionsMenuTrigger>Abrir</OptionsMenuTrigger>
        <OptionsMenuContent>
          <OptionsMenuItem>A</OptionsMenuItem>
          <OptionsMenuItem>B</OptionsMenuItem>
          <OptionsMenuItem>C</OptionsMenuItem>
        </OptionsMenuContent>
      </OptionsMenu>,
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
      <OptionsMenu defaultOpen>
        <OptionsMenuTrigger>Abrir</OptionsMenuTrigger>
        <OptionsMenuContent>
          <OptionsMenuItem>A</OptionsMenuItem>
          <OptionsMenuItem disabled>B</OptionsMenuItem>
          <OptionsMenuItem>C</OptionsMenuItem>
        </OptionsMenuContent>
      </OptionsMenu>,
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
      <OptionsMenu>
        <OptionsMenuTrigger>Abrir</OptionsMenuTrigger>
        <OptionsMenuContent>
          <OptionsMenuItem href="#a" aria-disabled="true">
            Bloqueado
          </OptionsMenuItem>
          <OptionsMenuItem href="#b">Activo</OptionsMenuItem>
        </OptionsMenuContent>
      </OptionsMenu>,
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

describe("OptionsMenuItem — variantes y href", () => {
  it("aplica ig-options-menu-item-danger y -active", () => {
    render(
      <OptionsMenu defaultOpen>
        <OptionsMenuTrigger>x</OptionsMenuTrigger>
        <OptionsMenuContent>
          <OptionsMenuItem danger>Del</OptionsMenuItem>
          <OptionsMenuItem active>Sel</OptionsMenuItem>
        </OptionsMenuContent>
      </OptionsMenu>,
    );
    expect(screen.getByRole("menuitem", { name: /del/i })).toHaveClass(
      "ig-options-menu-item-danger",
    );
    expect(screen.getByRole("menuitem", { name: /sel/i })).toHaveClass(
      "ig-options-menu-item-active",
    );
  });

  it("renderiza <a> cuando recibe href", () => {
    render(
      <OptionsMenu defaultOpen>
        <OptionsMenuTrigger>x</OptionsMenuTrigger>
        <OptionsMenuContent>
          <OptionsMenuItem href="/perfil">Perfil</OptionsMenuItem>
        </OptionsMenuContent>
      </OptionsMenu>,
    );
    const item = screen.getByRole("menuitem", { name: /perfil/i });
    expect(item.tagName).toBe("A");
    expect(item).toHaveAttribute("href", "/perfil");
  });
});

describe("OptionsMenuDivider y OptionsMenuHeader", () => {
  it("OptionsMenuDivider tiene role=separator y clase", () => {
    const { container } = render(<OptionsMenuDivider />);
    const sep = container.querySelector('[role="separator"]');
    expect(sep).toHaveClass("ig-options-menu-divider");
  });

  it("OptionsMenuHeader aplica ig-options-menu-header", () => {
    render(<OptionsMenuHeader data-testid="h">Sección</OptionsMenuHeader>);
    expect(screen.getByTestId("h")).toHaveClass("ig-options-menu-header");
  });

  it("desmontar mientras está abierto limpia listeners globales (mousedown/keydown)", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(
      <OptionsMenu defaultOpen>
        <OptionsMenuTrigger>x</OptionsMenuTrigger>
        <OptionsMenuContent>
          <OptionsMenuItem>A</OptionsMenuItem>
        </OptionsMenuContent>
      </OptionsMenu>,
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

describe("useOptionsMenu fuera de provider", () => {
  it("lanza error útil", () => {
    function Boom() {
      useOptionsMenu();
      return null;
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Boom />)).toThrow(/OptionsMenu/);
    spy.mockRestore();
  });
});

describe("OptionsMenu — className merge", () => {
  it("OptionsMenu root, Trigger y Item conservan su clase base con className consumer", () => {
    const { container } = render(
      <OptionsMenu className="my-dd extra">
        <OptionsMenuTrigger className="my-trigger">Abrir</OptionsMenuTrigger>
        <OptionsMenuContent className="my-menu">
          <OptionsMenuItem className="my-item">Uno</OptionsMenuItem>
        </OptionsMenuContent>
      </OptionsMenu>,
    );
    const root = container.querySelector(".ig-options-menu");
    expect(root).toHaveClass("ig-options-menu");
    expect(root).toHaveClass("my-dd");
    expect(root).toHaveClass("extra");

    const trigger = screen.getByRole("button", { name: /abrir/i });
    expect(trigger).toHaveClass("ig-options-menu-trigger");
    expect(trigger).toHaveClass("my-trigger");
  });
});

// H-19 (gate review): WAI-ARIA APG menu-button-links exige que
// role="menuitem" se active con Space y Enter. Para <a>, Enter
// dispara click nativo del browser, pero Space NO — antes de este
// fix, presionar Space en un OptionsMenuItem href no hacía nada.
describe("OptionsMenuItem — href + Space (H-19, WAI-ARIA APG)", () => {
  it("Space en <a> menuitem activa onClick (sintético)", () => {
    const onClick = vi.fn();
    render(
      <OptionsMenu defaultOpen>
        <OptionsMenuTrigger>Abrir</OptionsMenuTrigger>
        <OptionsMenuContent>
          <OptionsMenuItem href="/perfil" onClick={onClick}>
            Perfil
          </OptionsMenuItem>
        </OptionsMenuContent>
      </OptionsMenu>,
    );
    const item = screen.getByRole("menuitem", { name: /perfil/i });
    item.focus();
    fireEvent.keyDown(item, { key: " " });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("Space en <a> menuitem aria-disabled NO activa onClick", () => {
    const onClick = vi.fn();
    render(
      <OptionsMenu defaultOpen>
        <OptionsMenuTrigger>Abrir</OptionsMenuTrigger>
        <OptionsMenuContent>
          <OptionsMenuItem href="/perfil" aria-disabled onClick={onClick}>
            Perfil
          </OptionsMenuItem>
        </OptionsMenuContent>
      </OptionsMenu>,
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
      <OptionsMenu defaultOpen closeOnSelect={false}>
        <OptionsMenuTrigger>Abrir</OptionsMenuTrigger>
        <OptionsMenuContent>
          <OptionsMenuItem href="/perfil" onClick={onClick}>
            Perfil
          </OptionsMenuItem>
        </OptionsMenuContent>
      </OptionsMenu>,
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
      <OptionsMenu defaultOpen>
        <OptionsMenuTrigger>Abrir</OptionsMenuTrigger>
        <OptionsMenuContent>
          <OptionsMenuItem href="/perfil" onClick={onClick}>
            Perfil
          </OptionsMenuItem>
        </OptionsMenuContent>
      </OptionsMenu>,
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
