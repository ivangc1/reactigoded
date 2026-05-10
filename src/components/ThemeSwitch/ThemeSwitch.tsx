import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type Ref,
} from "react";
import { Switch, type SwitchProps } from "@/components/Switch";
import { useControllableState } from "@/hooks/useControllableState";
import type { Theme } from "@/hooks/useTheme";

export interface ThemeSwitchProps
  extends Omit<SwitchProps, "checked" | "defaultChecked" | "onChange" | "ref"> {
  /** Tema actual (modo controlado). */
  theme?: Theme;
  /** Tema inicial (modo no controlado). Si se omite, se intenta leer storage. */
  defaultTheme?: Theme;
  /** Callback al cambiar de tema. */
  onValueChange?: (theme: Theme) => void;
  /** Clave de localStorage donde se persiste el tema. `null` desactiva la persistencia. */
  storageKey?: string | null;
  /**
   * Atributo donde se aplica el tema. Por defecto `data-theme` en `<html>`.
   * Pasar `null` para no aplicar el tema al DOM (sólo dispara onValueChange).
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
 * `data-theme` a `<html>`. Soporta controlled (`theme` + `onValueChange`) o
 * uncontrolled (`defaultTheme`).
 *
 * Si la app necesita evitar el flash de tema incorrecto durante hidratación,
 * inyecta en el `<head>` un script que aplique `data-theme` antes del paint.
 *
 * @example
 * <ThemeSwitch />
 * <ThemeSwitch defaultTheme="dark" label={(t) => t === "dark" ? "🌙" : "☀️"} />
 * <ThemeSwitch theme={theme} onValueChange={setTheme} storageKey={null} />
 */
export function ThemeSwitch({
  theme: themeProp,
  defaultTheme,
  onValueChange,
  storageKey = DEFAULT_STORAGE_KEY,
  attribute = "data-theme",
  label,
  ref,
  ...rest
}: ThemeSwitchProps) {
  const stored = useStoredTheme(storageKey);
  const [override, setOverride] = useState<Theme | null>(null);

  // Modo derive del hook: la fuente uncontrolled se computa en render
  // como `override ?? stored ?? <html data-theme> ?? defaultTheme ?? "dark"`.
  // El paso intermedio `<html data-theme>` (B-08) respeta el script
  // anti-flash del consumer: si la app inyecta `data-theme="light"` en
  // `<html>` antes de hidratar, ThemeSwitch lo conserva en lugar de
  // sobrescribirlo con su propio default. `override` sigue siendo state
  // React local — NO localStorage. El effect post-mount persiste el
  // valor; useStoredTheme se mantiene para sync cross-tab vía
  // StorageEvent nativo.
  const { value: current, setValue: setTheme } = useControllableState<Theme>({
    value: themeProp,
    derive: () => {
      if (override) return override;
      if (stored) return stored;
      if (typeof document !== "undefined" && attribute) {
        const fromAttr = document.documentElement.getAttribute(attribute);
        if (fromAttr === "light" || fromAttr === "dark") return fromAttr;
      }
      return defaultTheme ?? "dark";
    },
    setDerivedValue: setOverride,
    onChange: onValueChange,
  });

  // Aplica `data-theme` al DOM y persiste storage. Bail-out
  // `readStoredTheme(storageKey) !== current` antes del setItem evita
  // escrituras redundantes y rompe cualquier loop con
  // useSyncExternalStore en happy-dom.
  useEffect(() => {
    if (attribute && typeof document !== "undefined") {
      document.documentElement.setAttribute(attribute, current);
    }
    if (storageKey && typeof window !== "undefined") {
      try {
        if (readStoredTheme(storageKey) !== current) {
          window.localStorage.setItem(storageKey, current);
        }
      } catch {
        /* localStorage no disponible — ignoramos. */
      }
    }
  }, [current, attribute, storageKey]);

  const toggle = useCallback(() => {
    const next: Theme = current === "dark" ? "light" : "dark";
    setTheme(next);
  }, [current, setTheme]);

  const renderedLabel =
    typeof label === "function"
      ? label(current)
      : label !== undefined
        ? label
        : current === "dark"
          ? "Dark"
          : "Light";

  // Permite que el consumer sobreescriba `aria-label` (i18n). Si no pasa
  // nada, default ES. Antes de 1.0.0-beta.3 el hardcoded ganaba al rest
  // por el orden de props, ahora respeta lo que venga.
  const { "aria-label": ariaLabelOverride, ...switchRest } = rest;

  return (
    <Switch
      {...switchRest}
      {...(ref !== undefined ? { ref } : {})}
      aria-label={ariaLabelOverride ?? "Cambiar entre tema claro y oscuro"}
      checked={current === "dark"}
      onChange={toggle}
    >
      {renderedLabel}
    </Switch>
  );
}
