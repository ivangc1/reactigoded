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

  it("aplica variant y size cuando no es md", () => {
    render(
      <Chip variant="success" size="lg">
        OK
      </Chip>,
    );
    const el = screen.getByText("OK");
    expect(el).toHaveClass("ig-chip-success", "ig-chip-lg");
    expect(el).not.toHaveClass("ig-chip-md");
  });

  it("selectable=true renderiza un button con aria-pressed", () => {
    render(
      <Chip selectable selected>
        Tag
      </Chip>,
    );
    const btn = screen.getByRole("button", { name: "Tag" });
    expect(btn).toHaveClass("ig-chip-selectable", "ig-chip-selected");
    expect(btn).toHaveAttribute("aria-pressed", "true");
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
