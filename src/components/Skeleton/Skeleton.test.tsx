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

  // M-02 soak: confirmar que la AllStates story (sin container) NO
  // emite ningún role=status. Beta.22 cambió la semántica: standalone
  // Skeletons son decorativos y NO anuncian. AllStates ejercita ese
  // path como invariante regresional.
  it("AllStates: sin SkeletonContainer, cero announcements al SR", async () => {
    const { composeStory } = await import("@storybook/react");
    const stories = await import("./Skeleton.stories");
    const Story = composeStory(stories.AllStates, stories.default);
    render(<Story />);
    expect(screen.queryAllByRole("status")).toHaveLength(0);
  });
});

// M-02 (RC1 gate review): soak adicional del breaking change ARIA de
// beta.22. Cubre edge cases del nuevo patrón (container + skeletons
// decorativos) que no estaban testeados explícitamente.
describe("Skeleton — M-02 ARIA soak", () => {
  it("SkeletonContainer vacío (sin children) sigue anunciando carga", () => {
    render(<SkeletonContainer label="Cargando…">{null}</SkeletonContainer>);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-label", "Cargando…");
  });

  it("Múltiples SkeletonContainer paralelos: cada uno con su status independiente", () => {
    render(
      <>
        <SkeletonContainer label="Feed">
          <Skeleton variant="text" />
        </SkeletonContainer>
        <SkeletonContainer label="Sidebar">
          <Skeleton variant="text" />
        </SkeletonContainer>
        <SkeletonContainer label="Footer">
          <Skeleton variant="text" />
        </SkeletonContainer>
      </>,
    );
    const statuses = screen.getAllByRole("status");
    expect(statuses).toHaveLength(3);
    expect(statuses.map((s) => s.getAttribute("aria-label"))).toEqual([
      "Feed",
      "Sidebar",
      "Footer",
    ]);
  });

  it("SkeletonContainer anidados: cada uno conserva su propio role=status (decisión consciente)", () => {
    // Aunque no es un patrón recomendado, anidar SkeletonContainers
    // (e.g., card con skeleton fields y outer wrapper de la página)
    // mantiene un status por nivel. El SR oirá ambos labels; depende
    // del consumer no abusar de la anidación.
    render(
      <SkeletonContainer label="Página entera">
        <SkeletonContainer label="Sección perfil">
          <Skeleton variant="text" />
        </SkeletonContainer>
      </SkeletonContainer>,
    );
    expect(screen.getAllByRole("status")).toHaveLength(2);
  });

  it("Skeleton standalone (sin container) está fuera del a11y tree", () => {
    // aria-hidden=true saca el elemento de la a11y tree completamente.
    // getByRole no lo encuentra como botón/img/etc — el SR lo ignora.
    const { container } = render(<Skeleton variant="image" />);
    expect(screen.queryAllByRole("status")).toHaveLength(0);
    expect(screen.queryByRole("presentation")).not.toBeInTheDocument(); // role=presentation tampoco se expone
    // Pero visualmente sí está renderizado.
    expect(container.querySelector(".ig-skeleton-image")).toBeInTheDocument();
  });

  it("Container preserva role=status aún si consumer pasa role distinto en rest (regresión guard)", () => {
    // Decisión: el role del container debe ser inmutable para preservar
    // el contrato A11y. Si un consumer pasa role="region", nuestro
    // role=status gana (definido después en el JSX → React aplica el
    // último en orden de prop merge).
    render(
      <SkeletonContainer label="x" role="region">
        <Skeleton />
      </SkeletonContainer>,
    );
    // El elemento expone role=status (nuestro), no region (consumer).
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });
});
