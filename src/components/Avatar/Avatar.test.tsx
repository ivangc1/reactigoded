import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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

  // M-10 (gate review): img con loading="lazy" por defecto + fallback
  // automático a initials cuando la imagen falla a cargar.
  describe("M-10 — onError fallback + loading lazy", () => {
    it("img recibe loading=\"lazy\" por defecto", () => {
      render(<Avatar src="/u.png" alt="J" />);
      expect(screen.getByAltText("J")).toHaveAttribute("loading", "lazy");
    });

    it("loading=\"eager\" override para avatares above-the-fold", () => {
      render(<Avatar src="/u.png" alt="J" loading="eager" />);
      expect(screen.getByAltText("J")).toHaveAttribute("loading", "eager");
    });

    it("error de carga + initials fallback → muestra initials", () => {
      render(<Avatar src="/broken.png" alt="J" initials="JD" />);
      // Antes del error: img montada, no hay initials.
      const img = screen.getByAltText("J");
      expect(img).toBeInTheDocument();
      expect(screen.queryByText("JD")).not.toBeInTheDocument();
      // Simular fallo de carga.
      fireEvent.error(img);
      // Tras el error: img desmontada, initials montadas.
      expect(screen.queryByAltText("J")).not.toBeInTheDocument();
      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("error de carga sin initials → quedan vacío (no crash)", () => {
      render(<Avatar src="/broken.png" alt="J" data-testid="a" />);
      const img = screen.getByAltText("J");
      fireEvent.error(img);
      expect(screen.queryByAltText("J")).not.toBeInTheDocument();
      // El contenedor sigue montado, simplemente vacío.
      expect(screen.getByTestId("a")).toBeInTheDocument();
    });

    // Codex P1 sobre PR #36: imgFailed se resetea cuando cambia src.
    // Sin esto, una imagen rota dejaba el slot bloqueado para siempre
    // (regresión en avatars dinámicos: TableRow reusada con distintos
    // usuarios, retry tras network fail).
    it("cambiar src tras error reintenta la imagen (codex P1)", () => {
      const { rerender } = render(
        <Avatar src="/broken.png" alt="J" initials="JD" />,
      );
      // Trigger error → muestra initials.
      fireEvent.error(screen.getByAltText("J"));
      expect(screen.queryByAltText("J")).not.toBeInTheDocument();
      expect(screen.getByText("JD")).toBeInTheDocument();
      // Cambiar a una src nueva: el componente debe reintentar la
      // carga (img montada otra vez), no quedarse pegado en initials.
      rerender(<Avatar src="/valid.png" alt="K" initials="KL" />);
      const newImg = screen.getByAltText("K");
      expect(newImg).toBeInTheDocument();
      expect(newImg).toHaveAttribute("src", "/valid.png");
      // Las initials previas ya no se muestran (la nueva imagen aún
      // no ha fallado).
      expect(screen.queryByText("JD")).not.toBeInTheDocument();
      expect(screen.queryByText("KL")).not.toBeInTheDocument();
    });
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

describe("Avatar — AllStates regression", () => {
  it("AllStates renderiza sizes y AvatarGroup", async () => {
    const { composeStory } = await import("@storybook/react");
    const stories = await import("./Avatar.stories");
    const Story = composeStory(stories.AllStates, stories.default);
    const { container } = render(<Story />);
    expect(container.querySelectorAll(".ig-avatar").length).toBeGreaterThan(15);
    expect(container.querySelector(".ig-avatar-group")).not.toBeNull();
    expect(container.querySelector(".ig-avatar-rounded")).not.toBeNull();
  });
});
