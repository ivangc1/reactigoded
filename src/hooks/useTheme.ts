import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

export interface UseThemeReturn {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const isTheme = (value: string | undefined): value is Theme =>
  value === "light" || value === "dark";

const readDomTheme = (): Theme => {
  if (typeof document === "undefined") return "dark";
  const current = document.documentElement.dataset["theme"];
  return isTheme(current) ? current : "dark";
};

const subscribeDomTheme = (notify: () => void): (() => void) => {
  if (typeof document === "undefined") return () => {};
  const observer = new MutationObserver(() => {
    notify();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => {
    observer.disconnect();
  };
};

const getServerSnapshot = (): Theme => "dark";

/**
 * Hook para manejar el tema (light/dark).
 *
 * El atributo `data-theme` de `<html>` es la única fuente de verdad: el
 * hook lo observa con un `MutationObserver` vía `useSyncExternalStore`
 * y se mantiene sincronizado con cualquier escritor (otro `useTheme`,
 * `<ThemeSwitch>`, el script anti-flash del README o código del
 * consumer). `setTheme` escribe el atributo y deja que el observer
 * propague el cambio.
 *
 * **SSR**: en el servidor devuelve `dark` (default dark-first del DS
 * desde `1.0.0-beta.3`). Hidrata en cliente leyendo el atributo. Para
 * evitar el flash inicial, inyecta el script anti-flash documentado en
 * el README §"Tema light/dark".
 *
 * @example
 * function ThemeToggle() {
 *   const { theme, toggleTheme } = useTheme();
 *   return (
 *     <button type="button" onClick={toggleTheme} aria-label={`Tema actual: ${theme}`}>
 *       {theme === "dark" ? "☀" : "🌙"}
 *     </button>
 *   );
 * }
 *
 * @example
 * // Forzar tema desde una preferencia de usuario.
 * function SettingsPanel({ pref }: { pref: "light" | "dark" | "auto" }) {
 *   const { setTheme } = useTheme();
 *   useEffect(() => {
 *     if (pref !== "auto") setTheme(pref);
 *   }, [pref, setTheme]);
 *   return null;
 * }
 */
export function useTheme(): UseThemeReturn {
  const theme = useSyncExternalStore(
    subscribeDomTheme,
    readDomTheme,
    getServerSnapshot,
  );

  const setTheme = useCallback((next: Theme) => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset["theme"] = next;
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, setTheme, toggleTheme };
}
