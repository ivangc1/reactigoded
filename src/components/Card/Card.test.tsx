import { describe, it, expect, vi } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  CardImage,
  CardDivider,
} from "./index";

describe("Card", () => {
  it("renderiza con clase base ig-card", () => {
    render(<Card data-testid="c">Hola</Card>);
    expect(screen.getByTestId("c")).toHaveClass("ig-card");
  });

  describe.each([
    ["brand"],
    ["secondary"],
    ["success"],
    ["warning"],
    ["danger"],
    ["info"],
  ] as const)("variant=%s", (v) => {
    it(`appearance default (outline) → ig-card-${v}`, () => {
      render(
        <Card variant={v} data-testid="c">
          x
        </Card>,
      );
      expect(screen.getByTestId("c")).toHaveClass(`ig-card-${v}`);
    });

    it(`appearance=filled → ig-card-${v}-filled`, () => {
      render(
        <Card variant={v} appearance="filled" data-testid="c">
          x
        </Card>,
      );
      expect(screen.getByTestId("c")).toHaveClass(`ig-card-${v}-filled`);
    });
  });

  it("appearance se ignora si no hay variant (card plana queda con solo ig-card)", () => {
    render(
      <Card appearance="filled" data-testid="c">
        x
      </Card>,
    );
    const el = screen.getByTestId("c");
    expect(el).toHaveClass("ig-card");
    expect(el.className).not.toMatch(/ig-card-(brand|secondary|success|warning|danger|info)/);
  });

  it("acumula modificadores bordered/elevated/glass/interactive", () => {
    render(
      <Card bordered elevated glass interactive data-testid="c">
        x
      </Card>,
    );
    const el = screen.getByTestId("c");
    expect(el).toHaveClass(
      "ig-card-bordered",
      "ig-card-elevated",
      "ig-card-glass",
      "ig-card-interactive",
    );
  });

  it("forwarda ref al div", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Card ref={ref}>x</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe("Card — tabIndex auto cuando actúa como botón", () => {
  it("interactive + role=button + onClick aplica tabIndex=0 sin prop explícita", () => {
    render(
      <Card interactive role="button" onClick={() => {}} data-testid="c">
        x
      </Card>,
    );
    expect(screen.getByTestId("c")).toHaveAttribute("tabindex", "0");
  });

  it("tabIndex explícito del consumer pisa el default (incluido -1)", () => {
    render(
      <Card
        interactive
        role="button"
        onClick={() => {}}
        tabIndex={-1}
        data-testid="c"
      >
        x
      </Card>,
    );
    expect(screen.getByTestId("c")).toHaveAttribute("tabindex", "-1");
  });

  it("sin las 3 condiciones, NO aplica tabIndex", () => {
    render(
      <Card interactive data-testid="c">
        x
      </Card>,
    );
    expect(screen.getByTestId("c")).not.toHaveAttribute("tabindex");
  });
});

describe("Card — keyboard activation cuando interactive + role=button", () => {
  it("Enter dispara onClick si interactive + role=button", async () => {
    const onClick = vi.fn();
    render(
      <Card
        interactive
        role="button"
        tabIndex={0}
        onClick={onClick}
        data-testid="c"
      >
        x
      </Card>,
    );
    const card = screen.getByTestId("c");
    card.focus();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("Space dispara onClick si interactive + role=button", async () => {
    const onClick = vi.fn();
    render(
      <Card
        interactive
        role="button"
        tabIndex={0}
        onClick={onClick}
        data-testid="c"
      >
        x
      </Card>,
    );
    const card = screen.getByTestId("c");
    card.focus();
    await userEvent.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("NO activa por teclado si falta role=button", async () => {
    const onClick = vi.fn();
    render(
      <Card interactive tabIndex={0} onClick={onClick} data-testid="c">
        x
      </Card>,
    );
    const card = screen.getByTestId("c");
    card.focus();
    await userEvent.keyboard("{Enter}");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("NO activa por teclado si no es interactive", async () => {
    const onClick = vi.fn();
    render(
      <Card role="button" tabIndex={0} onClick={onClick} data-testid="c">
        x
      </Card>,
    );
    const card = screen.getByTestId("c");
    card.focus();
    await userEvent.keyboard("{Enter}");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("encadena onKeyDown del consumer antes del handler interno", async () => {
    const order: string[] = [];
    const onKeyDown = vi.fn(() => order.push("consumer"));
    const onClick = vi.fn(() => order.push("click"));
    render(
      <Card
        interactive
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={onKeyDown}
        data-testid="c"
      >
        x
      </Card>,
    );
    const card = screen.getByTestId("c");
    card.focus();
    await userEvent.keyboard("{Enter}");
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["consumer", "click"]);
  });

  it("preventDefault en onKeyDown del consumer cancela la activación interna", async () => {
    const onKeyDown = vi.fn((e: React.KeyboardEvent) => {
      e.preventDefault();
    });
    const onClick = vi.fn();
    render(
      <Card
        interactive
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={onKeyDown}
        data-testid="c"
      >
        x
      </Card>,
    );
    const card = screen.getByTestId("c");
    card.focus();
    await userEvent.keyboard("{Enter}");
    expect(onKeyDown).toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Card subcomponentes", () => {
  it("renderiza header/body/footer/divider con clases correctas", () => {
    render(
      <Card data-testid="c">
        <CardHeader data-testid="h">Title</CardHeader>
        <CardBody data-testid="b">Body</CardBody>
        <CardDivider data-testid="d" />
        <CardFooter data-testid="f">Footer</CardFooter>
      </Card>,
    );
    expect(screen.getByTestId("h")).toHaveClass("ig-card-header");
    expect(screen.getByTestId("b")).toHaveClass("ig-card-body");
    expect(screen.getByTestId("d")).toHaveClass("ig-card-divider");
    expect(screen.getByTestId("f")).toHaveClass("ig-card-footer");
    expect(screen.getByTestId("d").tagName).toBe("HR");
  });

  it("CardImage usa ig-card-image-top con prop top", () => {
    render(<CardImage src="/x.png" alt="X" top data-testid="i" />);
    const img = screen.getByTestId("i");
    expect(img).toHaveClass("ig-card-image-top");
    expect(img).toHaveAttribute("alt", "X");
  });

  it("CardImage usa ig-card-image por defecto", () => {
    render(<CardImage src="/y.png" alt="Y" data-testid="i" />);
    expect(screen.getByTestId("i")).toHaveClass("ig-card-image");
  });
});

describe("Card — className merge", () => {
  it("mergea className del consumer sin pisar las clases del componente", () => {
    render(
      <Card
        variant="brand"
        bordered
        elevated
        className="my-card extra"
        data-testid="c"
      >
        x
      </Card>,
    );
    const el = screen.getByTestId("c");
    expect(el).toHaveClass("ig-card");
    expect(el).toHaveClass("ig-card-brand");
    expect(el).toHaveClass("ig-card-bordered");
    expect(el).toHaveClass("ig-card-elevated");
    expect(el).toHaveClass("my-card");
    expect(el).toHaveClass("extra");
  });
});
