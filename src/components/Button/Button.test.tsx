import { describe, it, expect, vi } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renderiza children y aplica `ig-btn` con variant brand por defecto", () => {
    render(<Button>Aceptar</Button>);
    const btn = screen.getByRole("button", { name: "Aceptar" });
    expect(btn).toHaveClass("ig-btn", "ig-btn-brand");
    expect(btn).toHaveAttribute("type", "button");
  });

  it("aplica la clase de variant", () => {
    render(<Button variant="danger">Borrar</Button>);
    expect(screen.getByRole("button")).toHaveClass("ig-btn-danger");
  });

  it("añade clase de size solo cuando no es `md`", () => {
    const { rerender } = render(<Button size="md">A</Button>);
    expect(screen.getByRole("button")).not.toHaveClass("ig-btn-md");
    rerender(<Button size="lg">A</Button>);
    expect(screen.getByRole("button")).toHaveClass("ig-btn-lg");
  });

  it("loading marca disabled, añade clase y bloquea onClick", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Guardar
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveClass("ig-btn-loading");
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("block, icon y className extra se aplican", () => {
    render(
      <Button block icon className="extra">
        ★
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("ig-btn-block", "ig-btn-icon", "extra");
  });

  it("respeta `disabled` aunque no esté loading", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        X
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("forwarda ref al elemento button", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>X</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("permite override de type a `submit`", () => {
    render(
      <Button type="submit">
        Enviar
      </Button>,
    );
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("loading=true fuerza disabled aunque consumer pase disabled={false}", () => {
    render(
      <Button loading disabled={false}>
        Guardando
      </Button>,
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("appearance=outline + variant color genera ig-btn-outline-<variant>", () => {
    render(
      <Button variant="success" appearance="outline">
        OK
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "OK" });
    expect(btn).toHaveClass("ig-btn", "ig-btn-outline-success");
    expect(btn).not.toHaveClass("ig-btn-success");
  });

  it("appearance=ghost + variant color genera ig-btn-ghost-<variant>", () => {
    render(
      <Button variant="danger" appearance="ghost">
        X
      </Button>,
    );
    expect(screen.getByRole("button", { name: "X" })).toHaveClass(
      "ig-btn",
      "ig-btn-ghost-danger",
    );
  });

  it("appearance se ignora cuando variant ya es plano (outline/ghost/link)", () => {
    render(
      <Button variant="outline" appearance="ghost">
        Plano
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Plano" });
    // Usa ig-btn-outline plano, no ig-btn-ghost-outline (sin sentido).
    expect(btn).toHaveClass("ig-btn", "ig-btn-outline");
    expect(btn).not.toHaveClass("ig-btn-ghost-outline");
  });
});
