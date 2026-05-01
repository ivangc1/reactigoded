import { describe, it, expect } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { Breadcrumb } from "./Breadcrumb";
import { BreadcrumbItem } from "./BreadcrumbItem";

describe("Breadcrumb", () => {
  it("renderiza nav con aria-label por defecto", () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem href="/">Inicio</BreadcrumbItem>
      </Breadcrumb>,
    );
    const nav = screen.getByRole("navigation", { name: "Migas de pan" });
    expect(nav).toHaveClass("ig-breadcrumb");
  });

  it("aria-label custom", () => {
    render(
      <Breadcrumb ariaLabel="Ruta">
        <BreadcrumbItem href="/">x</BreadcrumbItem>
      </Breadcrumb>,
    );
    expect(screen.getByRole("navigation", { name: "Ruta" })).toBeInTheDocument();
  });

  it("intercala separator entre items pero no después del último", () => {
    render(
      <Breadcrumb separator=">">
        <BreadcrumbItem href="/">A</BreadcrumbItem>
        <BreadcrumbItem href="/b">B</BreadcrumbItem>
        <BreadcrumbItem current>C</BreadcrumbItem>
      </Breadcrumb>,
    );
    const seps = screen.getAllByText(">");
    expect(seps).toHaveLength(2);
    seps.forEach((s) => {
      expect(s).toHaveClass("ig-breadcrumb-separator");
      expect(s).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("BreadcrumbItem normal renderiza <a> con clase ig-breadcrumb-item", () => {
    render(<BreadcrumbItem href="/x">Link</BreadcrumbItem>);
    const a = screen.getByRole("link", { name: "Link" });
    expect(a).toHaveClass("ig-breadcrumb-item");
    expect(a).toHaveAttribute("href", "/x");
  });

  it("BreadcrumbItem current renderiza <span aria-current=page>", () => {
    render(<BreadcrumbItem current>Actual</BreadcrumbItem>);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    const cur = screen.getByText("Actual");
    expect(cur.tagName).toBe("SPAN");
    expect(cur).toHaveAttribute("aria-current", "page");
    expect(cur).toHaveClass("ig-breadcrumb-current");
  });

  it("forwarda ref al nav", () => {
    const ref = createRef<HTMLElement>();
    render(
      <Breadcrumb ref={ref}>
        <BreadcrumbItem current>x</BreadcrumbItem>
      </Breadcrumb>,
    );
    expect(ref.current?.tagName).toBe("NAV");
  });
});
