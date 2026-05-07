import { useEffect } from "react";

/**
 * Registry shared a nivel módulo para detectar colisiones de
 * `aria-label` dentro del mismo role landmark. Mapa: role → Map<label,
 * count>. Cada componente que monta con un par (role, label) incrementa
 * el counter; al desmontar, decrementa. Si el counter va de 0 a 1 al
 * añadir, no hay colisión. Si va de 1 a 2 (o más), warn dev.
 *
 * Vive a nivel módulo a propósito: una galería con dos `<nav
 * aria-label="Principal">` debe quejarse aunque cada uno esté en árbol
 * de React distinto, porque axe los ve como un mismo documento HTML.
 */
const landmarkRegistry = new Map<string, Map<string, number>>();

/**
 * useLandmarkRegistry — warn dev cuando dos componentes con el mismo
 * role landmark tienen aria-label idéntico vivos al mismo tiempo.
 *
 * Capa 1.2 del debt doc. Componentes que deberían usarlo: Breadcrumb,
 * NavbarNav, Pagination, Sidebar, SidebarNav.
 *
 * Si el componente NO recibe aria-label (consumer pasa `undefined`),
 * el hook NO se queja — esa es una regla aparte (capa 1.1 para inputs,
 * o consumer/story conventions). Aquí solo detectamos COLISIÓN entre
 * labels presentes.
 *
 * @param role - Role landmark del componente
 *   (`"navigation"`, `"complementary"`, `"banner"`, `"contentinfo"`,
 *   `"region"`).
 * @param ariaLabel - El `aria-label` resuelto (después de defaults).
 *   Si es `undefined` el hook es no-op.
 *
 * @example
 * ```tsx
 * export function Breadcrumb({ "aria-label": al = "Migas de pan", ...rest }) {
 *   useLandmarkRegistry("navigation", al);
 *   return <nav aria-label={al} {...rest}>...</nav>;
 * }
 * ```
 */
export function useLandmarkRegistry(
  role: string,
  ariaLabel: string | undefined,
) {
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!ariaLabel) return;

    let labels = landmarkRegistry.get(role);
    if (!labels) {
      labels = new Map<string, number>();
      landmarkRegistry.set(role, labels);
    }

    const prevCount = labels.get(ariaLabel) ?? 0;
    labels.set(ariaLabel, prevCount + 1);

    if (prevCount >= 1) {
      console.warn(
        `[reactigoded] dos landmarks role="${role}" comparten aria-label="${ariaLabel}". ` +
          "Cada landmark del mismo tipo necesita un aria-label único en la página. " +
          "Pasa un aria-label distinto a esta instancia (axe rule landmark-unique).",
      );
    }

    return () => {
      const labelsLocal = landmarkRegistry.get(role);
      if (!labelsLocal) return;
      const c = labelsLocal.get(ariaLabel) ?? 0;
      if (c <= 1) labelsLocal.delete(ariaLabel);
      else labelsLocal.set(ariaLabel, c - 1);
      if (labelsLocal.size === 0) landmarkRegistry.delete(role);
    };
  }, [role, ariaLabel]);
}

/**
 * @internal — para tests. Limpia el registry entre tests para evitar
 * contaminación cruzada con `isolate: false` en vitest.
 */
export function __resetLandmarkRegistryForTests() {
  landmarkRegistry.clear();
}
