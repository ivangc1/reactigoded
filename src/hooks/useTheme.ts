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
 * Lee el atributo `data-theme` de `<html>` al montar; si no existe usa `dark`.
 * Cualquier cambio del estado actualiza el atributo del DOM (la fuente de
 * verdad para el CSS está en el atributo, no en React).
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
