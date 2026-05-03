import { describe, it, expect, vi } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

const VARIANTS = ["brand", "secondary", "success", "warning", "danger", "info"] as const;
const SIZES = ["sm", "lg"] as const;

describe("Button", () => {
  it("renderiza con clase base + default variant=brand y type=button", () => {
    render(<Button>Aceptar</Button>);
    const btn = screen.getByRole("button", { name: "Aceptar" });
    expect(btn).toHaveClass("ig-btn", "ig-btn-brand");
    expect(btn).toHaveAttribute("type", "button");
  });

  describe.each(VARIANTS)("variant=%s", (v) => {
    it(`appearance default (filled) → ig-btn-${v}`, () => {
      render(<Button variant={v}>x</Button>);
      expect(screen.getByRole("button")).toHaveClass(`ig-btn-${v}`);
    });

    it(`appearance=outline → ig-btn-outline-${v}`, () => {
      render(
        <Button variant={v} appearance="outline">
          x
        </Button>,
      );
      expect(screen.getByRole("button")).toHaveClass(`ig-btn-outline-${v}`);
    });

    it(`appearance=ghost → ig-btn-ghost-${v}`, () => {
      render(
        <Button variant={v} appearance="ghost">
          x
        </Button>,
      );
      expect(screen.getByRole("button")).toHaveClass(`ig-btn-ghost-${v}`);
    });
  });

  describe.each(SIZES)("size=%s", (s) => {
    it(`aplica clase ig-btn-${s}`, () => {
      render(<Button size={s}>x</Button>);
      expect(screen.getByRole("button")).toHaveClass(`ig-btn-${s}`);
    });
  });

  it("appearance=link ignora variant y aplica ig-btn-link", () => {
    render(
      <Button variant="danger" appearance="link">
        Saber más
      </Button>,
    );
    expect(screen.getByRole("button")).toHaveClass("ig-btn", "ig-btn-link");
  });

  it("loading: aria-busy=true, disabled efectivo y bloquea onClick", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Guardar
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("loading=true fuerza disabled aunque consumer pase disabled={false}", () => {
    render(
      <Button loading disabled={false}>
        x
      </Button>,
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("disabled bloquea onClick", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        x
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("loading + disabled (combo): sigue bloqueando onClick una sola vez", async () => {
    const onClick = vi.fn();
    render(
      <Button loading disabled onClick={onClick}>
        x
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("permite override de type a submit", () => {
    render(<Button type="submit">x</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("block, icon y className extra se mergean sin pisar las del componente", () => {
    render(
      <Button block icon className="extra otra">
        ★
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("ig-btn", "ig-btn-block", "ig-btn-icon", "extra", "otra");
  });

  it("forwarda ref al button", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>X</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
