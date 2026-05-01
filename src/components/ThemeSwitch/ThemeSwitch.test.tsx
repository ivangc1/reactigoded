import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeSwitch } from "./index";

describe("ThemeSwitch", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });

  it("renderiza por defecto en light y muestra label 'Light'", () => {
    render(<ThemeSwitch />);
    expect(screen.getByRole("switch")).not.toBeChecked();
    expect(screen.getByText("Light")).toBeInTheDocument();
  });

  it("hidrata desde localStorage si hay valor guardado", () => {
    window.localStorage.setItem("theme", "dark");
    render(<ThemeSwitch />);
    expect(screen.getByRole("switch")).toBeChecked();
    expect(screen.getByText("Dark")).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it("toggle aplica data-theme y persiste en localStorage", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitch />);
    await user.click(screen.getByRole("switch"));
    expect(screen.getByRole("switch")).toBeChecked();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(window.localStorage.getItem("theme")).toBe("dark");
  });

  it("respeta defaultTheme cuando no hay nada en storage", () => {
    render(<ThemeSwitch defaultTheme="dark" />);
    expect(screen.getByRole("switch")).toBeChecked();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it("modo controlado: respeta theme y dispara onThemeChange", async () => {
    const user = userEvent.setup();
    const onThemeChange = vi.fn();
    render(<ThemeSwitch theme="dark" onThemeChange={onThemeChange} />);
    expect(screen.getByRole("switch")).toBeChecked();
    await user.click(screen.getByRole("switch"));
    expect(onThemeChange).toHaveBeenCalledWith("light");
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("storageKey={null} no persiste en localStorage", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitch storageKey={null} />);
    await user.click(screen.getByRole("switch"));
    expect(window.localStorage.getItem("theme")).toBeNull();
  });

  it("attribute={null} no aplica nada al <html>", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitch attribute={null} />);
    await user.click(screen.getByRole("switch"));
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });

  it("attribute custom usa el atributo indicado", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitch attribute="data-mode" />);
    await user.click(screen.getByRole("switch"));
    expect(document.documentElement).toHaveAttribute("data-mode", "dark");
    document.documentElement.removeAttribute("data-mode");
  });

  it("label custom como función recibe el tema actual", async () => {
    const user = userEvent.setup();
    const label = (t: "light" | "dark") => (t === "dark" ? "🌙" : "☀️");
    render(<ThemeSwitch label={label} />);
    expect(screen.getByText("☀️")).toBeInTheDocument();
    await user.click(screen.getByRole("switch"));
    expect(screen.getByText("🌙")).toBeInTheDocument();
  });

  it("aria-label por defecto en español", () => {
    render(<ThemeSwitch />);
    expect(screen.getByRole("switch")).toHaveAttribute(
      "aria-label",
      "Cambiar entre tema claro y oscuro",
    );
  });

  it("ignora valor inválido en localStorage", () => {
    window.localStorage.setItem("theme", "neon");
    render(<ThemeSwitch defaultTheme="light" />);
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("storageKey custom lee y escribe en otra clave", async () => {
    window.localStorage.setItem("ig:theme", "dark");
    const user = userEvent.setup();
    render(<ThemeSwitch storageKey="ig:theme" />);
    expect(screen.getByRole("switch")).toBeChecked();
    await user.click(screen.getByRole("switch"));
    expect(window.localStorage.getItem("ig:theme")).toBe("light");
    expect(window.localStorage.getItem("theme")).toBeNull();
  });

  it("primer render sin storage previo arranca en light", () => {
    render(<ThemeSwitch />);
    expect(screen.getByRole("switch")).not.toBeChecked();
  });
});
