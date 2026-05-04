import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Chip } from "./Chip";

describe("Chip", () => {
  it("renderiza un <span> con `ig-chip` por defecto", () => {
    render(<Chip>Tag</Chip>);
    const el = screen.getByText("Tag");
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveClass("ig-chip");
  });

  describe.each([
    ["brand"],
    ["secondary"],
    ["success"],
    ["warning"],
    ["danger"],
    ["info"],
  ] as const)("variant=%s", (v) => {
    it(`aplica clase ig-chip-${v}`, () => {
      render(<Chip variant={v}>x</Chip>);
      expect(screen.getByText("x")).toHaveClass(`ig-chip-${v}`);
    });
  });

  describe.each(["sm", "lg"] as const)("size=%s", (s) => {
    it(`aplica clase ig-chip-${s}`, () => {
      render(<Chip size={s}>x</Chip>);
      expect(screen.getByText("x")).toHaveClass(`ig-chip-${s}`);
    });
  });

  it("selectable + selected: renderiza button con aria-pressed=true", () => {
    render(
      <Chip selectable selected>
        Tag
      </Chip>,
    );
    const btn = screen.getByRole("button", { name: "Tag" });
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("selectable sin selected: aria-pressed=false", () => {
    render(<Chip selectable>Tag</Chip>);
    expect(screen.getByRole("button", { name: "Tag" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("onRemove dispara al click en la X y detiene propagación", async () => {
    const onRemove = vi.fn();
    const onClickParent = vi.fn();
    render(
      // El test verifica detención de propagación; el div no necesita
      // ser interactivo con teclado, solo un wrapper para el evento.
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions
      <div onClick={onClickParent}>
        <Chip selectable onRemove={onRemove}>
          Tag
        </Chip>
      </div>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(onRemove).toHaveBeenCalledOnce();
    expect(onClickParent).not.toHaveBeenCalled();
  });

  it("removeLabel personalizado", () => {
    render(
      <Chip onRemove={() => {}} removeLabel="Quitar tag">
        x
      </Chip>,
    );
    expect(
      screen.getByRole("button", { name: "Quitar tag" }),
    ).toBeInTheDocument();
  });
});

describe("Chip — AllStates regression", () => {
  const VARIANTS = [
    "brand",
    "secondary",
    "success",
    "warning",
    "danger",
    "info",
  ] as const;

  it("AllStates renderiza variants × sizes × removable", async () => {
    const { composeStory } = await import("@storybook/react");
    const stories = await import("./Chip.stories");
    const Story = composeStory(stories.AllStates, stories.default);
    const { container } = render(<Story />);
    for (const v of VARIANTS) {
      expect(container.querySelector(`.ig-chip-${v}`)).not.toBeNull();
    }
    expect(container.querySelector(".ig-chip-close")).not.toBeNull();
  });
});
