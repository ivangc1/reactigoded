import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Timeline, TimelineItem } from "./index";

describe("Timeline", () => {
  it("renderiza con role=list y aria-label", () => {
    render(
      <Timeline aria-label="Historial">
        <TimelineItem date="X" title="Y" />
      </Timeline>,
    );
    const list = screen.getByRole("list", { name: "Historial" });
    expect(list).toHaveClass("ig-timeline");
  });

  it("aplica clases ig-timeline a los items y dot al span", () => {
    render(
      <Timeline data-testid="t">
        <TimelineItem date="1" title="A" dotVariant="brand" />
        <TimelineItem date="2" title="B" />
      </Timeline>,
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    items.forEach((item) => expect(item).toHaveClass("ig-timeline-item"));
    const [first, second] = items;
    expect(first?.querySelector(".ig-timeline-dot")).toHaveClass(
      "ig-timeline-dot-brand",
    );
    expect(second?.querySelector(".ig-timeline-dot")).not.toHaveClass(
      "ig-timeline-dot-default",
    );
  });

  it("muestra date/title/description por defecto", () => {
    render(
      <Timeline>
        <TimelineItem
          date="15 Nov"
          title="Lanzamiento"
          description="MVP en producción"
        />
      </Timeline>,
    );
    expect(screen.getByText("15 Nov")).toHaveClass("ig-timeline-date");
    expect(screen.getByText("Lanzamiento")).toHaveClass("ig-timeline-title");
    expect(screen.getByText("MVP en producción")).toHaveClass(
      "ig-timeline-description",
    );
  });

  it("children sustituyen al contenido por defecto", () => {
    render(
      <Timeline>
        <TimelineItem date="ignorado" title="ignorado">
          <span data-testid="custom">Custom</span>
        </TimelineItem>
      </Timeline>,
    );
    expect(screen.getByTestId("custom")).toBeInTheDocument();
    expect(screen.queryByText("ignorado")).not.toBeInTheDocument();
  });

  it("dotContent se renderiza dentro del dot", () => {
    render(
      <Timeline>
        <TimelineItem
          title="Paso 1"
          dotContent={<span data-testid="num">1</span>}
        />
      </Timeline>,
    );
    const dot = screen.getByTestId("num").closest(".ig-timeline-dot");
    expect(dot).not.toBeNull();
  });

  it("el dot es decorativo (aria-hidden)", () => {
    render(
      <Timeline>
        <TimelineItem title="x" />
      </Timeline>,
    );
    const dot = screen
      .getByRole("listitem")
      .querySelector(".ig-timeline-dot");
    expect(dot).toHaveAttribute("aria-hidden", "true");
  });
});
