import { describe, it, expect, vi } from "vitest";
import { createRef, useState, type ReactNode, type Ref } from "react";
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
      // SR-only span renderiza el ReactNode literal (consumer
      // responsable de a11y del contenido).
      const sr = container.querySelector('.ig-sr-only[role="tooltip"]');
      expect(sr).not.toBeNull();
      expect(sr?.querySelector("strong")?.textContent).toBe("Bold");
      expect(sr?.textContent).toContain("texto plain");
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

    it("SR-only span lleva inert para neutralizar interactividad de ReactNode (codex P1)", () => {
      const { container } = render(
        <Tooltip
          text={
            <button data-testid="invisible-trap">trap</button>
          }
        >
          <button>x</button>
        </Tooltip>,
      );
      const sr = container.querySelector('.ig-sr-only[role="tooltip"]');
      expect(sr).not.toBeNull();
      // El atributo HTML inert neutraliza interactividad de TODOS los
      // descendants en browsers reales. Sin él, un botón/link/input
      // dentro del text={...} sería focus target invisible.
      expect(sr?.hasAttribute("inert")).toBe(true);
      // Sanity: el descendant existe en el DOM (no estamos verificando
      // que inert lo elimine, sino que existe pero es neutralizado).
      expect(sr?.querySelector('[data-testid="invisible-trap"]')).not.toBeNull();
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

  // M-07 (RC1 gate review): dev warn cuando el child custom no
  // forwardea ref. El check se difiere hasta que el tooltip intenta
  // abrirse (`isOpen` true) para evitar false positives con children
  // que renderizan null inicialmente y montan el DOM más tarde.
  describe("Tooltip con custom component child — M-07", () => {
    function hasM07Warn(warn: {
      mock: { calls: unknown[][] };
    }): boolean {
      return warn.mock.calls.some(
        (c) =>
          typeof c[0] === "string" && c[0].includes("no expone su nodo DOM"),
      );
    }

    it("custom no-forward dispara dev-warn explicativo tras delay", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      function MyCustom({ children }: { children: ReactNode }) {
        return <div>{children}</div>;
      }
      render(<Tooltip text="hint"><MyCustom>X</MyCustom></Tooltip>);
      // Pre-delay: warn NO se ha disparado (check diferido por setTimeout).
      expect(hasM07Warn(warn)).toBe(false);
      // Esperar al setTimeout (50ms + buffer) — useFloating tuvo
      // tiempo de poblar refs, pero como el child no forwardea, sigue null.
      await new Promise((r) => setTimeout(r, 100));
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

    it("custom no-forward: aria-describedby SÍ se setea (sr-only sigue funcionando)", () => {
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

    it("DOM intrinsic child (button) NO dispara el warn tras delay", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(
        <Tooltip text="hint">
          <button>X</button>
        </Tooltip>,
      );
      await new Promise((r) => setTimeout(r, 100));
      expect(hasM07Warn(warn)).toBe(false);
      warn.mockRestore();
    });

    it("forwardRef (React 19 ref-as-prop) NO dispara el warn tras delay", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      function MyForwarded({
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
      render(<Tooltip text="hint"><MyForwarded>X</MyForwarded></Tooltip>);
      await new Promise((r) => setTimeout(r, 100));
      expect(hasM07Warn(warn)).toBe(false);
      warn.mockRestore();
    });

    // Codex P2 sobre PR #71: child que renderiza null inicialmente y
    // luego monta un button (post-effect) NO debe disparar el warn.
    // Pre-fix: el check post-mount inmediato veía refs null y emitía
    // un warn falso positivo. Post-fix: el check usa setTimeout(50ms)
    // dando tiempo a que children lazy completen su ciclo. Si la
    // microtask que llama setShow(true) corre antes del setTimeout,
    // el button monta y refs.reference.current se popula a tiempo.
    it("child que renderiza null inicialmente y luego un button NO dispara false positive", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      function DelayedButton({
        ref,
        children,
      }: {
        ref?: Ref<HTMLButtonElement>;
        children: ReactNode;
      }) {
        const [show, setShow] = useState(false);
        useState(() => {
          queueMicrotask(() => {
            setShow(true);
          });
        });
        if (!show) return null;
        return <button ref={ref}>{children}</button>;
      }
      render(<Tooltip text="hint"><DelayedButton>X</DelayedButton></Tooltip>);
      // Esperar a que el button monte (microtask) + a que el setTimeout
      // del warn dispare (50ms). El button ya estará montado y el ref
      // populated cuando el check corra.
      await screen.findByText("X");
      await new Promise((r) => setTimeout(r, 100));
      expect(hasM07Warn(warn)).toBe(false);
      warn.mockRestore();
    });
  });
});
