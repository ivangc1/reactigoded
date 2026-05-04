import { describe, it, expect } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { Progress } from "./Progress";

describe("Progress", () => {
  it("renderiza role=progressbar con valuemin/max", () => {
    render(<Progress value={40} />);
    const el = screen.getByRole("progressbar");
    expect(el).toHaveAttribute("aria-valuemin", "0");
    expect(el).toHaveAttribute("aria-valuemax", "100");
    expect(el).toHaveAttribute("aria-valuenow", "40");
  });

  it("calcula porcentaje en width del bar interno", () => {
    render(<Progress value={25} data-testid="p" />);
    const bar = screen.getByTestId("p").firstChild as HTMLElement;
    expect(bar).toHaveClass("ig-progress-bar");
    expect(bar).toHaveStyle({width:"25%"});
  });

  it("respeta max custom", () => {
    render(<Progress value={5} max={10} data-testid="p" />);
    const el = screen.getByRole("progressbar");
    expect(el).toHaveAttribute("aria-valuemax", "10");
    expect(el).toHaveAttribute("aria-valuenow", "5");
    const bar = screen.getByTestId("p").firstChild as HTMLElement;
    expect(bar).toHaveStyle({width:"50%"});
  });

  it("clampa value fuera de rango", () => {
    render(<Progress value={150} data-testid="p" />);
    const el = screen.getByRole("progressbar");
    expect(el).toHaveAttribute("aria-valuenow", "100");
    const bar = screen.getByTestId("p").firstChild as HTMLElement;
    expect(bar).toHaveStyle({width:"100%"});
  });

  it("indeterminate omite aria-valuenow y aplica clase", () => {
    render(<Progress indeterminate data-testid="p" />);
    const el = screen.getByRole("progressbar");
    expect(el).not.toHaveAttribute("aria-valuenow");
    expect(el).toHaveClass("ig-progress-indeterminate");
    expect(el).toHaveAttribute("aria-label", "Cargando");
  });

  describe.each([
    ["brand"],
    ["secondary"],
    ["success"],
    ["warning"],
    ["danger"],
    ["info"],
  ] as const)("variant=%s", (v) => {
    it(`aplica clase ig-progress-${v}`, () => {
      render(<Progress value={50} variant={v} data-testid="p" />);
      expect(screen.getByTestId("p")).toHaveClass(`ig-progress-${v}`);
    });
  });

  describe.each(["sm", "lg"] as const)("size=%s", (s) => {
    it(`aplica clase ig-progress-${s}`, () => {
      render(<Progress value={50} size={s} data-testid="p" />);
      expect(screen.getByTestId("p")).toHaveClass(`ig-progress-${s}`);
    });
  });

  it("aria-label custom override", () => {
    render(<Progress value={30} aria-label="Subiendo archivo" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-label",
      "Subiendo archivo",
    );
  });

  it("forwarda ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Progress ref={ref} value={0} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  describe.each([
    ["max negativo", -5, 50, 100, 50],
    ["max=0", 0, 50, 100, 50],
    ["max=NaN", Number.NaN, 50, 100, 50],
    ["max=Infinity", Number.POSITIVE_INFINITY, 50, 100, 50],
    ["value=NaN", 100, Number.NaN, 100, 0],
    ["value=Infinity", 100, Number.POSITIVE_INFINITY, 100, 100],
  ] as const)("guard %s", (_label, max, value, expectedMax, expectedNow) => {
    it("cae a defaults seguros sin romper aria", () => {
      render(<Progress value={value} max={max} data-testid="p" />);
      const el = screen.getByRole("progressbar");
      expect(el).toHaveAttribute("aria-valuemax", String(expectedMax));
      expect(el).toHaveAttribute("aria-valuenow", String(expectedNow));
    });
  });
});

describe("Progress — AllStates regression", () => {
  const VARIANTS = [
    "brand",
    "secondary",
    "success",
    "warning",
    "danger",
    "info",
  ] as const;

  it("AllStates renderiza variants × valores", async () => {
    const { composeStory } = await import("@storybook/react");
    const stories = await import("./Progress.stories");
    const Story = composeStory(stories.AllStates, stories.default);
    const { container } = render(<Story />);
    for (const v of VARIANTS) {
      expect(container.querySelector(`.ig-progress-${v}`)).not.toBeNull();
    }
    expect(container.querySelector(".ig-progress-indeterminate")).not.toBeNull();
  });
});
