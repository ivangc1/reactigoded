import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabList, Tab, TabPanel, useTabs } from "./index";

function basicTabs(props?: Partial<React.ComponentProps<typeof Tabs>>) {
  return (
    <Tabs {...props}>
      <TabList ariaLabel="Demo">
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

  it("aplica variant y pills y vertical orientation", () => {
    render(
      <Tabs defaultValue="a" variant="brand" pills orientation="vertical" data-testid="t">
        <TabList>
          <Tab value="a">A</Tab>
        </TabList>
        <TabPanel value="a">PA</TabPanel>
      </Tabs>,
    );
    expect(screen.getByTestId("t")).toHaveClass(
      "ig-tabs",
      "ig-tabs-brand",
      "ig-tabs-pills",
      "ig-tabs-vertical",
    );
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
