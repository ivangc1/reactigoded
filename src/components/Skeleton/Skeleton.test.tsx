import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton, SkeletonContainer } from "./Skeleton";

describe("Skeleton", () => {
  it("renderiza decorativo: role=presentation + aria-hidden, NO role=status", () => {
    // B-12 (beta.22): Skeleton solo es presentación. Si un consumer tenía
    // varios `<Skeleton>` cada uno gritaba "status busy" al SR; ahora el
    // role=status vive en SkeletonContainer y dispara una sola vez.
    // Buscamos por clase pública (.ig-skeleton) en vez de data-testid
    // porque aria-hidden saca el elemento del a11y tree y getByRole no
    // lo ve; querySelector de la API CSS pública es más estable.
    const { container } = render(<Skeleton />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    const el = container.querySelector(".ig-skeleton");
    expect(el).toHaveAttribute("role", "presentation");
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el).toHaveClass("ig-skeleton-text");
  });

  it("aplica la clase de variant solicitada", () => {
    const { container } = render(<Skeleton variant="avatar-lg" />);
    expect(container.querySelector(".ig-skeleton")).toHaveClass(
      "ig-skeleton-avatar-lg",
    );
  });

  it("permite style y className extra", () => {
    const { container } = render(
      <Skeleton style={{ width: 200 }} className="extra" />,
    );
    const el = container.querySelector(".ig-skeleton") as HTMLElement;
    expect(el).toHaveClass("extra");
    expect(el).toHaveStyle({ width: "200px" });
  });
});

describe("SkeletonContainer (B-12)", () => {
  it("anuncia carga al SR: role=status + aria-busy + aria-live=polite + aria-label default ES", () => {
    render(
      <SkeletonContainer>
        <Skeleton variant="text" />
        <Skeleton variant="text" />
      </SkeletonContainer>,
    );
    const wrapper = screen.getByRole("status");
    expect(wrapper).toHaveAttribute("aria-busy", "true");
    expect(wrapper).toHaveAttribute("aria-live", "polite");
    expect(wrapper).toHaveAttribute("aria-label", "Cargando contenido…");
    expect(wrapper).toHaveClass("ig-skeleton-container");
  });

  it("permite override del label", () => {
    render(
      <SkeletonContainer label="Cargando lista de pedidos">
        <Skeleton />
      </SkeletonContainer>,
    );
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Cargando lista de pedidos",
    );
  });

  it("aria-label directo vía rest gana sobre label prop", () => {
    render(
      <SkeletonContainer label="ignored" aria-label="Custom override">
        <Skeleton />
      </SkeletonContainer>,
    );
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Custom override",
    );
  });

  it("hijos Skeleton siguen siendo decorativos (role=presentation)", () => {
    const { container } = render(
      <SkeletonContainer>
        <Skeleton variant="text" />
        <Skeleton variant="title" />
      </SkeletonContainer>,
    );
    // Solo UN role=status (el container), los Skeletons NO.
    expect(screen.getAllByRole("status")).toHaveLength(1);
    const skeletons = container.querySelectorAll(".ig-skeleton");
    expect(skeletons).toHaveLength(2);
    skeletons.forEach((el) => {
      expect(el).toHaveAttribute("role", "presentation");
    });
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
