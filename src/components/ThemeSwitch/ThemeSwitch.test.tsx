import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
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

  it("renderiza por defecto en dark y muestra label 'Dark' (dark-first desde 1.0.0-beta.3)", () => {
    render(<ThemeSwitch />);
    expect(screen.getByRole("switch")).toBeChecked();
    expect(screen.getByText("Dark")).toBeInTheDocument();
  });

  it("uncontrolled: click actualiza UI vía override React, no vía StorageEvent (regresión beta.20 derive)", async () => {
    // Anti-regresión del bug del intento 1: si setDerivedValue fuese
    // writeStoredTheme (escritura directa a localStorage), el
    // useSyncExternalStore NO notificaría same-tab y el state React no
    // cambiaría, dejando el switch checked tras el toggle.
    // setDerivedValue debe actualizar una fuente React local (override).
    const user = userEvent.setup();
    render(<ThemeSwitch defaultTheme="dark" />);
    const sw = screen.getByRole("switch");
    expect(sw).toBeChecked();
    await user.click(sw);
    expect(sw).not.toBeChecked();
    expect(window.localStorage.getItem("theme")).toBe("light");
  });

  it("hidrata desde localStorage si hay valor guardado (dark)", () => {
    window.localStorage.setItem("theme", "dark");
    render(<ThemeSwitch />);
    expect(screen.getByRole("switch")).toBeChecked();
    expect(screen.getByText("Dark")).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it("storage='light' GANA al default dark-first (regression beta.4)", () => {
    // Caso crítico: el DS arranca dark por defecto desde 1.0.0-beta.3, pero
    // si el usuario YA persistió 'light' en una sesión previa, ese valor
    // debe ganar al default. Sin esto, el default pisaría su preferencia.
    window.localStorage.setItem("theme", "light");
    render(<ThemeSwitch />);
    expect(screen.getByRole("switch")).not.toBeChecked();
    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    // El effect aplica current="light" al storage, NO sobrescribe a dark.
    expect(window.localStorage.getItem("theme")).toBe("light");
  });

  it("toggle desde dark→light aplica data-theme y persiste en localStorage", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitch />);
    await user.click(screen.getByRole("switch"));
    expect(screen.getByRole("switch")).not.toBeChecked();
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(window.localStorage.getItem("theme")).toBe("light");
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
    // Default dark; primer click → light.
    await user.click(screen.getByRole("switch"));
    expect(document.documentElement).toHaveAttribute("data-mode", "light");
    document.documentElement.removeAttribute("data-mode");
  });

  it("label custom como función recibe el tema actual", async () => {
    const user = userEvent.setup();
    const label = (t: "light" | "dark") => (t === "dark" ? "🌙" : "☀️");
    render(<ThemeSwitch label={label} />);
    // Default dark.
    expect(screen.getByText("🌙")).toBeInTheDocument();
    await user.click(screen.getByRole("switch"));
    expect(screen.getByText("☀️")).toBeInTheDocument();
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
    // Storage inválido → cae a defaultTheme prop = light.
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

  it("primer render sin storage previo arranca en dark (dark-first)", () => {
    render(<ThemeSwitch />);
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("aria-label se puede sobrescribir vía rest (regression beta.3)", () => {
    render(<ThemeSwitch aria-label="Switch tema personalizado" />);
    expect(screen.getByRole("switch")).toHaveAttribute(
      "aria-label",
      "Switch tema personalizado",
    );
  });
});

describe("ThemeSwitch — respects pre-set html[data-theme] on mount (B-08)", () => {
  // Bloque self-contained: cleanup propio (no hereda del describe anterior),
  // así pasa estable aunque cambie el orden de ejecución entre suites.
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-mode");
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-mode");
  });

  it("conserva data-theme='light' pre-puesto cuando no hay storage ni override", () => {
    document.documentElement.setAttribute("data-theme", "light");
    render(<ThemeSwitch />);
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("conserva data-theme='dark' pre-puesto cuando no hay storage ni override", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    render(<ThemeSwitch />);
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("sin attr y sin storage usa defaultTheme='light'", () => {
    render(<ThemeSwitch defaultTheme="light" />);
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("attribute={null} ignora data-theme pre-puesto y usa defaultTheme", () => {
    // Anti-regresión: si attribute=null el componente NO debe leer ni escribir
    // el atributo. defaultTheme='dark' debe ganar al data-theme='light' del DOM.
    document.documentElement.setAttribute("data-theme", "light");
    render(<ThemeSwitch attribute={null} defaultTheme="dark" />);
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("data-theme con valor inválido ('system') cae a defaultTheme", () => {
    // El derive solo acepta 'light' o 'dark'. Cualquier otra cosa
    // (e.g. 'system' inyectado por un anti-flash agresivo, '' vacío,
    // 'auto') debe ignorarse y caer a defaultTheme.
    document.documentElement.setAttribute("data-theme", "system");
    render(<ThemeSwitch defaultTheme="light" />);
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  /**
   * Smoke SSR. Valida:
   * - ThemeSwitch es importable desde react-dom/server.
   * - renderToString no lanza.
   * - El HTML emitido contiene role="switch".
   * - El HTML emitido NO incluye data-theme= (useEffect no corre en server).
   *
   * NO valida:
   * - El branch `typeof document === "undefined"` del derive (jsdom siempre
   *   tiene document; borrarlo rompe el runner). La defensa de ese branch es
   *   "by construction" en el comentario del código del derive. Pospuesto
   *   en docs/POST_RC1_BACKLOG.md como "ThemeSwitch SSR test versión A".
   */
  it("SSR (renderToString) no falla y emite el switch con defaultTheme", () => {
    // eslint-disable-next-line testing-library/render-result-naming-convention -- this is renderToString from react-dom/server, not testing-library's render
    const html = renderToString(<ThemeSwitch defaultTheme="light" />);
    expect(html).toContain('role="switch"');
    expect(html).not.toContain("data-theme=");
  });
});
