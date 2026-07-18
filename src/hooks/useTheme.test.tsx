import { afterEach, beforeEach, describe, it, expect } from "vitest";
import { allowIncidentalConsoleError } from "@/test-utils/allowIncidentalConsoleError";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useTheme } from "./useTheme";

function ThemeProbe() {
  const { theme, setTheme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="value">{theme}</span>
      <button
        type="button"
        onClick={() => {
          setTheme("light");
        }}
      >
        set-light
      </button>
      <button
        type="button"
        onClick={() => {
          setTheme("dark");
        }}
      >
        set-dark
      </button>
      <button type="button" onClick={toggleTheme}>
        toggle
      </button>
    </div>
  );
}

// #28 cat 3 — el MutationObserver/matchMedia dispara un rerender en microtask
// fuera del act() que `waitFor` no alcanza. Las aserciones son ROBUSTAS
// (await waitFor / await act sobre el valor, no una carrera sincrónica), así
// que el residual de act es incidental, no un test roto → suprimimos SOLO ese
// patrón; cualquier otro console.error sigue fallando.
allowIncidentalConsoleError(
  /An update to .* inside a test was not wrapped in act/,
);

describe("useTheme", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });

  it("snapshot inicial cae a 'dark' si no hay data-theme (dark-first)", () => {
    render(<ThemeProbe />);
    expect(screen.getByTestId("value")).toHaveTextContent("dark");
  });

  it("lee data-theme existente al montar", () => {
    document.documentElement.dataset["theme"] = "light";
    render(<ThemeProbe />);
    expect(screen.getByTestId("value")).toHaveTextContent("light");
  });

  it("setTheme escribe el atributo y propaga el nuevo valor", async () => {
    // H-11: setTheme escribe data-theme → MutationObserver dispara
    // en microtask, fuera del act() del user.click. waitFor envuelve
    // cada intento en act() y consume el rerender del observer sin
    // generar warning.
    const user = userEvent.setup();
    render(<ThemeProbe />);
    await user.click(screen.getByText("set-light"));
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    await waitFor(() => {
      expect(screen.getByTestId("value")).toHaveTextContent("light");
    });
  });

  it("toggleTheme alterna basado en el snapshot vivo del DOM", async () => {
    const user = userEvent.setup();
    render(<ThemeProbe />);
    await user.click(screen.getByText("toggle"));
    await waitFor(() => {
      expect(screen.getByTestId("value")).toHaveTextContent("light");
    });
    await user.click(screen.getByText("toggle"));
    await waitFor(() => {
      expect(screen.getByTestId("value")).toHaveTextContent("dark");
    });
  });

  it("se sincroniza con cambios externos del atributo (MutationObserver)", async () => {
    render(<ThemeProbe />);
    expect(screen.getByTestId("value")).toHaveTextContent("dark");
    // Otro escritor (ThemeSwitch, script anti-flash, otro hook) toca
    // data-theme → el observer debe disparar y el snapshot actualizarse.
    await act(async () => {
      document.documentElement.dataset["theme"] = "light";
      // happy-dom dispara MutationObserver tras un microtask.
      await Promise.resolve();
    });
    expect(screen.getByTestId("value")).toHaveTextContent("light");
  });

  it("dos instancias de useTheme se mantienen alineadas tras setTheme externo", async () => {
    function Twin() {
      const a = useTheme();
      const b = useTheme();
      return (
        <div>
          <span data-testid="a">{a.theme}</span>
          <span data-testid="b">{b.theme}</span>
          <button
            type="button"
            onClick={() => {
              a.setTheme("light");
            }}
          >
            a-light
          </button>
        </div>
      );
    }
    const user = userEvent.setup();
    render(<Twin />);
    await user.click(screen.getByText("a-light"));
    // H-11: ambos snapshots se sincronizan vía MutationObserver tras
    // microtask. waitFor cubre el rerender fuera del act() del click.
    await waitFor(() => {
      expect(screen.getByTestId("a")).toHaveTextContent("light");
      expect(screen.getByTestId("b")).toHaveTextContent("light");
    });
  });
});
