import { describe, it, expect, vi } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconButton } from "./IconButton";

describe("IconButton", () => {
  it("renderiza un <button> con clases base + ig-btn-icon enforced", () => {
    render(<IconButton aria-label="Favorito">★</IconButton>);
    const btn = screen.getByRole("button", { name: "Favorito" });
    expect(btn).toHaveClass("ig-btn", "ig-btn-brand", "ig-btn-icon");
  });

  it("aria-label se aplica al elemento", () => {
    render(<IconButton aria-label="Cerrar diálogo">×</IconButton>);
    expect(
      screen.getByRole("button", { name: "Cerrar diálogo" }),
    ).toBeInTheDocument();
  });

  it("hereda variant del Button base", () => {
    render(
      <IconButton aria-label="Eliminar" variant="danger">
        🗑
      </IconButton>,
    );
    const btn = screen.getByRole("button", { name: "Eliminar" });
    expect(btn).toHaveClass("ig-btn-danger", "ig-btn-icon");
  });

  it("hereda appearance del Button base", () => {
    render(
      <IconButton aria-label="Editar" appearance="ghost" variant="info">
        ✎
      </IconButton>,
    );
    const btn = screen.getByRole("button", { name: "Editar" });
    expect(btn).toHaveClass("ig-btn-ghost-info", "ig-btn-icon");
  });

  it("hereda size del Button base", () => {
    render(
      <IconButton aria-label="Bookmark" size="sm">
        ★
      </IconButton>,
    );
    expect(screen.getByRole("button")).toHaveClass("ig-btn-sm");
  });

  it("loading bloquea click + aria-busy", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Guardar" loading onClick={onClick}>
        💾
      </IconButton>,
    );
    const btn = screen.getByRole("button", { name: "Guardar" });
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("forwarda ref al <button> subyacente", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <IconButton aria-label="x" ref={ref}>
        x
      </IconButton>,
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("onClick se dispara con click normal", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Acción" onClick={onClick}>
        ⚡
      </IconButton>,
    );
    await user.click(screen.getByRole("button", { name: "Acción" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
