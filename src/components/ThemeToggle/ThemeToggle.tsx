"use client";

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

export interface ThemeToggleProps
  extends Omit<SwitchProps, "checked" | "defaultChecked" | "onChange" | "ref"> {
  /** Tema actual (modo controlado). */
  theme?: Theme | undefined;
  /** Tema inicial (modo no controlado). Si se omite, se intenta leer storage. */
  defaultTheme?: Theme | undefined;
  /** Callback al cambiar de tema. */
  onThemeChange?: ((theme: Theme) => void) | undefined;
  /** Clave de localStorage donde se persiste el tema. `null` desactiva la persistencia. */
  storageKey?: string | null | undefined;
  /**
   * Atributo donde se aplica el tema. Por defecto `data-theme` en `<html>`.
   * Pasar `null` para no aplicar el tema al DOM (sólo dispara onThemeChange).
   */
  attribute?: string | null | undefined;
  /**
   * Etiqueta del switch. Por defecto muestra "Dark" / "Light" según el modo.
   * Si se proporciona como string fija, se usa siempre; si es función, recibe
   * el tema actual y devuelve el nodo a renderizar.
   */
  label?: React.ReactNode | ((theme: Theme) => React.ReactNode) | undefined;
  ref?: Ref<HTMLInputElement> | undefined;
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

function readDomTheme(attribute: string | null): Theme | null {
  if (!attribute || typeof document === "undefined") return null;
  const v = document.documentElement.getAttribute(attribute);
  return v === "light" || v === "dark" ? v : null;
}

/**
 * Lee `<html [attribute]>` como store externo, calcado del patrón de
 * `useTheme`. La pieza que importa es `getServerSnapshot`: durante la
 * hidratación React usa ESE valor, no el DOM, así que el primer render de
 * cliente es idéntico al del servidor.
 *
 * Antes se leía el atributo directamente dentro de `derive()`, es decir
 * DURANTE el render de hidratación. Con el script anti-flash del README
 * resolviendo un tema distinto de `defaultTheme` eso producía o un mismatch
 * recuperable (React descarta el árbol del servidor) o —en producción— un
 * desync silencioso de `aria-checked` que no se autocorregía: el control decía
 * "Dark" con la página ya en claro, y el primer click ni siquiera movía
 * `aria-checked`, lo que además invierte la semántica de `role="switch"`.
 */
function useDomTheme(attribute: string | null): Theme | null {
  // `subscribe` NO observa. Es deliberado y es la diferencia entre arreglar
  // SSR-01 y cambiar de comportamiento por el camino:
  //
  // Lo que hace falta para el fix es que la HIDRATACIÓN use el snapshot de
  // servidor (`null`) y que React re-lea el valor real justo después — eso lo
  // garantiza React solo, comparando `getServerSnapshot` con `getSnapshot` en
  // su effect posterior a la hidratación, sin necesidad de suscripción. En
  // renders de cliente normales, `getSnapshot` lee el atributo igual que antes
  // hacía `derive()`, así que el comportamiento observable no cambia.
  //
  // Poner un `MutationObserver` aquí (como sí hace `useTheme`, cuyo propósito
  // ES la sincronización viva del tema) añadiría una capacidad nueva: el
  // toggle reaccionaría a escrituras de terceros sobre `<html>`. Medido, eso
  // crea además un bucle con la propia escritura del effect que entrega
  // notificaciones fuera de `act()` en 20 tests. No entra en el arreglo de un
  // defecto de hidratación; si algún día se quiere esa capacidad, es un cambio
  // con su propia justificación y sus propios tests.
  const subscribe = useCallback(() => () => {}, []);
  const getSnapshot = useCallback(() => readDomTheme(attribute), [attribute]);
  const getServerSnapshot = useCallback(() => null, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
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
 * ThemeToggle — toggle de tema light/dark sobre el `Switch` del design system.
 *
 * SSR-safe: en el servidor renderiza `defaultTheme` (`"dark"` por omisión) y el
 * primer render de cliente es IDÉNTICO, porque tanto `localStorage` como
 * `<html data-theme>` se leen vía `useSyncExternalStore` con snapshot de
 * servidor estable. El valor real se aplica en el commit siguiente a la
 * hidratación. Persiste en `localStorage` bajo `storageKey` (default
 * `"theme"`) y aplica el atributo `data-theme` a `<html>`. Soporta controlled
 * (`theme` + `onThemeChange`) o uncontrolled (`defaultTheme`).
 *
 * Si la app necesita evitar el flash de tema incorrecto durante hidratación,
 * inyecta en el `<head>` un script que aplique `data-theme` antes del paint.
 * Ese script y este componente NO se pisan: el effect re-resuelve contra el
 * DOM y el storage vivos, así que un tema ya aplicado por el script gana al
 * default. Consecuencia asumida: si el script resolvió un tema distinto del
 * default, el control puede mostrar el estado anterior durante un frame — los
 * colores de la página ya son correctos desde el primer paint.
 *
 * @example
 * <ThemeToggle />
 * <ThemeToggle defaultTheme="dark" label={(t) => t === "dark" ? "🌙" : "☀️"} />
 * <ThemeToggle theme={theme} onThemeChange={setTheme} storageKey={null} />
 */
export function ThemeToggle({
  theme: themeProp,
  defaultTheme,
  onThemeChange,
  storageKey = DEFAULT_STORAGE_KEY,
  attribute = "data-theme",
  label,
  ref,
  ...rest
}: ThemeToggleProps) {
  const stored = useStoredTheme(storageKey);
  const domTheme = useDomTheme(attribute);
  const [override, setOverride] = useState<Theme | null>(null);

  // Modo derive del hook: la fuente uncontrolled se computa en render
  // como `override ?? stored ?? <html data-theme> ?? defaultTheme ?? "dark"`.
  // El paso intermedio `<html data-theme>` (B-08) respeta el script
  // anti-flash del consumer: si la app inyecta `data-theme="light"` en
  // `<html>` antes de hidratar, ThemeToggle lo conserva en lugar de
  // sobrescribirlo con su propio default. `override` sigue siendo state
  // React local — NO localStorage. El effect post-mount persiste el
  // valor; useStoredTheme se mantiene para sync cross-tab vía
  // StorageEvent nativo.
  //
  // Las dos fuentes externas (storage y DOM) entran por `useSyncExternalStore`
  // con snapshot de servidor estable, así que en la hidratación ambas valen
  // `null` y este render coincide con el del servidor. El valor real llega en
  // el commit siguiente.
  const { value: current, setValue: setTheme } = useControllableState<Theme>({
    value: themeProp,
    derive: () => override ?? stored ?? domTheme ?? defaultTheme ?? "dark",
    setDerivedValue: setOverride,
    onChange: onThemeChange,
  });

  // Aplica `data-theme` al DOM y persiste storage. Bail-out
  // `readStoredTheme(storageKey) !== resolved` antes del setItem evita
  // escrituras redundantes y rompe cualquier loop con
  // useSyncExternalStore en happy-dom.
  //
  // ⚠️ Re-resuelve contra las fuentes VIVAS en lugar de escribir `current`.
  // Es la mitad que hace el fix correcto en vez de destructivo: en el pase de
  // hidratación `current` vale `defaultTheme` (los stores devuelven su
  // snapshot de servidor), así que escribir `current` machacaría el
  // `<html data-theme>` que el script anti-flash acaba de poner Y —peor— la
  // preferencia que el usuario tenía en `localStorage`. Medido: con el hook
  // puesto pero este effect sin cambiar, un visitante con tema claro guardado
  // entra y sale con "dark" persistido.
  useEffect(() => {
    const resolved: Theme =
      themeProp ??
      override ??
      readStoredTheme(storageKey) ??
      readDomTheme(attribute) ??
      defaultTheme ??
      "dark";
    if (attribute && typeof document !== "undefined") {
      document.documentElement.setAttribute(attribute, resolved);
    }
    if (storageKey && typeof window !== "undefined") {
      try {
        if (readStoredTheme(storageKey) !== resolved) {
          window.localStorage.setItem(storageKey, resolved);
        }
      } catch {
        /* localStorage no disponible — ignoramos. */
      }
    }
  }, [current, themeProp, override, attribute, storageKey, defaultTheme]);

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
