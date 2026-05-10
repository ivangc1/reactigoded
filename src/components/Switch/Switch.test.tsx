import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "./Switch";

describe("Switch", () => {
  it("renderiza un input[type=checkbox] con role=switch dentro de un label", () => {
    render(<Switch>Activar</Switch>);
    const input = screen.getByRole("switch", { name: "Activar" });
    expect(input).toHaveAttribute("type", "checkbox");
    expect(input).not.toBeChecked();
  });

  it("aria-checked refleja el estado interno (uncontrolled)", async () => {
    render(<Switch>Activar</Switch>);
    const input = screen.getByRole("switch");
    expect(input).not.toBeChecked();
    await userEvent.click(input);
    expect(input).toBeChecked();
  });

  it("aria-checked sigue a la prop checked (controlled)", () => {
    const { rerender } = render(<Switch checked={false} onChange={() => {}}>x</Switch>);
    expect(screen.getByRole("switch")).not.toBeChecked();
    rerender(<Switch checked onChange={() => {}}>x</Switch>);
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("renderiza con clase wrapper y default variant=brand", () => {
    const { container } = render(<Switch>x</Switch>);
    const label = container.querySelector("label");
    expect(label).toHaveClass("ig-switch", "ig-switch-brand");
  });

  describe.each([
    ["brand"],
    ["secondary"],
    ["success"],
    ["warning"],
    ["danger"],
    ["info"],
  ] as const)("variant=%s", (v) => {
    it(`label recibe ig-switch-${v}`, () => {
      const { container } = render(<Switch variant={v}>x</Switch>);
      expect(container.querySelector("label")).toHaveClass(`ig-switch-${v}`);
    });
  });

  it("className del consumer se mergea sin pisar las del componente", () => {
    const { container } = render(
      <Switch variant="brand" className="extra otra">
        x
      </Switch>,
    );
    expect(container.querySelector("label")).toHaveClass(
      "ig-switch",
      "ig-switch-brand",
      "extra",
      "otra",
    );
  });

  it("disabled propaga al input y marca data-disabled en label", () => {
    const { container } = render(<Switch disabled>x</Switch>);
    expect(screen.getByRole("switch")).toBeDisabled();
    expect(container.querySelector("label")).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("dispara onChange al click", async () => {
    const onChange = vi.fn();
    render(<Switch onChange={onChange}>x</Switch>);
    await userEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("indeterminate sigue true tras click si la prop sigue true (sticky)", async () => {
    render(<Switch indeterminate>Mixto</Switch>);
    // H-15: con indeterminate el role downgradea a "checkbox" (WAI-
    // ARIA 1.2 NO admite aria-checked="mixed" en role="switch").
    const input = screen.getByRole("checkbox");
    expect(input).toBePartiallyChecked();
    await userEvent.click(input);
    expect(input).toBePartiallyChecked();
  });

  // H-15 (gate review, WAI-ARIA 1.2): cuando indeterminate=false, el
  // input lleva role="switch" canónico. Cuando indeterminate=true,
  // downgradea a role="checkbox" para cumplir spec sin perder el
  // patrón "switch master de un grupo".
  describe("H-15 — role + aria-checked vs spec WAI-ARIA 1.2", () => {
    it("sin indeterminate: role=switch + aria-checked boolean", () => {
      render(<Switch defaultChecked>x</Switch>);
      const input = screen.getByRole("switch");
      expect(input).toBeChecked();
    });

    it("indeterminate=true: role=checkbox + aria-checked=mixed (NO switch)", () => {
      render(<Switch indeterminate>x</Switch>);
      // El role se downgradea para cumplir WAI-ARIA 1.2.
      expect(screen.queryByRole("switch")).not.toBeInTheDocument();
      const input = screen.getByRole("checkbox");
      expect(input).toBePartiallyChecked();
    });

    it("indeterminate alterna entre switch y checkbox sin remontar", () => {
      const { rerender } = render(<Switch>x</Switch>);
      expect(screen.getByRole("switch")).toBeInTheDocument();
      rerender(<Switch indeterminate>x</Switch>);
      expect(screen.queryByRole("switch")).not.toBeInTheDocument();
      expect(screen.getByRole("checkbox")).toBeInTheDocument();
      rerender(<Switch>x</Switch>);
      expect(screen.getByRole("switch")).toBeInTheDocument();
    });
  });

  it("transición controlled → uncontrolled: el wrapper React→DOM mantiene el input nativo", () => {
    // Smoke test del wrapping React→DOM. Antes este test verificaba el
    // warning de React vía `console.error` mock, pero React deduplica
    // ese warning por worker y vitest corre con `isolate: false` —
    // resultaba flaky según orden. Verificamos el comportamiento
    // observable: el componente sigue vivo y el input switch sigue
    // rendereando tras la transición.
    const { rerender } = render(
      <Switch checked onChange={() => {}}>
        x
      </Switch>,
    );
    expect(screen.getByRole("switch")).toBeChecked();

    rerender(<Switch>x</Switch>);
    const inputAfter = screen.getByRole("switch");
    expect(inputAfter).toHaveAttribute("type", "checkbox");
    // ig-switch va en el <label> wrapper, no en el input
    expect(inputAfter.closest("label")).toHaveClass("ig-switch");
  });

  it("transición uncontrolled → controlled: el wrapper React→DOM respeta checked externo", () => {
    // Smoke test del wrapping React→DOM en input[type=checkbox]. El
    // contrato abstracto del hook lo cubre useControllableState.test.ts;
    // aquí verificamos que Switch refleja el checked externo tras el
    // rerender.
    const onChange = vi.fn();
    const { rerender } = render(
      <Switch defaultChecked={false} onChange={onChange}>
        x
      </Switch>,
    );
    expect(screen.getByRole("switch")).not.toBeChecked();

    rerender(
      <Switch checked onChange={onChange}>
        x
      </Switch>,
    );
    expect(screen.getByRole("switch")).toBeChecked();
  });
});

describe("Switch — AllStates regression", () => {
  const VARIANTS = [
    "brand",
    "secondary",
    "success",
    "warning",
    "danger",
    "info",
  ] as const;

  it("AllStates renderiza variants", async () => {
    const { composeStory } = await import("@storybook/react");
    const stories = await import("./Switch.stories");
    const Story = composeStory(stories.AllStates, stories.default);
    const { container } = render(<Story />);
    for (const v of VARIANTS) {
      expect(container.querySelector(`.ig-switch-${v}`)).not.toBeNull();
    }
  });

  // H-05 (gate review): describedBy alineado con Input/Select/Textarea.
  it("describedBy aplica aria-describedby + concatena con nativo", () => {
    render(
      <Switch
        aria-describedby="native-id"
        describedBy={["helper-1", "error-1"]}
      >
        x
      </Switch>,
    );
    const input = screen.getByRole("switch");
    expect(input).toHaveAttribute(
      "aria-describedby",
      "native-id helper-1 error-1",
    );
  });
});
