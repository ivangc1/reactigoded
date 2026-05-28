import { describe, it, expect, vi } from "vitest";
import { useRef, useState, type ReactNode } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Menu } from "./Menu";
import { MenuTrigger } from "./MenuTrigger";
import { MenuContent } from "./MenuContent";
import { MenuItem } from "./MenuItem";
import { MenuSeparator } from "./MenuSeparator";
import { MenuLabel } from "./MenuLabel";
import { useMenu } from "./MenuContext";

describe("Menu — uncontrolled", () => {
  it("D2: aplica data-side/data-align/data-state al MenuContent según placement/direction default", () => {
    render(
      <Menu defaultOpen>
        <MenuTrigger>x</MenuTrigger>
        <MenuContent>
          <MenuItem>Uno</MenuItem>
        </MenuContent>
      </Menu>,
    );
    // Default: placement="left" + direction="down" → fuiPlacement="bottom-start".
    const content = screen.getByRole("menu");
    expect(content).toHaveAttribute("data-side", "bottom");
    expect(content).toHaveAttribute("data-align", "start");
    expect(content).toHaveAttribute("data-state", "open");
  });

  it("D2: placement='right' + direction='up' → data-side='top', data-align='end'", () => {
    render(
      <Menu defaultOpen placement="right" direction="up">
        <MenuTrigger>x</MenuTrigger>
        <MenuContent>
          <MenuItem>Uno</MenuItem>
        </MenuContent>
      </Menu>,
    );
    // fuiPlacement="top-end".
    const content = screen.getByRole("menu");
    expect(content).toHaveAttribute("data-side", "top");
    expect(content).toHaveAttribute("data-align", "end");
  });

  it("trigger toggleea y MenuContent se monta/desmonta + aria-expanded", () => {
    render(
      <Menu>
        <MenuTrigger>Abrir</MenuTrigger>
        <MenuContent>
          <MenuItem>Uno</MenuItem>
        </MenuContent>
      </Menu>,
    );
    const trigger = screen.getByRole("button", { name: /abrir/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    // D2: unmount-on-close. Pre-D2 MenuContent siempre en DOM oculto via
    // CSS. Post-D2: si !open, MenuContent retorna null → no en DOM.
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("click fuera cierra el menu (MenuContent desmontado)", () => {
    render(
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
    // D2: MenuContent montado cuando open (no más CSS-hidden).
    expect(screen.getByRole("menu")).toBeInTheDocument();
    // C-03 (RC1): tras migración a FUI, useDismiss usa `pointerdown` por
    // defecto, no `mousedown`. Comportamiento observable (outside click
    // cierra) preservado; cambio de evento es detalle de implementación
    // del primitive.
    fireEvent.pointerDown(screen.getByRole("button", { name: /fuera/i }));
    // D2: tras close, MenuContent desmontado (no en DOM).
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
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
    // C-03 (RC1): FUI returnFocus de FloatingFocusManager requiere un
    // caller activo previo. defaultOpen+Escape sin focus inicial deja
    // body como activeElement; flujo realista del usuario implica foco
    // en el trigger antes del Escape (click previo o tab).
    trigger.focus();
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

describe("Menu — APG regresión inversa (RC1)", () => {
  // C-03 (RC1): verifica que click en el trigger ABRE el menu (aria-expanded
  // true + menu visible). El comportamiento de focus tras click queda a FUI
  // default — `useListNavigation` con `focusItemOnOpen: 'auto'` puede focar
  // primer item incluso en click para permitir continuación keyboard
  // (Radix/ShadCN/MUI varían en este detalle; FUI default es estándar
  // industria). Lo crítico observable consumer-side es: click abre el menu
  // y los items quedan navegables.
  it("APG: click en trigger abre el menu", async () => {
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
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const menu = await screen.findByRole("menu");
    expect(menu).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /uno/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /dos/i }),
    ).toBeInTheDocument();
  });
});

describe("Menu — keyboard", () => {
  // C-03 (RC1): tests post-migración FUI verifican el contrato
  // .focus() invocation con spy global sobre HTMLElement.prototype.focus
  // (lo que screen readers y browser real consumen para detectar el
  // item activo). Razón documentada en
  // `docs/decisions/T-108-happy-dom-focus-limitation.md`:
  //   1. happy-dom no actualiza `document.activeElement` con .focus()
  //      programático + tabIndex transitorio.
  //   2. FUI useListNavigation con focusItemOnOpen: 'auto' invoca
  //      .focus() directamente sin propagar a `activeIndex` via
  //      onNavigate en el initial focus (solo en navegación subsiguiente).
  //      Por tanto el roving tabindex basado en activeIndex no se
  //      actualiza al primer focus.
  // El contrato observable APG (FUI llamó .focus() en el item correcto)
  // queda cubierto por el spy. Test e2e futuro verificaría el efecto
  // DOM real en browser.
  it("ArrowDown en trigger abre y FUI invoca .focus() en primer item", async () => {
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
    const focusSpy = vi.spyOn(HTMLElement.prototype, "focus");
    trigger.focus();
    focusSpy.mockClear();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await waitFor(
      () => {
        const focusedFirst = focusSpy.mock.contexts.some((el) => {
          const node = el as HTMLElement;
          return (
            node.getAttribute("role") === "menuitem" &&
            node.textContent === "Uno"
          );
        });
        expect(focusedFirst).toBe(true);
      },
      { timeout: 1500 },
    );
    focusSpy.mockRestore();
  });

  it("ArrowUp en trigger abre y FUI invoca .focus() en último item", async () => {
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
    const focusSpy = vi.spyOn(HTMLElement.prototype, "focus");
    trigger.focus();
    focusSpy.mockClear();
    fireEvent.keyDown(trigger, { key: "ArrowUp" });
    await waitFor(
      () => {
        const focusedLast = focusSpy.mock.contexts.some((el) => {
          const node = el as HTMLElement;
          return (
            node.getAttribute("role") === "menuitem" &&
            node.textContent === "Dos"
          );
        });
        expect(focusedLast).toBe(true);
      },
      { timeout: 1500 },
    );
    focusSpy.mockRestore();
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

  it("ArrowDown desde trigger salta primer item con aria-disabled (anchor)", async () => {
    // Regresión: trigger usaba selector más laxo que items y enfocaba el
    // primer <a aria-disabled="true">. C-03 (RC1) delega a FUI
    // useListNavigation, que respeta aria-disabled via `disabledIndices`
    // o el aria-disabled del DOM (configurado automáticamente).
    // Verificación vía spy .focus() (T-108).
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
    const focusSpy = vi.spyOn(HTMLElement.prototype, "focus");
    trigger.focus();
    focusSpy.mockClear();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    await waitFor(
      () => {
        const focusedActive = focusSpy.mock.contexts.some((el) => {
          const node = el as HTMLElement;
          return (
            node.getAttribute("role") === "menuitem" &&
            node.textContent === "Activo"
          );
        });
        expect(focusedActive).toBe(true);
      },
      { timeout: 1500 },
    );
    // Bloqueado NO debe haber recibido .focus() (FUI lo salta).
    const focusedBlocked = focusSpy.mock.contexts.some((el) => {
      const node = el as HTMLElement;
      return (
        node.getAttribute("role") === "menuitem" &&
        node.textContent === "Bloqueado"
      );
    });
    expect(focusedBlocked).toBe(false);
    focusSpy.mockRestore();
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

  it("desmontar mientras está abierto limpia listeners globales (pointerdown/keydown)", () => {
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
    // C-03 (RC1): FUI useDismiss usa `pointerdown` (no `mousedown`)
    // y `keydown` para Escape. Cobertura cleanup verificada con ambos.
    const addedTypes = addSpy.mock.calls.map((c) => c[0]);
    expect(addedTypes).toContain("pointerdown");
    expect(addedTypes).toContain("keydown");
    addSpy.mockClear();
    removeSpy.mockClear();
    unmount();
    const removedTypes = removeSpy.mock.calls.map((c) => c[0]);
    expect(removedTypes).toContain("pointerdown");
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

describe("Menu — codex post-D2 fixes", () => {
  it("P1: container prop ancla el portal a un root distinto de document.body", () => {
    function Harness({ children }: { children: ReactNode }) {
      const ref = useRef<HTMLDivElement>(null);
      return (
        <>
          <div ref={ref} data-testid="custom-portal-root" />
          <Menu defaultOpen>
            <MenuTrigger>x</MenuTrigger>
            <MenuContent container={ref}>{children}</MenuContent>
          </Menu>
        </>
      );
    }
    render(<Harness><MenuItem>Editar</MenuItem></Harness>);
    const customRoot = screen.getByTestId("custom-portal-root");
    const menu = screen.getByRole("menu");
    // El menu debe ser descendant del custom root, no de document.body.
    expect(customRoot.contains(menu)).toBe(true);
    // Y NO debe estar como child directo de document.body (el portal
    // default lo pondría como direct child de body).
    expect(menu.parentElement).not.toBe(document.body);
  });

  it("P2: consumer style merge con floatingStyles (custom width sobrevive)", () => {
    render(
      <Menu defaultOpen>
        <MenuTrigger>x</MenuTrigger>
        <MenuContent style={{ width: "300px", maxHeight: "400px" }}>
          <MenuItem>Editar</MenuItem>
        </MenuContent>
      </Menu>,
    );
    const menu = screen.getByRole("menu");
    // Consumer styles preservados.
    expect(menu).toHaveStyle({ width: "300px", maxHeight: "400px" });
    // FUI positioning también presente (top/left/position via floatingStyles
    // inline). En jsdom no podemos asertar valor exacto (no layout), pero la
    // presencia del attribute style con position confirma que floatingStyles
    // se mergeó sobre el consumer style.
    expect(menu.getAttribute("style") ?? "").toMatch(/position/);
  });
});

describe("MenuTrigger — asChild Slot pattern (D14 Bloque D beta.27)", () => {
  it("default render aplica ig-menu-trigger + tipo button (backwards-compat)", () => {
    render(
      <Menu>
        <MenuTrigger>Opciones</MenuTrigger>
        <MenuContent>
          <MenuItem>Uno</MenuItem>
        </MenuContent>
      </Menu>,
    );
    const btn = screen.getByRole("button", { name: "Opciones" });
    expect(btn).toHaveClass("ig-menu-trigger");
    expect(btn).toHaveAttribute("type", "button");
  });

  it("asChild renderiza el child del consumer SIN aplicar ig-menu-trigger", () => {
    render(
      <Menu>
        <MenuTrigger asChild>
          <button data-testid="custom-trigger" className="ig-btn ig-btn-brand">
            Abrir menú
          </button>
        </MenuTrigger>
        <MenuContent>
          <MenuItem>Uno</MenuItem>
        </MenuContent>
      </Menu>,
    );
    const btn = screen.getByTestId("custom-trigger");
    expect(btn).toHaveClass("ig-btn");
    expect(btn).toHaveClass("ig-btn-brand");
    // asChild: no aplicamos ig-menu-trigger porque el consumer trae styling.
    expect(btn).not.toHaveClass("ig-menu-trigger");
  });

  it("asChild propaga aria-haspopup, aria-expanded, aria-controls + id al child", () => {
    render(
      <Menu defaultOpen>
        <MenuTrigger asChild>
          <button data-testid="custom-trigger">x</button>
        </MenuTrigger>
        <MenuContent>
          <MenuItem>Uno</MenuItem>
        </MenuContent>
      </Menu>,
    );
    const btn = screen.getByTestId("custom-trigger");
    // ARIA inyectada por FUI useRole + el id propio del MenuTrigger.
    expect(btn).toHaveAttribute("aria-haspopup");
    expect(btn).toHaveAttribute("aria-expanded", "true");
    expect(btn).toHaveAttribute("aria-controls");
    expect(btn).toHaveAttribute("id");
  });

  it("asChild + click abre el menú (FUI handlers propagados al child)", async () => {
    render(
      <Menu>
        <MenuTrigger asChild>
          <button data-testid="custom-trigger">Opciones</button>
        </MenuTrigger>
        <MenuContent>
          <MenuItem>Uno</MenuItem>
        </MenuContent>
      </Menu>,
    );
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("custom-trigger"));
    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });
  });

  it("asChild + onClick consumer chaina con FUI (consumer first)", async () => {
    const consumerClick = vi.fn();
    render(
      <Menu>
        <MenuTrigger asChild>
          <button data-testid="custom-trigger" onClick={consumerClick}>
            Opciones
          </button>
        </MenuTrigger>
        <MenuContent>
          <MenuItem>Uno</MenuItem>
        </MenuContent>
      </Menu>,
    );
    fireEvent.click(screen.getByTestId("custom-trigger"));
    expect(consumerClick).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });
  });

  it("asChild fuerza triggerId sobre child id propio (codex P2 round 1 sobre #113)", () => {
    // MenuContent referencia triggerId via aria-labelledby. Si Slot's
    // default child-wins rule dejara ganar al id del consumer (ej.
    // <button id='my-custom-id'>), aria-labelledby quedaría apuntando
    // a un id desconocido → menú sin accessible label.
    //
    // Fix: pre-clonar el child con `id: triggerId` ANTES del Slot, así
    // child.props.id = triggerId siempre, sin importar lo que el
    // consumer pusiera. Comportamiento consistente con path default
    // (`<button id={triggerId}>` también overwriteaba en pre-D14).
    render(
      <Menu defaultOpen>
        <MenuTrigger asChild>
          <button data-testid="custom-trigger" id="my-custom-id">
            Opciones
          </button>
        </MenuTrigger>
        <MenuContent>
          <MenuItem>Uno</MenuItem>
        </MenuContent>
      </Menu>,
    );
    const trigger = screen.getByTestId("custom-trigger");
    // El id del consumer DEBE haber sido sobrescrito por triggerId
    // (no es "my-custom-id").
    expect(trigger.getAttribute("id")).not.toBe("my-custom-id");
    // El triggerId del MenuContext debe estar presente y ser el id real
    // del trigger — verificamos que aria-labelledby del menu apunta
    // efectivamente a ESTE elemento.
    const menu = screen.getByRole("menu");
    const labelledBy = menu.getAttribute("aria-labelledby");
    expect(labelledBy).toBe(trigger.getAttribute("id"));
    expect(labelledBy).toBeTruthy();
  });

  it("asChild forwardea type al child (default 'button' contra submit accidental)", () => {
    render(
      <Menu>
        <MenuTrigger asChild>
          <button data-testid="custom-trigger">x</button>
        </MenuTrigger>
        <MenuContent>
          <MenuItem>Uno</MenuItem>
        </MenuContent>
      </Menu>,
    );
    expect(screen.getByTestId("custom-trigger")).toHaveAttribute(
      "type",
      "button",
    );
  });
});
