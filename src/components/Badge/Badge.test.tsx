import { describe, it, expect } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";

const VARIANTS = ["brand", "secondary", "success", "warning", "danger", "info"] as const;
const SIZES = ["sm", "lg"] as const;

describe("Badge", () => {
  it("renderiza un span con clase wrapper y default variant=brand", () => {
    render(<Badge>Nuevo</Badge>);
    const el = screen.getByText("Nuevo");
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveClass("ig-badge", "ig-badge-brand");
  });

  describe.each(VARIANTS)("variant=%s", (v) => {
    it(`aplica clase ig-badge-${v}`, () => {
      render(<Badge variant={v}>x</Badge>);
      expect(screen.getByText("x")).toHaveClass(`ig-badge-${v}`);
    });

    it(`outline=true reemplaza por ig-badge-outline-${v}`, () => {
      render(
        <Badge outline variant={v}>
          x
        </Badge>,
      );
      expect(screen.getByText("x")).toHaveClass(`ig-badge-outline-${v}`);
    });
  });

  describe.each(SIZES)("size=%s", (s) => {
    it(`aplica clase ig-badge-${s}`, () => {
      render(<Badge size={s}>x</Badge>);
      expect(screen.getByText("x")).toHaveClass(`ig-badge-${s}`);
    });
  });

  it("pill añade ig-badge-pill", () => {
    render(<Badge pill>P</Badge>);
    expect(screen.getByText("P")).toHaveClass("ig-badge-pill");
  });

  it("className del consumer se mergea sin pisar las del componente", () => {
    render(
      <Badge variant="brand" className="extra otra">
        x
      </Badge>,
    );
    const el = screen.getByText("x");
    expect(el).toHaveClass("ig-badge", "ig-badge-brand", "extra", "otra");
  });

  it("forwarda ref al span", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Badge ref={ref}>X</Badge>);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });
});

describe("Badge — AllStates regression", () => {
  const VARIANTS = [
    "brand",
    "secondary",
    "success",
    "warning",
    "danger",
    "info",
  ] as const;

  it("AllStates renderiza variants × outline × pill × dot", async () => {
    const { composeStory } = await import("@storybook/react");
    const stories = await import("./Badge.stories");
    const Story = composeStory(stories.AllStates, stories.default);
    const { container } = render(<Story />);
    for (const v of VARIANTS) {
      expect(container.querySelector(`.ig-badge-${v}`)).not.toBeNull();
      // Badge emite `ig-badge-outline-{variant}` directamente, no
      // `ig-badge-outline` suelta — la clase combina variant + estilo.
      expect(
        container.querySelector(`.ig-badge-outline-${v}`),
      ).not.toBeNull();
    }
    expect(container.querySelector(".ig-badge-pill")).not.toBeNull();
    expect(container.querySelector(".ig-badge-dot")).not.toBeNull();
  });
});
