import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionContent,
  useAccordion,
  useAccordionItem,
} from "./index";

type SingleAccordionTestProps = {
  defaultValue?: string | null;
  value?: string | null;
  collapsible?: boolean;
  onValueChange?: (value: string | null) => void;
  testId?: string;
};

function basicAccordion(props: SingleAccordionTestProps = {}) {
  const { testId, ...rest } = props;
  return (
    <Accordion type="single" data-testid={testId} {...rest}>
      <AccordionItem value="a">
        <AccordionHeader>Alpha</AccordionHeader>
        <AccordionContent>Contenido A</AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionHeader>Beta</AccordionHeader>
        <AccordionContent>Contenido B</AccordionContent>
      </AccordionItem>
      <AccordionItem value="c">
        <AccordionHeader>Gamma</AccordionHeader>
        <AccordionContent>Contenido C</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

describe("Accordion", () => {
  it("renderiza el contenedor con clase ig-accordion", () => {
    render(basicAccordion({ testId: "acc" }));
    expect(screen.getByTestId("acc")).toHaveClass("ig-accordion");
  });

  it("headers usan aria-expanded y aria-controls cruzados con el panel", () => {
    render(basicAccordion({ defaultValue: "a" }));
    const header = screen.getByRole("button", { name: "Alpha" });
    expect(header).toHaveAttribute("aria-expanded", "true");
    const panel = screen.getByRole("region", { name: "Alpha" });
    expect(header).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveAttribute("aria-labelledby", header.id);
  });

  it("modo single: solo un panel visible", () => {
    render(basicAccordion({ defaultValue: "b" }));
    expect(screen.getByText("Contenido B")).toBeInTheDocument();
    expect(screen.queryByText("Contenido A")).not.toBeInTheDocument();
    expect(screen.queryByText("Contenido C")).not.toBeInTheDocument();
  });

  it("click en header abre el item (uncontrolled, single)", async () => {
    const user = userEvent.setup();
    render(basicAccordion());
    await user.click(screen.getByRole("button", { name: "Beta" }));
    expect(screen.getByText("Contenido B")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Beta" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("single sin collapsible: re-clicar el item abierto no lo cierra", async () => {
    const user = userEvent.setup();
    render(basicAccordion({ defaultValue: "a" }));
    const header = screen.getByRole("button", { name: "Alpha" });
    await user.click(header);
    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Contenido A")).toBeInTheDocument();
  });

  it("single + collapsible: re-clicar cierra el item", async () => {
    const user = userEvent.setup();
    render(basicAccordion({ defaultValue: "a", collapsible: true }));
    const header = screen.getByRole("button", { name: "Alpha" });
    await user.click(header);
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Contenido A")).not.toBeInTheDocument();
  });

  it("modo multiple: varios items abiertos a la vez", async () => {
    const user = userEvent.setup();
    render(
      <Accordion type="multiple" defaultValue={["a"]}>
        <AccordionItem value="a">
          <AccordionHeader>Alpha</AccordionHeader>
          <AccordionContent>Contenido A</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionHeader>Beta</AccordionHeader>
          <AccordionContent>Contenido B</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    await user.click(screen.getByRole("button", { name: "Beta" }));
    expect(screen.getByText("Contenido A")).toBeInTheDocument();
    expect(screen.getByText("Contenido B")).toBeInTheDocument();
  });

  it("modo controlado dispara onValueChange (single)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function Wrapper() {
      const [v, setV] = useState<string | null>("a");
      return (
        <Accordion
          type="single"
          collapsible
          value={v}
          onValueChange={(next) => {
            onChange(next);
            setV(next);
          }}
        >
          <AccordionItem value="a">
            <AccordionHeader>A</AccordionHeader>
            <AccordionContent>PA</AccordionContent>
          </AccordionItem>
          <AccordionItem value="b">
            <AccordionHeader>B</AccordionHeader>
            <AccordionContent>PB</AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    }
    render(<Wrapper />);
    await user.click(screen.getByRole("button", { name: "B" }));
    expect(onChange).toHaveBeenCalledWith("b");
    expect(screen.getByText("PB")).toBeInTheDocument();
  });

  it("flecha abajo mueve foco al siguiente header", async () => {
    const user = userEvent.setup();
    render(basicAccordion({ defaultValue: "a" }));
    const alpha = screen.getByRole("button", { name: "Alpha" });
    alpha.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "Beta" })).toHaveFocus();
  });

  it("flecha arriba cicla al último", async () => {
    const user = userEvent.setup();
    render(basicAccordion({ defaultValue: "a" }));
    screen.getByRole("button", { name: "Alpha" }).focus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("button", { name: "Gamma" })).toHaveFocus();
  });

  it("Home/End saltan al primero/último header", async () => {
    const user = userEvent.setup();
    render(basicAccordion({ defaultValue: "a" }));
    screen.getByRole("button", { name: "Beta" }).focus();
    await user.keyboard("{End}");
    expect(screen.getByRole("button", { name: "Gamma" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("button", { name: "Alpha" })).toHaveFocus();
  });

  it("headers disabled se saltan en la navegación por teclado", async () => {
    const user = userEvent.setup();
    render(
      <Accordion type="single" defaultValue="a" collapsible>
        <AccordionItem value="a">
          <AccordionHeader>A</AccordionHeader>
          <AccordionContent>PA</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionHeader disabled>B</AccordionHeader>
          <AccordionContent>PB</AccordionContent>
        </AccordionItem>
        <AccordionItem value="c">
          <AccordionHeader>C</AccordionHeader>
          <AccordionContent>PC</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    screen.getByRole("button", { name: "A" }).focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "C" })).toHaveFocus();
  });

  it("forceMount mantiene el panel en el DOM cuando está cerrado", () => {
    render(
      <Accordion type="single" defaultValue="a" collapsible>
        <AccordionItem value="a">
          <AccordionHeader>A</AccordionHeader>
          <AccordionContent>PA</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionHeader>B</AccordionHeader>
          <AccordionContent forceMount>PB</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    const pb = screen.getByText("PB");
    expect(pb).toBeInTheDocument();
    expect(pb).not.toBeVisible();
  });

  it("hideIcon oculta el icono y onOpenChange dispara con el siguiente estado", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="a">
          <AccordionHeader hideIcon onOpenChange={onOpenChange}>
            Alpha
          </AccordionHeader>
          <AccordionContent>Contenido A</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    const header = screen.getByRole("button", { name: "Alpha" });
    expect(header.querySelector(".ig-accordion-icon")).toBeNull();
    await user.click(header);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("AccordionItem-open class se aplica al item abierto", () => {
    render(basicAccordion({ defaultValue: "b", testId: "acc" }));
    const items = screen
      .getByTestId("acc")
      .querySelectorAll(".ig-accordion-item");
    expect(items[0]).not.toHaveClass("ig-accordion-item-open");
    expect(items[1]).toHaveClass("ig-accordion-item-open");
  });
});

describe("useAccordion fuera de provider", () => {
  it("useAccordion lanza error útil", () => {
    function Boom() {
      useAccordion();
      return null;
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Boom />)).toThrow(/Accordion/);
    spy.mockRestore();
  });

  it("useAccordionItem lanza error útil", () => {
    function Boom() {
      useAccordionItem();
      return null;
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Boom />)).toThrow(/AccordionItem/);
    spy.mockRestore();
  });
});
