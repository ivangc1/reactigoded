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

  // ─── Uncontrolled (beta.20) ───────────────────────────────────

  it("uncontrolled: arranca en defaultPage y avanza con click", async () => {
    const user = userEvent.setup();
    render(<Pagination totalPages={5} defaultPage={2} />);
    expect(
      screen.getByRole("button", { name: "Página 2" }),
    ).toHaveAttribute("aria-current", "page");

    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(
      screen.getByRole("button", { name: "Página 3" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("uncontrolled: defaultPage por defecto es 1", () => {
    render(<Pagination totalPages={5} />);
    expect(
      screen.getByRole("button", { name: "Página 1" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("uncontrolled: onPageChange (opcional) recibe el nuevo page como side-effect", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination
        totalPages={5}
        defaultPage={1}
        onPageChange={onPageChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
    // Y el state interno avanzó solo (no hace falta rerender):
    expect(
      screen.getByRole("button", { name: "Página 2" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("controlled: setPage interno NO actualiza el visible si el consumer no rerendera", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        onPageChange={onPageChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    // currentPage sigue siendo 2 hasta que el consumer rerendere
    expect(
      screen.getByRole("button", { name: "Página 2" }),
    ).toHaveAttribute("aria-current", "page");
  });
});

describe("Pagination — uncontrolled state sync (B-18)", () => {
  // En uncontrolled, si totalPages baja por debajo del page interno
  // el componente debe sincronizar el state al clamped current,
  // y NO debe disparar onPageChange (sync silencioso). Cuando totalPages
  // sube de nuevo, NO debe "saltar" al valor viejo (3 ≠ 5).
  it("sincroniza state interno cuando totalPages baja por debajo del current", () => {
    const { rerender } = render(<Pagination totalPages={10} defaultPage={5} />);
    expect(
      screen.getByRole("button", { name: "Página 5" }),
    ).toHaveAttribute("aria-current", "page");

    rerender(<Pagination totalPages={3} defaultPage={5} />);
    expect(
      screen.getByRole("button", { name: "Página 3" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("NO vuelve al valor viejo cuando totalPages sube de nuevo", () => {
    const { rerender } = render(<Pagination totalPages={10} defaultPage={5} />);
    rerender(<Pagination totalPages={3} defaultPage={5} />);
    rerender(<Pagination totalPages={10} defaultPage={5} />);
    // El state interno es 3 (clamped), NO 5. Hasta que el usuario
    // o un setPage explícito lo mueva, se queda donde estaba.
    expect(
      screen.getByRole("button", { name: "Página 3" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("NO llama a onPageChange durante el silent sync", () => {
    const onPageChange = vi.fn();
    const { rerender } = render(
      <Pagination totalPages={10} defaultPage={5} onPageChange={onPageChange} />,
    );
    rerender(
      <Pagination totalPages={3} defaultPage={5} onPageChange={onPageChange} />,
    );
    expect(onPageChange).not.toHaveBeenCalled();
  });
});
