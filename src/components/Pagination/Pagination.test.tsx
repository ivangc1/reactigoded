import { describe, it, expect, vi } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("renderiza nav con aria-label y todas las páginas si total <= 7", () => {
    render(
      <Pagination currentPage={3} totalPages={5} onPageChange={() => undefined} />,
    );
    expect(screen.getByRole("navigation", { name: "Paginación" })).toBeInTheDocument();
    [1, 2, 3, 4, 5].forEach((n) => {
      expect(
        screen.getByRole("button", { name: `Página ${String(n)}` }),
      ).toBeInTheDocument();
    });
  });

  it("marca la página activa con aria-current y clase activa", () => {
    render(
      <Pagination currentPage={2} totalPages={5} onPageChange={() => undefined} />,
    );
    const active = screen.getByRole("button", { name: "Página 2" });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active).toHaveClass("ig-pagination-active");
  });

  it("dispara onPageChange al pulsar otra página", async () => {
    const user = userEvent.setup();
    const fn = vi.fn();
    render(<Pagination currentPage={1} totalPages={5} onPageChange={fn} />);
    await user.click(screen.getByRole("button", { name: "Página 3" }));
    expect(fn).toHaveBeenCalledWith(3);
  });

  it("anterior deshabilitado en página 1, siguiente en última", () => {
    const { rerender } = render(
      <Pagination currentPage={1} totalPages={3} onPageChange={() => undefined} />,
    );
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeEnabled();

    rerender(
      <Pagination currentPage={3} totalPages={3} onPageChange={() => undefined} />,
    );
    expect(screen.getByRole("button", { name: "Anterior" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });

  it("muestra elipsis cuando totalPages es grande", () => {
    render(
      <Pagination currentPage={5} totalPages={20} onPageChange={() => undefined} />,
    );
    const ellipses = screen.getAllByText("…");
    expect(ellipses.length).toBeGreaterThanOrEqual(1);
    ellipses.forEach((e) => {
      expect(e).toHaveClass("ig-pagination-ellipsis");
      expect(e).toHaveAttribute("aria-hidden", "true");
    });
    // Siempre incluye primera y última
    expect(screen.getByRole("button", { name: "Página 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Página 20" })).toBeInTheDocument();
  });

  it("aplica variant", () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={3}
        onPageChange={() => undefined}
        variant="brand"
        data-testid="p"
      />,
    );
    expect(screen.getByTestId("p")).toHaveClass("ig-pagination-brand");
  });

  it("forwarda ref", () => {
    const ref = createRef<HTMLElement>();
    render(
      <Pagination
        ref={ref}
        currentPage={1}
        totalPages={3}
        onPageChange={() => undefined}
      />,
    );
    expect(ref.current?.tagName).toBe("NAV");
  });

  it("prevAriaLabel/nextAriaLabel sobreescriben el aria-label cuando label es ReactNode", () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={3}
        onPageChange={() => undefined}
        prevLabel={<span data-testid="prev-icon">‹</span>}
        nextLabel={<span data-testid="next-icon">›</span>}
        prevAriaLabel="Previous page"
        nextAriaLabel="Next page"
      />,
    );
    expect(
      screen.getByRole("button", { name: "Previous page" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Next page" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("prev-icon")).toBeInTheDocument();
    expect(screen.getByTestId("next-icon")).toBeInTheDocument();
  });

  it("cae a 'Página anterior'/'Página siguiente' si label es ReactNode sin aria override", () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={3}
        onPageChange={() => undefined}
        prevLabel={<span>‹</span>}
        nextLabel={<span>›</span>}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Página anterior" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Página siguiente" }),
    ).toBeInTheDocument();
  });
});

describe("Pagination — clamp de inputs fuera de rango", () => {
  it("clamp currentPage > totalPages al máximo", () => {
    render(
      <Pagination currentPage={99} totalPages={5} onPageChange={() => {}} />,
    );
    expect(
      screen.getByRole("button", { name: "Página 5" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("clamp currentPage < 1 al mínimo", () => {
    render(
      <Pagination currentPage={-3} totalPages={5} onPageChange={() => {}} />,
    );
    expect(
      screen.getByRole("button", { name: "Página 1" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("clamp totalPages < 1 no crashea y renderiza al menos una página", () => {
    render(
      <Pagination currentPage={1} totalPages={0} onPageChange={() => {}} />,
    );
    expect(
      screen.getByRole("button", { name: "Página 1" }),
    ).toBeInTheDocument();
  });

  it("clamp NaN cae a defaults (1, 1)", () => {
    render(
      <Pagination
        currentPage={Number.NaN}
        totalPages={Number.NaN}
        onPageChange={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Página 1" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("siblingCount negativo se clampa a 0", () => {
    render(
      <Pagination
        currentPage={5}
        totalPages={10}
        siblingCount={-3}
        onPageChange={() => {}}
      />,
    );
    // Sin siblings: 1, …, 5, …, 10 (al menos primera, current y última).
    expect(
      screen.getByRole("button", { name: "Página 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Página 5" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Página 10" }),
    ).toBeInTheDocument();
  });

  it("anterior/siguiente usan safeCurrent (no el currentPage crudo)", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination
        currentPage={99}
        totalPages={5}
        onPageChange={onPageChange}
      />,
    );
    // currentPage clamped a 5; anterior debe ir a 4, no a 98.
    await user.click(screen.getByRole("button", { name: "Anterior" }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });
});
