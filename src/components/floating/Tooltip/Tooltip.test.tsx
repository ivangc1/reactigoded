import { describe, it, expect, vi } from "vitest";
import { createRef, forwardRef, useEffect, useState, type ReactNode, type Ref } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  FloatingNode,
  useDismiss,
  useFloating,
  useFloatingNodeId,
} from "@floating-ui/react";
import { Tooltip } from "./Tooltip";
import { FloatingTreeRoot } from "../primitives/FloatingTreeRoot";

describe("Tooltip — Floating UI (post-RC1)", () => {
  it("renderiza el child y el span SR-only role=tooltip persistente", () => {
    render(
      <Tooltip text="Eliminar">
        <button>×</button>
      </Tooltip>,
    );
    expect(screen.getByRole("button", { name: /×/i })).toBeInTheDocument();
    // El span SR-only siempre está presente (incluso sin hover) para
    // que aria-describedby tenga referente válido al cargar.
    const sr = screen.getByText("Eliminar");
    expect(sr).toHaveClass("ig-sr-only");
  });

  it("conecta child con el span SR-only via aria-describedby", () => {
    render(
      <Tooltip text="Pista">
        <button>x</button>
      </Tooltip>,
    );
    const btn = screen.getByRole("button");
    const describedBy = btn.getAttribute("aria-describedby") ?? "";
    expect(describedBy).toBeTruthy();
    // El span SR-only tiene ese id.
    const sr = document.getElementById(describedBy);
    expect(sr).toHaveTextContent("Pista");
  });

  it("aria-describedby concatena con el del child existente (no sobreescribe)", () => {
    render(
      <Tooltip text="Tip">
        <button aria-describedby="existing-id">x</button>
      </Tooltip>,
    );
    const btn = screen.getByRole("button");
    const value = btn.getAttribute("aria-describedby") ?? "";
    expect(value.startsWith("existing-id ")).toBe(true);
  });

  it("aria-describedby único cuando el child no tenía uno", () => {
    render(
      <Tooltip text="Tip">
        <button>x</button>
      </Tooltip>,
    );
    const btn = screen.getByRole("button");
    const value = btn.getAttribute("aria-describedby") ?? "";
    expect(value).not.toContain(" ");
    expect(value).toBeTruthy();
  });

  it("portal NO monta el tooltip flotante por defecto (cerrado)", () => {
    render(
      <Tooltip text="Eliminar">
        <button>×</button>
      </Tooltip>,
    );
    // El portal con clase ig-tooltip-place-X NO está montado al inicio.
    expect(document.querySelector(".ig-tooltip-place-top")).toBeNull();
  });

  it("portal monta el tooltip flotante al hover (open=true)", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip text="Eliminar">
        <button>×</button>
      </Tooltip>,
    );
    const btn = screen.getByRole("button");
    await user.hover(btn);
    // Tras hover, el portal monta con clase de placement.
    const portal = document.querySelector(".ig-tooltip-place-top");
    expect(portal).not.toBeNull();
    expect(portal).toHaveTextContent("Eliminar");
  });

  it("portal monta al focus (keyboard)", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip text="Eliminar">
        <button>×</button>
      </Tooltip>,
    );
    await user.tab();
    expect(screen.getByRole("button")).toHaveFocus();
    const portal = document.querySelector(".ig-tooltip-place-top");
    expect(portal).not.toBeNull();
  });

  it("portal se desmonta al unhover", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Tooltip text="Eliminar">
          <button>×</button>
        </Tooltip>
        <button>otro</button>
      </div>,
    );
    const btn = screen.getByRole("button", { name: /×/i });
    await user.hover(btn);
    expect(document.querySelector(".ig-tooltip-place-top")).not.toBeNull();
    await user.unhover(btn);
    expect(document.querySelector(".ig-tooltip-place-top")).toBeNull();
  });

  // M-04 (RC1): los 12 placements de Floating UI (4 sides × 3 alignments).
  describe.each([
    "top",
    "top-start",
    "top-end",
    "right",
    "right-start",
    "right-end",
    "bottom",
    "bottom-start",
    "bottom-end",
    "left",
    "left-start",
    "left-end",
  ] as const)("placement=%s", (p) => {
    it(`portal aplica clase ig-tooltip-place-${p} al abrir`, async () => {
      const user = userEvent.setup();
      render(
        <Tooltip text="x" placement={p}>
          <button>x</button>
        </Tooltip>,
      );
      await user.hover(screen.getByRole("button"));
      expect(
        document.querySelector(`.ig-tooltip-place-${p}`),
      ).not.toBeNull();
    });
  });

  describe.each([
    ["brand"],
    ["secondary"],
    ["success"],
    ["warning"],
    ["danger"],
    ["info"],
  ] as const)("variant=%s", (v) => {
    it(`portal aplica clase ig-tooltip-color-${v} al abrir`, async () => {
      const user = userEvent.setup();
      render(
        <Tooltip text="x" variant={v}>
          <button>x</button>
        </Tooltip>,
      );
      await user.hover(screen.getByRole("button"));
      expect(
        document.querySelector(`.ig-tooltip-color-${v}`),
      ).not.toBeNull();
    });
  });

  // D-01 / M-05 (RC1): Slot pattern. El Tooltip ya no renderiza un
  // wrapper `<span class="ig-tooltip-wrapper">` propio — devuelve el
  // child clonado + un sr-only span sibling + el portal. El test
  // anterior verificaba ese wrapper; ahora verificamos que NO existe.
  it("Slot pattern: no renderiza wrapper span sobre el child (D-01/M-05)", () => {
    render(
      <div data-testid="parent">
        <Tooltip text="x">
          <button data-testid="anchor">x</button>
        </Tooltip>
      </div>,
    );
    const parent = screen.getByTestId("parent");
    const anchor = screen.getByTestId("anchor");
    // El child es hijo directo del padre del Tooltip (no de un wrapper
    // intermedio inyectado por el DS).
    expect(anchor.parentElement).toBe(parent);
    // No hay ningún elemento con la clase legacy.
    expect(parent.querySelector(".ig-tooltip-wrapper")).toBeNull();
  });

  it("Escape cierra el tooltip abierto", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip text="Eliminar">
        <button>×</button>
      </Tooltip>,
    );
    await user.hover(screen.getByRole("button"));
    expect(document.querySelector(".ig-tooltip-place-top")).not.toBeNull();
    await user.keyboard("{Escape}");
    expect(document.querySelector(".ig-tooltip-place-top")).toBeNull();
  });

  // L-01: tooltip hover/focus-only no debe cerrar al hacer pointerdown
  // fuera (outsidePress=false). FUI por defecto monta un listener global
  // de pointerdown sobre el document; con outsidePress=false ese listener
  // no se monta y el tooltip persiste mientras el trigger sigue activo.
  it("pointerdown fuera NO cierra el tooltip mientras hover/focus persiste (L-01)", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Tooltip text="Eliminar">
          <button>×</button>
        </Tooltip>
        <div data-testid="outside" style={{ width: 100, height: 100 }}>
          fuera
        </div>
      </div>,
    );
    await user.tab();
    expect(screen.getByRole("button")).toHaveFocus();
    expect(document.querySelector(".ig-tooltip-place-top")).not.toBeNull();
    // fireEvent (no userEvent.pointer) para disparar pointerdown SIN mover
    // el mouse físicamente y sin tocar el focus del button. Con
    // outsidePress=true, FUI capturaría este pointerdown global y cerraría
    // el tooltip; con outsidePress=false el tooltip persiste.
    fireEvent.pointerDown(screen.getByTestId("outside"));
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.getByRole("button")).toHaveFocus();
    expect(document.querySelector(".ig-tooltip-place-top")).not.toBeNull();
  });

  // Anti-regresión: codex review post-RC1 marcó P1 — el cloneElement
  // sobreescribía el ref y handlers del child. Verificamos que tras
  // el fix con useMergeRefs + getReferenceProps(typed.props) ambos se
  // preservan.
  it("preserva el ref del child (P1 codex review)", () => {
    const childRef = createRef<HTMLButtonElement>();
    render(
      <Tooltip text="Eliminar">
        <button ref={childRef}>×</button>
      </Tooltip>,
    );
    // El ref del consumer sigue apuntando al button real.
    expect(childRef.current).toBeInstanceOf(HTMLButtonElement);
    expect(childRef.current?.tagName).toBe("BUTTON");
  });

  it("preserva onMouseEnter / onFocus del child (P1 codex review)", async () => {
    const user = userEvent.setup();
    const onMouseEnter = vi.fn();
    const onFocus = vi.fn();
    render(
      <Tooltip text="Eliminar">
        <button onMouseEnter={onMouseEnter} onFocus={onFocus}>
          ×
        </button>
      </Tooltip>,
    );
    const btn = screen.getByRole("button");
    await user.hover(btn);
    expect(onMouseEnter).toHaveBeenCalled();
    btn.focus();
    expect(onFocus).toHaveBeenCalled();
  });

  // H-04 (gate review): Tooltip-en-Dialog queda invisible si el portal
  // se monta en body (default) porque el dialog top-layer queda
  // encima. La prop `container` permite anclar el portal a otro nodo.
  describe("container prop (H-04)", () => {
    it("monta el portal dentro del HTMLElement pasado como container", async () => {
      const user = userEvent.setup();
      const customRoot = document.createElement("div");
      customRoot.id = "custom-tooltip-root";
      document.body.appendChild(customRoot);

      render(
        <Tooltip text="ayuda" container={customRoot}>
          <button>X</button>
        </Tooltip>,
      );
      await user.hover(screen.getByRole("button", { name: "X" }));
      // El portal flotante (.ig-tooltip) debe vivir DENTRO de customRoot,
      // no en document.body directamente.
      const portal = customRoot.querySelector(".ig-tooltip");
      expect(portal).not.toBeNull();
      expect(customRoot.contains(portal)).toBe(true);

      document.body.removeChild(customRoot);
    });

    it("sin container, el portal va a body (comportamiento anterior intacto)", async () => {
      const user = userEvent.setup();
      render(
        <Tooltip text="ayuda">
          <button>X</button>
        </Tooltip>,
      );
      await user.hover(screen.getByRole("button", { name: "X" }));
      const portal = document.querySelector(".ig-tooltip");
      expect(portal).not.toBeNull();
      // El portal cuelga del body (default de FloatingPortal).
      expect(document.body.contains(portal)).toBe(true);
    });
  });

  // L-02 (gate review): dev warn cuando `text` es empty/whitespace.
  describe("L-02 — text empty dev warn", () => {
    it("warn en dev cuando text=\"\"", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(
        <Tooltip text="">
          <button>x</button>
        </Tooltip>,
      );
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("vacío o es solo whitespace"),
      );
      warn.mockRestore();
    });

    it("warn en dev cuando text es solo whitespace", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(
        <Tooltip text="   ">
          <button>x</button>
        </Tooltip>,
      );
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("vacío o es solo whitespace"),
      );
      warn.mockRestore();
    });

    it("NO warn cuando text es válido", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(
        <Tooltip text="Tooltip válido">
          <button>x</button>
        </Tooltip>,
      );
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  // C-01 (gate review): text amplió a `string | ReactNode` para alinear
  // con Popover/HoverCard futuros que usan content: ReactNode.
  describe("C-01 — text como ReactNode", () => {
    it("acepta ReactNode con formatting (string subset sigue funcionando)", () => {
      const { container } = render(
        <Tooltip
          text={
            <>
              <strong>Bold</strong> + texto plain
            </>
          }
        >
          <button>x</button>
        </Tooltip>,
      );
      // Codex P1 post-audit sobre PR #52: sr-only ahora extrae texto
      // plano via extractText() — el <strong> no aparece en sr-only,
      // pero sí su texto concatenado en el textContent. El portal
      // flotante sí renderiza el ReactNode rico (siguiente test).
      const sr = container.querySelector('.ig-sr-only[role="tooltip"]');
      expect(sr).not.toBeNull();
      expect(sr?.querySelector("strong")).toBeNull();
      expect(sr?.textContent).toBe("Bold + texto plain");
    });

    it("portal flotante muestra el ReactNode al hover", async () => {
      const user = userEvent.setup();
      render(
        <Tooltip
          text={
            <span data-testid="rich-content">
              <strong>Rich</strong> tooltip
            </span>
          }
        >
          <button>x</button>
        </Tooltip>,
      );
      await user.hover(screen.getByRole("button"));
      // El portal contiene el mismo ReactNode (el SR-only span también
      // lo tiene; usamos el data-testid para asegurar que se duplica
      // correctamente en ambos sitios).
      const matches = document.querySelectorAll('[data-testid="rich-content"]');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it("data-tooltip-content NO se setea cuando text NO es string", async () => {
      // Para text string, el atributo es útil (debugging, e2e selectors).
      // Para ReactNode arbitrario sería '[object Object]' — inútil.
      const user = userEvent.setup();
      render(
        <Tooltip text={<em>rich</em>}>
          <button>x</button>
        </Tooltip>,
      );
      await user.hover(screen.getByRole("button"));
      const portal = document.querySelector(".ig-tooltip-place-top");
      expect(portal).not.toBeNull();
      expect(portal?.hasAttribute("data-tooltip-content")).toBe(false);
    });

    it("data-tooltip-content SÍ se setea cuando text es string (regresión)", async () => {
      const user = userEvent.setup();
      render(
        <Tooltip text="hola">
          <button>x</button>
        </Tooltip>,
      );
      await user.hover(screen.getByRole("button"));
      const portal = document.querySelector(".ig-tooltip-place-top");
      expect(portal?.getAttribute("data-tooltip-content")).toBe("hola");
    });

    // Codex P1 sobre #52 (C-01): el SR-only span persistente está
    // siempre montado, visually hidden pero NO removed from tab order.
    // Sin protección, un text={<button>X</button>} crearía focus
    // targets invisibles. `inert` en el span neutraliza interactividad
    // de descendants sin afectar a SR.
    //
    // happy-dom (test environment) no implementa `inert` para tab
    // navigation, así que verificamos el atributo directamente. La
    // spec HTML garantiza que en browsers reales (Chrome 102+, Firefox
    // 112+, Safari 15.5+) los descendants de un elemento inert no son
    // focuseables vía Tab ni programáticamente con .focus().
    // Codex P1 follow-up: el portal flotante TAMBIÉN lleva inert.
    // Tooltip es decoración visual por diseño (no interactivo). Si
    // text es ReactNode con `<button>`/`<a>`, los descendants del
    // portal serían tab targets visibles que rompen el flujo de
    // teclado del documento. Mismo razonamiento que el SR-only span.
    it("portal flotante también lleva inert al abrirse (codex P1 follow-up)", async () => {
      const user = userEvent.setup();
      render(
        <Tooltip
          text={
            <button data-testid="trap-en-portal">trap</button>
          }
        >
          <button>x</button>
        </Tooltip>,
      );
      await user.hover(screen.getByRole("button", { name: "x" }));
      const portal = document.querySelector(".ig-tooltip-place-top");
      expect(portal).not.toBeNull();
      expect(portal?.hasAttribute("inert")).toBe(true);
      // El button trap existe en el portal pero está neutralizado.
      expect(
        portal?.querySelector('[data-testid="trap-en-portal"]'),
      ).not.toBeNull();
    });

    it("SR-only contiene texto plano extraído de ReactNode (codex P1 post-audit)", () => {
      // Codex P1 post-audit sobre PR #52 + neutralización ReactNode
      // (codex P1 original sobre #52): el sr-only solo renderiza
      // texto plano via extractText(). Sin focusables dentro → no
      // se necesita `inert`. aria-describedby resuelve a string puro.
      const { container } = render(
        <Tooltip text={<button data-testid="trap">trap</button>}>
          <button>x</button>
        </Tooltip>,
      );
      const sr = container.querySelector('.ig-sr-only[role="tooltip"]');
      expect(sr).not.toBeNull();
      // El button del ReactNode NO existe en el sr-only — extractText
      // recorrió el árbol y descartó el elemento, quedándose con su
      // children text.
      expect(sr?.querySelector("button")).toBeNull();
      expect(sr?.textContent).toBe("trap");
      // Sin inert porque ya no hay nada que neutralizar.
      expect(sr?.hasAttribute("inert")).toBe(false);
    });

    it("SR-only con text string sigue funcionando idéntico", () => {
      const { container } = render(
        <Tooltip text="hint">
          <button>x</button>
        </Tooltip>,
      );
      expect(
        container.querySelector('.ig-sr-only[role="tooltip"]')?.textContent,
      ).toBe("hint");
    });

    it("extractText recorre fragmentos, arrays y elementos anidados", () => {
      const { container } = render(
        <Tooltip text={<>Press <kbd>Enter</kbd> or <kbd>Space</kbd></>}>
          <button>x</button>
        </Tooltip>,
      );
      expect(
        container.querySelector('.ig-sr-only[role="tooltip"]')?.textContent,
      ).toBe("Press Enter or Space");
    });

    // Codex P2 round 2 sobre PR #89: el wrapper de arrays debe usar
    // `join("")` (no `join(" ")`). JSX ya preserva los espacios en
    // los strings literales adyacentes a elementos; inyectar `" "`
    // rompe casos legítimos donde el consumer concatena tokens que
    // deben quedar contiguos (versiones, emails, números formateados).
    it("preserva adjacencia de tokens (no inyecta espacios espurios)", () => {
      const { container } = render(
        <Tooltip text={<>Version <code>v1</code>.<code>2</code></>}>
          <button>x</button>
        </Tooltip>,
      );
      // Esperado: "Version v1.2" — el "." NO debe separarse del "1" o
      // "2" con espacios. JSX serializa esto como
      // ["Version ", <code>"v1"</code>, ".", <code>"2"</code>] y
      // extractText emite "Version " + "v1" + "." + "2" = "Version v1.2".
      expect(
        container.querySelector('.ig-sr-only[role="tooltip"]')?.textContent,
      ).toBe("Version v1.2");
    });

    it("L-02 dev warn NO se dispara con ReactNode no-string (false positive guard)", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(
        // Un fragment vacío técnicamente es "vacío" pero NO es string.
        // El warn de L-02 solo aplica al caso string explícito.
        <Tooltip text={<></>}>
          <button>x</button>
        </Tooltip>,
      );
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  // H-01 / B-03 (RC1): cascade dismiss vía FloatingTreeRoot. El
  // Tooltip se registra como nodo del FloatingTree (`useFloatingNode`
  // → `useFloatingNodeId`) y el portal se envuelve en `<FloatingNode>`.
  describe("H-01 / B-03 — FloatingTreeRoot integration", () => {
    it("funciona stand-alone sin FloatingTreeRoot (no rompe)", async () => {
      const user = userEvent.setup();
      render(
        <Tooltip text="solo">
          <button>btn</button>
        </Tooltip>,
      );
      await user.hover(screen.getByRole("button"));
      expect(document.querySelector(".ig-tooltip-place-top")).not.toBeNull();
      await user.keyboard("{Escape}");
      expect(document.querySelector(".ig-tooltip-place-top")).toBeNull();
    });

    it("funciona dentro de FloatingTreeRoot (cierra con Escape)", async () => {
      const user = userEvent.setup();
      render(
        <FloatingTreeRoot>
          <Tooltip text="con tree">
            <button>btn</button>
          </Tooltip>
        </FloatingTreeRoot>,
      );
      await user.hover(screen.getByRole("button"));
      expect(document.querySelector(".ig-tooltip-place-top")).not.toBeNull();
      await user.keyboard("{Escape}");
      expect(document.querySelector(".ig-tooltip-place-top")).toBeNull();
    });

    it("aria-describedby sigue conectando al sr-only span dentro de tree", () => {
      render(
        <FloatingTreeRoot>
          <Tooltip text="describelo">
            <button>btn</button>
          </Tooltip>
        </FloatingTreeRoot>,
      );
      const btn = screen.getByRole("button");
      const id = btn.getAttribute("aria-describedby") ?? "";
      expect(id).toBeTruthy();
      expect(document.getElementById(id)).toHaveTextContent("describelo");
    });

    // Codex P1 review (PR #62): el claim de cascade dismiss requiere
    // que `useDismiss` propague el evento por el tree. FUI lo controla
    // con `bubbles: { escapeKey: true }`. Sin la prop explícita el
    // bubble NO ocurre y la integración con FloatingTreeRoot no aporta
    // cascade. Este test monta un ancestor sintético (otro float con
    // `useFloating` + `useDismiss` registrado como FloatingNode padre
    // del Tooltip) y verifica que cuando se presiona Escape sobre el
    // Tooltip, el ancestor también recibe `onOpenChange(false)` en
    // cascada — comportamiento que rompería sin `bubbles.escapeKey`.
    it("Escape en Tooltip cierra ancestor floating en cascada (H-01)", async () => {
      const onAncestorClose = vi.fn();

      function SyntheticAncestor({ children }: { children: ReactNode }) {
        const [open, setOpen] = useState(true);
        const nodeId = useFloatingNodeId();
        const { context } = useFloating({
          // exactOptionalPropertyTypes: useFloatingNodeId() es
          // `string | undefined`; spread condicional para no pasar
          // undefined explícito (consistente con Tooltip.tsx).
          ...(nodeId !== undefined ? { nodeId } : {}),
          open,
          onOpenChange: (next) => {
            setOpen(next);
            if (!next) onAncestorClose();
          },
        });
        useDismiss(context, {
          outsidePress: false,
          bubbles: { escapeKey: true },
        });
        // `nodeId` aquí está garantizado por estar dentro de
        // <FloatingTreeRoot>; non-null assertion para satisfacer
        // FloatingNode.id que requiere string.
        return <FloatingNode id={nodeId ?? ""}>{children}</FloatingNode>;
      }

      const user = userEvent.setup();
      render(
        <FloatingTreeRoot>
          <SyntheticAncestor>
            <Tooltip text="anidado">
              <button>btn</button>
            </Tooltip>
          </SyntheticAncestor>
        </FloatingTreeRoot>,
      );

      await user.hover(screen.getByRole("button"));
      expect(document.querySelector(".ig-tooltip-place-top")).not.toBeNull();
      await user.keyboard("{Escape}");
      // Tooltip se cierra.
      expect(document.querySelector(".ig-tooltip-place-top")).toBeNull();
      // Ancestor también se cerró en cascada (recibió bubble dismiss
      // por estar registrado como FloatingNode padre del Tooltip).
      expect(onAncestorClose).toHaveBeenCalled();
    });
  });

  // M-07.2 (RC1 gate review): detección de child que no forwardea ref
  // con approach de 4 capas (static analysis + probe sticky + sentinel
  // + safety net 2000ms). El discriminador ya no es "¿está el ref
  // conectado a los X ms?" sino "¿se ha conectado alguna vez?" (probe
  // sticky) y la evaluación se dispara al primer intent del usuario
  // (sentinel capture-phase) o, como fallback, a los 2s.
  describe("Tooltip dev-warn no-forwardRef — M-07.2 (4-layer)", () => {
    function hasM07Warn(warn: {
      mock: { calls: unknown[][] };
    }): boolean {
      // Matcher por prefix común — cubre los 3 variantes de mensaje
      // diferenciado (ref+handlers / solo ref / solo handlers).
      return warn.mock.calls.some(
        (c) =>
          typeof c[0] === "string" &&
          c[0].startsWith("[reactigoded] <Tooltip>:"),
      );
    }

    // Capa 3: sentinel capture-phase dispara evaluate() en el primer
    // hover. El probe nunca se setea (child no forwardea) → warn.
    it("custom no-forward + hover dispara warn por sentinel capture-phase", async () => {
      const user = userEvent.setup();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      function MyCustom({ children }: { children: ReactNode }) {
        return <div>{children}</div>;
      }
      render(<Tooltip text="hint"><MyCustom>X</MyCustom></Tooltip>);
      // Pre-hover: warn no disparado (no hay intent todavía).
      expect(hasM07Warn(warn)).toBe(false);
      // Hover → sentinel onMouseEnterCapture → evaluate() → warn.
      await user.hover(screen.getByText("X"));
      const m07Calls = warn.mock.calls.filter(
        (c) =>
          typeof c[0] === "string" && c[0].includes("no expone su nodo DOM"),
      );
      expect(m07Calls).toHaveLength(1);
      const msg = m07Calls[0]?.[0] as string;
      expect(msg).toMatch(/MyCustom/);
      expect(msg).toMatch(/forwardRef/);
      warn.mockRestore();
    });

    it("custom no-forward: aria-describedby sigue funcionando (sr-only persiste)", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      function MyCustom(props: { children: ReactNode; [k: string]: unknown }) {
        return <div data-testid="root" {...props} />;
      }
      render(<Tooltip text="hint"><MyCustom>X</MyCustom></Tooltip>);
      const root = screen.getByTestId("root");
      const id = root.getAttribute("aria-describedby");
      expect(id).toBeTruthy();
      const srOnly = id ? document.getElementById(id) : null;
      expect(srOnly).not.toBeNull();
      expect(srOnly).toHaveTextContent("hint");
      warn.mockRestore();
    });

    // Capa 1: static analysis dice guaranteed_ok (dom_intrinsic) →
    // ni safety net ni sentinel. Cero coste runtime, sin warn jamás.
    it("DOM intrinsic child (button): static analysis guaranteed_ok, sin warn", async () => {
      const user = userEvent.setup();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(
        <Tooltip text="hint">
          <button>X</button>
        </Tooltip>,
      );
      await user.hover(screen.getByText("X"));
      expect(hasM07Warn(warn)).toBe(false);
      warn.mockRestore();
    });

    // Capa 1: forwardRef wrapper también es guaranteed_ok via $$typeof.
    it("React.forwardRef wrapper: static analysis guaranteed_ok, sin warn", async () => {
      const user = userEvent.setup();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const MyForwarded = forwardRef<HTMLButtonElement, { children: ReactNode }>(
        function MyForwarded({ children }, ref) {
          return <button ref={ref}>{children}</button>;
        },
      );
      render(<Tooltip text="hint"><MyForwarded>X</MyForwarded></Tooltip>);
      await user.hover(screen.getByText("X"));
      expect(hasM07Warn(warn)).toBe(false);
      warn.mockRestore();
    });

    // Capa 2: React 19 ref-as-prop function — verdict ambiguous, pero
    // el probe sticky atrapa el ref en el primer mount. Hover dispara
    // evaluate() → probe ya es true → return early sin warn.
    it("React 19 ref-as-prop (ambiguous) + ref se conecta: probe sticky evita warn", async () => {
      const user = userEvent.setup();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      function MyAmbiguous({
        ref,
        children,
        ...rest
      }: {
        ref?: Ref<HTMLButtonElement>;
        children: ReactNode;
        [k: string]: unknown;
      }) {
        return (
          <button ref={ref} {...rest}>
            {children}
          </button>
        );
      }
      render(<Tooltip text="hint"><MyAmbiguous>X</MyAmbiguous></Tooltip>);
      await user.hover(screen.getByText("X"));
      expect(hasM07Warn(warn)).toBe(false);
      warn.mockRestore();
    });

    // Capa 2: child lazy que renderiza null primero y luego un button.
    // Pre-hover el probe ya se setea en el mount diferido. Hover no
    // dispara warn. No es necesario esperar al safety net.
    it("child lazy (null → button): probe sticky atrapa ref tardío, sin false positive", async () => {
      const user = userEvent.setup();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      function DelayedButton({
        ref,
        children,
        ...rest
      }: {
        ref?: Ref<HTMLButtonElement>;
        children: ReactNode;
        [k: string]: unknown;
      }) {
        const [show, setShow] = useState(false);
        useEffect(() => {
          queueMicrotask(() => {
            setShow(true);
          });
        }, []);
        if (!show) return null;
        return (
          <button ref={ref} {...rest}>
            {children}
          </button>
        );
      }
      render(<Tooltip text="hint"><DelayedButton>X</DelayedButton></Tooltip>);
      const btn = await screen.findByText("X");
      await user.hover(btn);
      // Flush microtask del sentinel evaluate antes de mockRestore,
      // si no la microtask fires en el siguiente test polucionando spy.
      await Promise.resolve();
      expect(hasM07Warn(warn)).toBe(false);
      warn.mockRestore();
    });

    // Capa 4: safety net 2000ms cubre "dev no interactúa". Sin hover,
    // el sentinel nunca dispara; el setTimeout sí.
    it("custom no-forward sin interacción: safety net 2000ms dispara warn", async () => {
      vi.useFakeTimers();
      try {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        function MyCustom({ children }: { children: ReactNode }) {
          return <div>{children}</div>;
        }
        render(<Tooltip text="hint"><MyCustom>X</MyCustom></Tooltip>);
        expect(hasM07Warn(warn)).toBe(false);
        await vi.advanceTimersByTimeAsync(2100);
        expect(hasM07Warn(warn)).toBe(true);
        warn.mockRestore();
      } finally {
        vi.useRealTimers();
      }
    });

    // Capa 1: DOM intrinsic NO programa el safety net.
    it("DOM intrinsic: no programa setTimeout safety net (guaranteed_ok)", async () => {
      vi.useFakeTimers();
      try {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        render(
          <Tooltip text="hint">
            <button>X</button>
          </Tooltip>,
        );
        await vi.advanceTimersByTimeAsync(3000);
        expect(hasM07Warn(warn)).toBe(false);
        warn.mockRestore();
      } finally {
        vi.useRealTimers();
      }
    });

    // Codex P2 sobre 934ba46: handler probe. Child forwardea ref pero
    // dropea `...rest` → handlers FUI no llegan al DOM → tooltip
    // queda inerte aunque el ref esté conectado. Pre-fix: probe
    // sticky decía "OK" y suprimía el warn. Post-fix: handler probe
    // independiente detecta el drop y warn diferenciado.
    it("child forwardea ref pero dropea ...rest: warn diferenciado handlers", async () => {
      const user = userEvent.setup();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      function RefOnly({
        ref,
        children,
      }: {
        ref?: Ref<HTMLButtonElement>;
        children: ReactNode;
      }) {
        return <button ref={ref}>{children}</button>;
      }
      render(<Tooltip text="hint"><RefOnly>X</RefOnly></Tooltip>);
      await user.hover(screen.getByText("X"));
      await Promise.resolve();
      const m07Calls = warn.mock.calls.filter(
        (c) =>
          typeof c[0] === "string" &&
          c[0].startsWith("[reactigoded] <Tooltip>:"),
      );
      expect(m07Calls).toHaveLength(1);
      const msg = m07Calls[0]?.[0] as string;
      expect(msg).toMatch(/RefOnly/);
      expect(msg).toMatch(/NO propaga handlers/);
      expect(msg).toMatch(/drop de `\.\.\.rest`/);
      warn.mockRestore();
    });

    // Codex P2 sobre 934ba46: probe Element validation. El check
    // `node instanceof Element || node.getBoundingClientRect` rechaza
    // imperative handles (objetos custom sin contrato de medición).
    // NOTA: testear este path end-to-end requiere `useImperativeHandle`
    // que rompe FUI internamente (FUI's refs.setReference rejects no-
    // Element causing infinite update loop). El check del probe queda
    // como defensa unitaria validable por inspección — el bug que
    // protege se manifiesta como FUI crash antes de llegar al warn.
    // Verificación indirecta: el filter del path "no se conectó" sigue
    // funcionando para los otros casos (ver tests Capa 4 + sentinel).
  });
});

describe("Tooltip — nested asChild forwarding (D14 Bloque C beta.27)", () => {
  it("outer Slot props (onClick) propagan al child final via Slot interno", async () => {
    // Reproduce el nested case del D14 edge #6 que motivó Bloque C:
    //   <Slot {...outerProps}>
    //     <Tooltip text="...">
    //       <Button onClick={consumer}>X</Button>
    //     </Tooltip>
    //   </Slot>
    //
    // Sin el refactor, Tooltip dropeaba los outerProps (TooltipProps no
    // aceptaba ...rest). Con el refactor, Tooltip's Slot interno
    // forwardea outerProps + cloneProps al Button final via cloneElement
    // chain. Resultado: el click en Button chaina consumer onClick →
    // outer onClick (Slot composeEventHandlers child-first).
    //
    // Aquí usamos `<Slot>` directamente como el outer wrapper (en uso
    // real sería `<DialogClose asChild>` etc.), pero el contrato es el
    // mismo: Tooltip forwardea cualquier prop no consumida por sí mismo.
    const user = userEvent.setup();
    const outerClick = vi.fn();
    const consumerClick = vi.fn();
    // Simulamos outer Slot props via record genérico (lo que un
    // `DialogClose asChild` pasaría al Tooltip clonado). TooltipProps
    // index signature acepta cualquier prop adicional.
    const outerSlotProps: Record<string, unknown> = { onClick: outerClick };
    render(
      <Tooltip text="Cancela y cierra" {...outerSlotProps}>
        <button data-testid="probe" onClick={consumerClick}>
          Aceptar
        </button>
      </Tooltip>,
    );
    await user.click(screen.getByTestId("probe"));
    // Child first (consumer), outer second (close handler simulado).
    // Ambos llamados → ambos se forwardearon al child final.
    expect(consumerClick).toHaveBeenCalledTimes(1);
    expect(outerClick).toHaveBeenCalledTimes(1);
  });

  it("outer Slot ref propaga al child final junto con FUI ref y child ref", () => {
    // Verifica que los 3 refs co-existen tras el Slot wrapping:
    //   - outer ref (simulando DialogClose ref).
    //   - FUI's refs.setReference (interno de Tooltip).
    //   - child.props.ref (consumer's ref).
    const outerRef = createRef<HTMLElement>();
    const consumerRef = createRef<HTMLButtonElement>();
    // Spread vía record genérico para evitar narrowing TS sobre `ref`
    // (TooltipProps usa index signature `[key: string]: unknown`).
    const outerSlotProps: Record<string, unknown> = { ref: outerRef };
    render(
      <Tooltip text="Pista" {...outerSlotProps}>
        <button data-testid="probe" ref={consumerRef}>
          x
        </button>
      </Tooltip>,
    );
    const node = screen.getByTestId("probe");
    expect(outerRef.current).toBe(node);
    expect(consumerRef.current).toBe(node);
    // FUI ref se valida indirectamente: si no estuviera conectado, el
    // tooltip no abriría al hover (probado por los tests de open/close
    // de las describe blocks anteriores).
  });

  it("Tooltip sin outer props no añade Slot wrapper redundante (skip optimization)", () => {
    // Hot-path: uso normal de Tooltip sin outer wrapper. El Slot interno
    // se omite cuando outerSlotProps está vacío. Test indirecto: verify
    // que el comportamiento estándar de Tooltip no se rompe + que un
    // attribute aria-describedby está presente (señal de que cloneElement
    // de Tooltip aplicó su lógica sin Slot intermedio).
    render(
      <Tooltip text="Pista">
        <button data-testid="probe">x</button>
      </Tooltip>,
    );
    expect(screen.getByTestId("probe")).toHaveAttribute("aria-describedby");
  });
});
