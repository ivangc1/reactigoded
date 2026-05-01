import { describe, it, expect } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
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

  it("aplica variant outline por defecto", () => {
    render(
      <Card variant="brand" data-testid="c">
        x
      </Card>,
    );
    expect(screen.getByTestId("c")).toHaveClass("ig-card-brand");
    expect(screen.getByTestId("c")).not.toHaveClass("ig-card-brand-filled");
  });

  it("aplica variant filled con la clase correcta", () => {
    render(
      <Card variant="success" filled data-testid="c">
        x
      </Card>,
    );
    expect(screen.getByTestId("c")).toHaveClass("ig-card-success-filled");
    expect(screen.getByTestId("c")).not.toHaveClass("ig-card-success");
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
