import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type Ref,
} from "react";
import { Switch, type SwitchProps } from "../Switch";
import type { Theme } from "../../hooks/useTheme";

export interface ThemeSwitchProps
  extends Omit<SwitchProps, "checked" | "defaultChecked" | "onChange" | "ref"> {
  /** Tema actual (modo controlado). */
  theme?: Theme;
  /** Tema inicial (modo no controlado). Si se omite, se intenta leer storage. */
  defaultTheme?: Theme;
  /** Callback al cambiar de tema. */
  onThemeChange?: (theme: Theme) => void;
  /** Clave de localStorage donde se persiste el tema. `null` desactiva la persistencia. */
  storageKey?: string | null;
  /**
   * Atributo donde se aplica el tema. Por defecto `data-theme` en `<html>`.
   * Pasar `null` para no aplicar el tema al DOM (sólo dispara onThemeChange).
   */
  attribute?: string | null;
  /**
   * Etiqueta del switch. Por defecto muestra "Dark" / "Light" según el modo.
   * Si se proporciona como string fija, se usa siempre; si es función, recibe
   * el tema actual y devuelve el nodo a renderizar.
   */
  label?: React.ReactNode | ((theme: Theme) => React.ReactNode);
  ref?: Ref<HTMLInputElement>;
}

const DEFAULT_STORAGE_KEY = "theme";

function readStoredTheme(storageKey: string | null): Theme | null {
  if (!storageKey || typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(storageKey);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

function useStoredTheme(storageKey: string | null): Theme | null {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (!storageKey || typeof window === "undefined") return () => {};
      const handler = (e: StorageEvent) => {
        if (e.key === storageKey) cb();
      };
      window.addEventListener("storage", handler);
      return () => {
        window.removeEventListener("storage", handler);
      };
    },
    [storageKey],
  );
  const getSnapshot = useCallback(
    () => readStoredTheme(storageKey),
    [storageKey],
  );
  const getServerSnapshot = useCallback(() => null, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * ThemeSwitch — toggle de tema light/dark sobre el `Switch` del design system.
 *
 * SSR-safe: en el servidor renderiza el tema por defecto y en el cliente
 * hidrata el valor desde `localStorage` (vía `useSyncExternalStore`). Persiste
 * en `localStorage` bajo `storageKey` (default `"theme"`) y aplica el atributo
 * `data-theme` a `<html>`. Soporta controlled (`theme` + `onThemeChange`) o
 * uncontrolled (`defaultTheme`).
 *
 * Si la app necesita evitar el flash de tema incorrecto durante hidratación,
 * inyecta en el `<head>` un script que aplique `data-theme` antes del paint.
 *
 * @example
 * <ThemeSwitch />
 * <ThemeSwitch defaultTheme="dark" label={(t) => t === "dark" ? "🌙" : "☀️"} />
 * <ThemeSwitch theme={theme} onThemeChange={setTheme} storageKey={null} />
 */
export function ThemeSwitch({
  theme: themeProp,
  defaultTheme,
  onThemeChange,
  storageKey = DEFAULT_STORAGE_KEY,
  attribute = "data-theme",
  label,
  ref,
  ...rest
}: ThemeSwitchProps) {
  const isControlled = themeProp !== undefined;
  const stored = useStoredTheme(storageKey);
  const [override, setOverride] = useState<Theme | null>(null);

  const current: Theme = isControlled
    ? themeProp
    : (override ?? stored ?? defaultTheme ?? "light");

  useEffect(() => {
    if (attribute && typeof document !== "undefined") {
      document.documentElement.setAttribute(attribute, current);
    }
    if (storageKey && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey, current);
      } catch {
        /* localStorage no disponible — ignoramos. */
      }
    }
  }, [current, attribute, storageKey]);

  const toggle = useCallback(() => {
    const next: Theme = current === "dark" ? "light" : "dark";
    if (!isControlled) setOverride(next);
    onThemeChange?.(next);
  }, [current, isControlled, onThemeChange]);

  const renderedLabel =
    typeof label === "function"
      ? label(current)
      : label !== undefined
        ? label
        : current === "dark"
          ? "Dark"
          : "Light";

  return (
    <Switch
      {...rest}
      {...(ref !== undefined ? { ref } : {})}
      aria-label="Cambiar entre tema claro y oscuro"
      checked={current === "dark"}
      onChange={toggle}
    >
      {renderedLabel}
    </Switch>
  );
}
