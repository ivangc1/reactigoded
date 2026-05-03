import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabList, Tab, TabPanel, useTabs } from "./index";

function basicTabs(props?: Partial<React.ComponentProps<typeof Tabs>>) {
  return (
    <Tabs {...props}>
      <TabList aria-label="Demo">
        <Tab value="a">Alpha</Tab>
        <Tab value="b">Beta</Tab>
        <Tab value="c">Gamma</Tab>
      </TabList>
      <TabPanel value="a">Contenido A</TabPanel>
      <TabPanel value="b">Contenido B</TabPanel>
      <TabPanel value="c">Contenido C</TabPanel>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("renderiza tablist con role correcto y orientación", () => {
    render(basicTabs({ defaultValue: "a" }));
    const list = screen.getByRole("tablist", { name: "Demo" });
    expect(list).toHaveAttribute("aria-orientation", "horizontal");
  });

  it("Tab activo lleva aria-selected=true y tabindex=0; los demás false/-1", () => {
    render(basicTabs({ defaultValue: "b" }));
    const a = screen.getByRole("tab", { name: "Alpha" });
    const b = screen.getByRole("tab", { name: "Beta" });
    expect(b).toHaveAttribute("aria-selected", "true");
    expect(b).toHaveAttribute("tabindex", "0");
    expect(a).toHaveAttribute("aria-selected", "false");
    expect(a).toHaveAttribute("tabindex", "-1");
  });

  it("aria-controls y aria-labelledby cruzan tab/panel", () => {
    render(basicTabs({ defaultValue: "a" }));
    const tab = screen.getByRole("tab", { name: "Alpha" });
    const panel = screen.getByRole("tabpanel");
    expect(tab).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveAttribute("aria-labelledby", tab.id);
  });

  it("muestra solo el panel del tab activo", () => {
    render(basicTabs({ defaultValue: "b" }));
    expect(screen.getByText("Contenido B")).toBeInTheDocument();
    expect(screen.queryByText("Contenido A")).not.toBeInTheDocument();
    expect(screen.queryByText("Contenido C")).not.toBeInTheDocument();
  });

  it("sin value/defaultValue auto-selecciona el primer Tab montado", () => {
    // Regresión documentada por la auditoría: cuando register tenía
    // deps [] y leía `internal === ""` por closure, el último Tab en
    // montar ganaba (Tab C activo en lugar de Tab A). El fix actual
    // lee desde internalRef sincronizado y preserva la primera
    // selección.
    render(basicTabs());
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByRole("tab", { name: "Gamma" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByText("Contenido A")).toBeInTheDocument();
  });

  it("auto-select inicial NO dispara onValueChange (silent)", () => {
    // Regresión F.3: el auto-select del primer Tab no es acción del
    // usuario y no debe filtrarse a onValueChange. El consumer puede
    // tener side-effects (analytics, fetch) que no deben dispararse al
    // mount.
    const onValueChange = vi.fn();
    render(
      <Tabs onValueChange={onValueChange}>
        <TabList aria-label="silent">
          <Tab value="a">A</Tab>
          <Tab value="b">B</Tab>
        </TabList>
        <TabPanel value="a">PA</TabPanel>
      </Tabs>,
    );
    expect(screen.getByRole("tab", { name: "A" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("click en Tab SÍ dispara onValueChange (acción del usuario)", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Tabs defaultValue="a" onValueChange={onValueChange}>
        <TabList aria-label="user-action">
          <Tab value="a">A</Tab>
          <Tab value="b">B</Tab>
        </TabList>
        <TabPanel value="a">PA</TabPanel>
        <TabPanel value="b">PB</TabPanel>
      </Tabs>,
    );
    await user.click(screen.getByRole("tab", { name: "B" }));
    expect(onValueChange).toHaveBeenCalledWith("b");
  });

  it("controlled con value='' NO auto-selecciona (consumer manda)", () => {
    // En modo controlled el internalRef sigue en "" pero NO debe
    // auto-seleccionar el primero — el consumer manda y "" significa
    // "ningún tab activo".
    render(
      <Tabs value="">
        <TabList aria-label="Demo">
          <Tab value="a">Alpha</Tab>
          <Tab value="b">Beta</Tab>
        </TabList>
        <TabPanel value="a">PA</TabPanel>
        <TabPanel value="b">PB</TabPanel>
      </Tabs>,
    );
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("click cambia tab (uncontrolled)", async () => {
    const user = userEvent.setup();
    render(basicTabs({ defaultValue: "a" }));
    await user.click(screen.getByRole("tab", { name: "Beta" }));
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Contenido B")).toBeInTheDocument();
  });

  it("modo controlado: dispara onValueChange y respeta value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function Wrapper() {
      const [v, setV] = useState("a");
      return (
        <Tabs
          value={v}
          onValueChange={(next) => {
            onChange(next);
            setV(next);
          }}
        >
          <TabList>
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
          <TabPanel value="a">PA</TabPanel>
          <TabPanel value="b">PB</TabPanel>
        </Tabs>
      );
    }
    render(<Wrapper />);
    await user.click(screen.getByRole("tab", { name: "B" }));
    expect(onChange).toHaveBeenCalledWith("b");
    expect(screen.getByText("PB")).toBeInTheDocument();
  });

  it("flecha derecha mueve foco al siguiente tab y lo activa", async () => {
    const user = userEvent.setup();
    render(basicTabs({ defaultValue: "a" }));
    const a = screen.getByRole("tab", { name: "Alpha" });
    a.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("Home/End saltan al primero/último", async () => {
    const user = userEvent.setup();
    render(basicTabs({ defaultValue: "b" }));
    screen.getByRole("tab", { name: "Beta" }).focus();
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Gamma" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("keepMounted mantiene el panel oculto en el DOM", () => {
    render(
      <Tabs defaultValue="a">
        <TabList>
          <Tab value="a">A</Tab>
          <Tab value="b">B</Tab>
        </TabList>
        <TabPanel value="a">PA</TabPanel>
        <TabPanel value="b" keepMounted>
          PB
        </TabPanel>
      </Tabs>,
    );
    const pb = screen.getByText("PB");
    expect(pb).toBeInTheDocument();
    expect(pb).not.toBeVisible();
  });

  describe.each([
    ["brand"],
    ["secondary"],
    ["success"],
    ["warning"],
    ["danger"],
    ["info"],
  ] as const)("variant=%s", (v) => {
    it(`aplica clase ig-tabs-${v}`, () => {
      render(
        <Tabs defaultValue="a" variant={v} data-testid="t">
          <TabList>
            <Tab value="a">A</Tab>
          </TabList>
          <TabPanel value="a">PA</TabPanel>
        </Tabs>,
      );
      expect(screen.getByTestId("t")).toHaveClass(`ig-tabs-${v}`);
    });
  });

  it("pills añade ig-tabs-pills", () => {
    render(
      <Tabs defaultValue="a" pills data-testid="t">
        <TabList>
          <Tab value="a">A</Tab>
        </TabList>
        <TabPanel value="a">PA</TabPanel>
      </Tabs>,
    );
    expect(screen.getByTestId("t")).toHaveClass("ig-tabs-pills");
  });

  it("orientation=vertical añade clase y aria-orientation", () => {
    render(
      <Tabs defaultValue="a" orientation="vertical" data-testid="t">
        <TabList>
          <Tab value="a">A</Tab>
        </TabList>
        <TabPanel value="a">PA</TabPanel>
      </Tabs>,
    );
    expect(screen.getByTestId("t")).toHaveClass("ig-tabs-vertical");
    expect(screen.getByRole("tablist")).toHaveAttribute(
      "aria-orientation",
      "vertical",
    );
  });
});

describe("useTabs fuera de provider", () => {
  it("lanza error útil", () => {
    function Boom() {
      useTabs();
      return null;
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Boom />)).toThrow(/Tabs/);
    spy.mockRestore();
  });
});

describe("Tabs — className merge", () => {
  it("Tabs root, TabList, Tab y TabPanel conservan su clase base con className consumer", () => {
    render(
      <Tabs defaultValue="a" variant="brand" className="my-tabs extra" data-testid="root">
        <TabList className="my-list">
          <Tab value="a" className="my-tab">A</Tab>
        </TabList>
        <TabPanel value="a" className="my-panel">PA</TabPanel>
      </Tabs>,
    );
    const root = screen.getByTestId("root");
    expect(root).toHaveClass("ig-tabs");
    expect(root).toHaveClass("ig-tabs-brand");
    expect(root).toHaveClass("my-tabs");
    expect(root).toHaveClass("extra");

    const tab = screen.getByRole("tab", { name: "A" });
    expect(tab).toHaveClass("ig-tab");
    expect(tab).toHaveClass("my-tab");
  });
});
