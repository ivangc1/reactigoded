import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

export interface UseThemeReturn {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const isTheme = (value: string | undefined): value is Theme =>
  value === "light" || value === "dark";

/**
 * Hook para manejar el tema (light/dark).
 *
 * Lee el atributo `data-theme` de `<html>` al montar; si no existe usa `dark`
 * (default dark-first del DS desde 1.0.0-beta.3). Cualquier cambio del
 * estado actualiza el atributo del DOM (la fuente de verdad para el CSS
 * está en el atributo, no en React).
 *
 * **SSR**: el primer render server devuelve `dark` (no toca DOM). Hidrata
 * en cliente leyendo `data-theme`. Para evitar el flash inicial, inyecta el
 * script anti-flash documentado en el README §"Tema light/dark".
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
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    const current = document.documentElement.dataset["theme"];
    return isTheme(current) ? current : "dark";
  });

  useEffect(() => {
    document.documentElement.dataset["theme"] = theme;
  }, [theme]);

  const toggleTheme = (): void => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return { theme, setTheme, toggleTheme };
}
