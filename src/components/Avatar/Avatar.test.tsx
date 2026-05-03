import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar } from "./Avatar";
import { AvatarGroup } from "./AvatarGroup";

describe("Avatar", () => {
  it("renderiza img cuando se pasa src", () => {
    render(<Avatar src="/user.png" alt="Jane Doe" />);
    const img = screen.getByAltText("Jane Doe");
    expect(img.tagName).toBe("IMG");
    expect(img).toHaveAttribute("src", "/user.png");
  });

  it("renderiza iniciales cuando se pasan", () => {
    render(<Avatar initials="JD" />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  describe.each(["xs", "sm", "lg", "xl"] as const)("size=%s", (s) => {
    it(`aplica clase ig-avatar-${s}`, () => {
      render(<Avatar initials="X" size={s} data-testid="a" />);
      expect(screen.getByTestId("a")).toHaveClass(`ig-avatar-${s}`);
    });
  });

  it("rounded añade ig-avatar-rounded", () => {
    render(<Avatar initials="X" rounded data-testid="a" />);
    expect(screen.getByTestId("a")).toHaveClass("ig-avatar-rounded");
  });

  it("status muestra indicator con aria-label traducido", () => {
    render(<Avatar initials="X" status="online" />);
    expect(screen.getByLabelText("Estado: en línea")).toBeInTheDocument();
  });

  it("ariaLabel marca el contenedor como role=img", () => {
    render(<Avatar initials="JD" aria-label="Avatar de Jane" data-testid="a" />);
    const el = screen.getByTestId("a");
    expect(el).toHaveAttribute("role", "img");
    expect(el).toHaveAttribute("aria-label", "Avatar de Jane");
  });
});

describe("AvatarGroup", () => {
  it("renderiza un wrapper con `ig-avatar-group`", () => {
    render(
      <AvatarGroup data-testid="g">
        <Avatar initials="A" />
        <Avatar initials="B" />
      </AvatarGroup>,
    );
    expect(screen.getByTestId("g")).toHaveClass("ig-avatar-group");
  });
});
