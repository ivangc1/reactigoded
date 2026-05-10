import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Rating } from "./Rating";

describe("Rating", () => {
  it("renderiza N estrellas como radio buttons", () => {
    render(<Rating max={5} value={0} />);
    const stars = screen.getAllByRole("radio");
    expect(stars).toHaveLength(5);
  });

  it("aria-checked en la estrella seleccionada", () => {
    render(<Rating value={3} />);
    expect(screen.getByRole("radio", { name: "3 estrellas" })).toBeChecked();
  });

  it("estrella 1 usa singular", () => {
    render(<Rating value={1} max={5} />);
    expect(screen.getByRole("radio", { name: "1 estrella" })).toBeInTheDocument();
  });

  it("dispara onValueChange con el valor pulsado (controlled)", async () => {
    const onValueChange = vi.fn();
    render(<Rating value={0} onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "4 estrellas" }));
    expect(onValueChange).toHaveBeenCalledWith(4);
  });

  it("uncontrolled: defaultValue inicial y click actualiza el estado interno", async () => {
    render(<Rating defaultValue={2} />);
    expect(screen.getByRole("radio", { name: "2 estrellas" })).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: "5 estrellas" }));
    expect(screen.getByRole("radio", { name: "5 estrellas" })).toBeChecked();
  });

  it("readOnly aplica aria-readonly al radiogroup y guarda click", async () => {
    const onValueChange = vi.fn();
    render(
      <Rating value={3} readOnly onValueChange={onValueChange} data-testid="r" />,
    );
    const group = screen.getByTestId("r");
    expect(group).toHaveClass("ig-rating-readonly");
    expect(group).toHaveAttribute("aria-readonly", "true");
    // Las estrellas NO llevan disabled (rompía la a11y de SR sobre el
    // radio checked); el guard vive en el handler.
    screen.getAllByRole("radio").forEach((s) => {
      expect(s).toBeEnabled();
    });
    await userEvent.click(screen.getByRole("radio", { name: "5 estrellas" }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  describe.each(["sm", "lg", "xl"] as const)("size=%s", (s) => {
    it(`aplica clase ig-rating-${s}`, () => {
      render(<Rating size={s} data-testid="r" />);
      expect(screen.getByTestId("r")).toHaveClass(`ig-rating-${s}`);
    });
  });

  it("transición controlled→uncontrolled deja stale el último valor controlado", () => {
    // Patrón documentado: si el consumer cambia de modo, el internal state
    // arranca desde defaultValue. No es un bug — es comportamiento esperado.
    const { rerender } = render(<Rating value={3} onValueChange={() => {}} />);
    expect(screen.getByRole("radio", { name: "3 estrellas" })).toBeChecked();
    rerender(<Rating defaultValue={0} />);
    // En uncontrolled, el state interno arranca de defaultValue=0.
    expect(screen.getByRole("radio", { name: "1 estrella" })).not.toBeChecked();
  });

  it("transición uncontrolled → controlled: el wrapper React→DOM respeta value externo", () => {
    // Smoke test del wrapping. El contrato abstracto del hook lo cubre
    // useControllableState.test.ts; aquí verificamos que Rating reflecta
    // el value en el aria-checked del button[role=radio] correcto.
    const onValueChange = vi.fn();
    const { rerender } = render(
      <Rating defaultValue={2} onValueChange={onValueChange} />,
    );
    expect(screen.getByRole("radio", { name: "2 estrellas" })).toBeChecked();

    rerender(<Rating value={4} onValueChange={onValueChange} />);
    expect(screen.getByRole("radio", { name: "4 estrellas" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "2 estrellas" })).not.toBeChecked();
  });

  it("readOnly: <Rating value={N} readOnly /> NO dispara warn dev", () => {
    // Anti-regresión Option E (beta.21): Rating en modo display-only
    // (readOnly) suprime el warn del hook vía __suppressNoHandlerWarn.
    // Sin esto, Rating.SoloLectura/AllStates lanza falsos positivos.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Rating value={3} readOnly />);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("controlled sin readOnly y sin onValueChange SÍ dispara warn dev", () => {
    // El warn del hook se mantiene para los casos legítimos (consumer
    // olvidó el handler).
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Rating value={3} />);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});

describe("Rating — roving tabindex + keyboard nav (WAI-ARIA APG)", () => {
  it("solo la estrella checked tiene tabIndex=0; el resto -1", () => {
    render(<Rating value={3} max={5} />);
    const stars = screen.getAllByRole("radio");
    expect(stars[0]).toHaveAttribute("tabindex", "-1");
    expect(stars[1]).toHaveAttribute("tabindex", "-1");
    expect(stars[2]).toHaveAttribute("tabindex", "0"); // value=3
    expect(stars[3]).toHaveAttribute("tabindex", "-1");
    expect(stars[4]).toHaveAttribute("tabindex", "-1");
  });

  it("sin valor (value=0): la primera estrella es tab stop", () => {
    render(<Rating value={0} max={5} />);
    const stars = screen.getAllByRole("radio");
    expect(stars[0]).toHaveAttribute("tabindex", "0");
    stars.slice(1).forEach((s) => {
      expect(s).toHaveAttribute("tabindex", "-1");
    });
  });

  it("readOnly: la estrella checked sigue siendo tab stop (roving)", () => {
    // Cambio APG: en readOnly el radiogroup expone aria-readonly; los
    // radios siguen siendo focuseables para inspección pero los
    // handlers no responden. Sin esto un SR no podía anunciar la
    // estrella seleccionada porque el botón estaba `disabled`.
    render(<Rating value={3} max={5} readOnly />);
    const stars = screen.getAllByRole("radio");
    expect(stars[2]).toHaveAttribute("tabindex", "0"); // value=3
    [0, 1, 3, 4].forEach((i) => {
      expect(stars[i]).toHaveAttribute("tabindex", "-1");
    });
  });

  it("ArrowRight selecciona la siguiente estrella y mueve foco", async () => {
    const onValueChange = vi.fn();
    render(<Rating value={2} onValueChange={onValueChange} />);
    const star2 = screen.getByRole("radio", { name: "2 estrellas" });
    star2.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith(3);
    expect(screen.getByRole("radio", { name: "3 estrellas" })).toHaveFocus();
  });

  it("ArrowLeft selecciona la anterior", async () => {
    const onValueChange = vi.fn();
    render(<Rating value={3} onValueChange={onValueChange} />);
    const star3 = screen.getByRole("radio", { name: "3 estrellas" });
    star3.focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(onValueChange).toHaveBeenLastCalledWith(2);
    expect(screen.getByRole("radio", { name: "2 estrellas" })).toHaveFocus();
  });

  it("ArrowRight tope = max (no se sale)", async () => {
    const onValueChange = vi.fn();
    render(<Rating value={5} max={5} onValueChange={onValueChange} />);
    const last = screen.getByRole("radio", { name: "5 estrellas" });
    last.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith(5);
    expect(last).toHaveFocus();
  });

  it("ArrowLeft tope = 1 (no se sale)", async () => {
    const onValueChange = vi.fn();
    render(<Rating value={1} onValueChange={onValueChange} />);
    const first = screen.getByRole("radio", { name: "1 estrella" });
    first.focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(onValueChange).toHaveBeenLastCalledWith(1);
    expect(first).toHaveFocus();
  });

  it("Home → primera estrella, End → última", async () => {
    const onValueChange = vi.fn();
    render(<Rating value={3} max={5} onValueChange={onValueChange} />);
    const star3 = screen.getByRole("radio", { name: "3 estrellas" });
    star3.focus();
    await userEvent.keyboard("{End}");
    expect(onValueChange).toHaveBeenLastCalledWith(5);
    expect(screen.getByRole("radio", { name: "5 estrellas" })).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(onValueChange).toHaveBeenLastCalledWith(1);
    expect(screen.getByRole("radio", { name: "1 estrella" })).toHaveFocus();
  });

  it("Space/Enter sobre una estrella la selecciona", async () => {
    const onValueChange = vi.fn();
    render(<Rating value={0} onValueChange={onValueChange} />);
    const first = screen.getByRole("radio", { name: "1 estrella" });
    first.focus();
    await userEvent.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenLastCalledWith(1);
  });

  it("readOnly ignora keyboard nav", async () => {
    const onValueChange = vi.fn();
    render(<Rating value={3} readOnly onValueChange={onValueChange} />);
    const star3 = screen.getByRole("radio", { name: "3 estrellas" });
    star3.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe("Rating — clamp inputs inválidos (regression beta.4)", () => {
  it("value > max clampa a max sin romper roving tabindex", () => {
    render(<Rating value={10} max={5} />);
    const stars = screen.getAllByRole("radio");
    expect(stars).toHaveLength(5);
    // value clampado a 5 → la última estrella checked y tab stop
    expect(stars[4]).toBeChecked();
    expect(stars[4]).toHaveAttribute("tabindex", "0");
    // Resto -1
    expect(stars[0]).toHaveAttribute("tabindex", "-1");
  });

  it("value < 0 clampa a 0 (ningún radio checked, primer star tab stop)", () => {
    render(<Rating value={-3} max={5} />);
    const stars = screen.getAllByRole("radio");
    stars.forEach((s) => {
      expect(s).not.toBeChecked();
    });
    expect(stars[0]).toHaveAttribute("tabindex", "0");
  });

  it("defaultValue > max se clampa al inicializar internal", () => {
    render(<Rating defaultValue={99} max={5} />);
    const stars = screen.getAllByRole("radio");
    expect(stars[4]).toBeChecked();
  });

  it("max no entero se redondea hacia abajo", () => {
    render(<Rating value={2} max={3.7} />);
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("max < 1 fuerza al menos 1 estrella", () => {
    render(<Rating max={0} />);
    expect(screen.getAllByRole("radio")).toHaveLength(1);
  });

  it("ArrowRight en última estrella NO se sale (clamp, no wrap)", async () => {
    const onValueChange = vi.fn();
    render(<Rating value={5} max={5} onValueChange={onValueChange} />);
    const last = screen.getByRole("radio", { name: "5 estrellas" });
    last.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith(5);
    expect(last).toHaveFocus();
  });

  it("End respeta safeMax (no max raw)", async () => {
    const onValueChange = vi.fn();
    render(<Rating value={1} max={3.9} onValueChange={onValueChange} />);
    const first = screen.getByRole("radio", { name: "1 estrella" });
    first.focus();
    await userEvent.keyboard("{End}");
    expect(onValueChange).toHaveBeenLastCalledWith(3); // floor(3.9)=3
  });

  // H-05 (gate review): describedBy alineado con Input/Select/Textarea.
  // En Rating va al radiogroup (root div), no al input nativo.
  it("describedBy aplica aria-describedby al radiogroup + concatena con nativo", () => {
    render(
      <Rating
        defaultValue={3}
        aria-describedby="native-id"
        describedBy={["helper-1", "error-1"]}
      />,
    );
    const group = screen.getByRole("radiogroup");
    expect(group).toHaveAttribute(
      "aria-describedby",
      "native-id helper-1 error-1",
    );
  });
});
