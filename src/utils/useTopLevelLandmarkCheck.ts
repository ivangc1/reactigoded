import { useEffect, type RefObject } from "react";

/**
 * Counter shared a nivel módulo de instancias top-level por role
 * (`banner`, `contentinfo`). Un componente cuenta como "top-level" si
 * NO está envuelto en un wrapper landmark (`<main>`, `<article>`,
 * `<section aria-label>`, `[role="region"]`, etc.). Si el contador
 * supera 1, hay colisión axe (`landmark-no-duplicate-banner` /
 * `landmark-no-duplicate-contentinfo`).
 */
const topLevelLandmarkCount = new Map<string, number>();

const WRAPPER_SELECTOR = [
  "main",
  "article",
  '[role="main"]',
  '[role="region"]',
  '[role="article"]',
  "section[aria-label]",
  "section[aria-labelledby]",
].join(", ");

/**
 * useTopLevelLandmarkCheck — warn dev cuando hay múltiples
 * `<header>` (role banner) o `<footer>` (role contentinfo) top-level
 * vivos al mismo tiempo en el documento.
 *
 * Capa 1.3 del debt doc. Componentes que deberían usarlo: Navbar
 * (`<header>`), Footer (`<footer>` cuando exista).
 *
 * **Lógica**: en mount, usa `closest()` para verificar si el elemento
 * está dentro de un wrapper landmark que despromueva su rol implícito.
 * Si NO está envuelto, contribuye al counter top-level. Si el counter
 * sube de 1 a 2, warn.
 *
 * **Mitigación story-level documentada**: envolver cada instancia en
 * `<section aria-label="Demo X">` que la despromueve a `region`. Es
 * la solución aplicada hoy en `Navbar.stories.tsx → AllStates`.
 *
 * @param ref - Ref al `<header>` / `<footer>` del DOM.
 * @param role - Role landmark afectado (`"banner"` para header,
 *   `"contentinfo"` para footer).
 *
 * @example
 * ```tsx
 * export function Navbar({ ref, ...rest }: NavbarProps) {
 *   const internalRef = useRef<HTMLElement>(null);
 *   useTopLevelLandmarkCheck(internalRef, "banner");
 *   const setRefs = useCallback(...);
 *   return <header ref={setRefs} {...rest} />;
 * }
 * ```
 */
export function useTopLevelLandmarkCheck(
  ref: RefObject<HTMLElement | null>,
  role: "banner" | "contentinfo",
) {
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const el = ref.current;
    if (!el) return;
    const wrapper = el.parentElement
      ? el.parentElement.closest(WRAPPER_SELECTOR)
      : null;
    if (wrapper) return; // promovido a `region`, no cuenta top-level

    const prevCount = topLevelLandmarkCount.get(role) ?? 0;
    topLevelLandmarkCount.set(role, prevCount + 1);

    if (prevCount >= 1) {
      const tag = role === "banner" ? "<header>" : "<footer>";
      console.warn(
        `[reactigoded] múltiples ${tag} top-level detectados (role="${role}"). ` +
          `Axe rule landmark-no-duplicate-${role} solo permite uno por documento. ` +
          `Envolver instancias adicionales en <section aria-label="..."> (las despromueve a region).`,
      );
    }

    return () => {
      const c = topLevelLandmarkCount.get(role) ?? 0;
      topLevelLandmarkCount.set(role, Math.max(0, c - 1));
      if ((topLevelLandmarkCount.get(role) ?? 0) === 0) {
        topLevelLandmarkCount.delete(role);
      }
    };
  }, [ref, role]);
}

/**
 * @internal — para tests. Limpia el contador entre tests para evitar
 * contaminación cruzada con `isolate: false` en vitest.
 */
export function __resetTopLevelLandmarkCheckForTests() {
  topLevelLandmarkCount.clear();
}
