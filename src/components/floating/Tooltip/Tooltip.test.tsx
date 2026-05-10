import { describe, it, expect, vi } from "vitest";
import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tooltip } from "./Tooltip";

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

  describe.each(["top", "right", "bottom", "left"] as const)(
    "placement=%s",
    (p) => {
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
    },
  );

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

  it("forwarda ref al wrapper span", () => {
    const ref = createRef<HTMLSpanElement>();
    render(
      <Tooltip text="x" ref={ref}>
        <button>x</button>
      </Tooltip>,
    );
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
    expect(ref.current).toHaveClass("ig-tooltip-wrapper");
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

  // H-04 (gate review): Tooltip-en-Modal queda invisible si el portal
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
});
