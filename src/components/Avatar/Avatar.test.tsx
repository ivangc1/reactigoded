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

  it("añade clase de size y rounded", () => {
    render(<Avatar initials="X" size="xl" rounded data-testid="a" />);
    const el = screen.getByTestId("a");
    expect(el).toHaveClass("ig-avatar", "ig-avatar-xl", "ig-avatar-rounded");
  });

  it("muestra el indicator de status con aria-label traducido", () => {
    render(<Avatar initials="X" status="online" data-testid="a" />);
    const status = screen.getByLabelText("Estado: en línea");
    expect(status).toHaveClass("ig-avatar-status-online");
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
