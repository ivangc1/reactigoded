import { describe, it, expect } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { Tooltip } from "./Tooltip";

describe("Tooltip", () => {
  it("renderiza el child y el span role=tooltip sr-only", () => {
    render(
      <Tooltip text="Eliminar">
        <button>×</button>
      </Tooltip>,
    );
    expect(screen.getByRole("button", { name: /×/i })).toBeInTheDocument();
    const tt = screen.getByRole("tooltip", { hidden: true });
    expect(tt).toHaveTextContent("Eliminar");
    expect(tt).toHaveClass("ig-sr-only");
  });

  it("aplica data-tooltip en el wrapper para el CSS", () => {
    render(
      <Tooltip text="Hola" data-testid="w">
        <button>x</button>
      </Tooltip>,
    );
    expect(screen.getByTestId("w")).toHaveAttribute("data-tooltip", "Hola");
  });

  it("conecta child con tooltip via aria-describedby", () => {
    render(
      <Tooltip text="Pista">
        <button>x</button>
      </Tooltip>,
    );
    const btn = screen.getByRole("button");
    const tt = screen.getByRole("tooltip", { hidden: true });
    expect(btn).toHaveAttribute("aria-describedby", tt.id);
  });

  it("aplica clase de placement (top por defecto)", () => {
    render(
      <Tooltip text="x" data-testid="w">
        <button>x</button>
      </Tooltip>,
    );
    expect(screen.getByTestId("w")).toHaveClass(
      "ig-tooltip",
      "ig-tooltip-place-top",
    );
  });

  describe.each(["top", "right", "bottom", "left"] as const)(
    "placement=%s",
    (p) => {
      it(`aplica clase ig-tooltip-place-${p} (prefijo único pre-1.0.0)`, () => {
        render(
          <Tooltip text="x" placement={p} data-testid="w">
            <button>x</button>
          </Tooltip>,
        );
        expect(screen.getByTestId("w")).toHaveClass(`ig-tooltip-place-${p}`);
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
    it(`aplica clase ig-tooltip-color-${v} (prefijo único pre-1.0.0)`, () => {
      render(
        <Tooltip text="x" variant={v} data-testid="w">
          <button>x</button>
        </Tooltip>,
      );
      expect(screen.getByTestId("w")).toHaveClass(`ig-tooltip-color-${v}`);
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
    // Y termina con el id del span role=tooltip
    const tt = screen.getByRole("tooltip", { hidden: true });
    expect(value.endsWith(tt.id)).toBe(true);
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
});
