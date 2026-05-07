import { describe, it, expect } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
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
});
