import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("renderiza con role=status y atributos a11y", () => {
    render(<Skeleton />);
    const el = screen.getByRole("status");
    expect(el).toHaveAttribute("aria-busy", "true");
    expect(el).toHaveAttribute("aria-live", "polite");
    expect(el).toHaveClass("ig-skeleton", "ig-skeleton-text");
  });

  it("aplica la clase de variant solicitada", () => {
    render(<Skeleton variant="avatar-lg" />);
    expect(screen.getByRole("status")).toHaveClass("ig-skeleton-avatar-lg");
  });

  it("permite style y className extra", () => {
    render(<Skeleton style={{ width: 200 }} className="extra" />);
    const el = screen.getByRole("status");
    expect(el).toHaveClass("extra");
    expect(el).toHaveStyle({ width: "200px" });
  });
});

describe("Skeleton — AllStates regression", () => {
  it("AllStates renderiza múltiples skeletons", async () => {
    const { composeStory } = await import("@storybook/react");
    const stories = await import("./Skeleton.stories");
    const Story = composeStory(stories.AllStates, stories.default);
    const { container } = render(<Story />);
    expect(container.querySelectorAll(".ig-skeleton").length).toBeGreaterThan(8);
  });
});
