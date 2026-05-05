/**
 * Utilities para tests del DS reactigoded.
 *
 * Lecciones operativas extraídas de beta.19/20:
 *
 * - `queryAllByRoleSafe`: usa Testing Library para resolver el
 *   accessibility tree (incluye roles implícitos como `slider` para
 *   `<input type="range">`, `checkbox` para `<input type="checkbox">`,
 *   etc.). Útil cuando un `play()` de story corre en chromium real
 *   donde `querySelectorAll('[role="X"]')` solo matchea atributos
 *   explícitos y NO resuelve los implícitos. Detectado por bug Slider
 *   en beta.20 sub-A.
 *
 * - `expectAtLeast`: wrapping idiomático de `toBeGreaterThanOrEqual`.
 *   Evita el off-by-one típico de `toBeGreaterThan` (Divider beta.19
 *   reportó `expected 8 to be greater than 8` cuando el render produce
 *   exactamente 8). El nombre del helper hace explícita la intención.
 */
import { within } from "@testing-library/dom";
import { expect } from "vitest";

/**
 * Cuenta elementos por role usando el accessibility tree (Testing
 * Library), no el atributo CSS literal.
 *
 * Resuelve roles implícitos como `slider` (input[type=range]),
 * `checkbox` (input[type=checkbox]), `radio` (input[type=radio]),
 * `button` (button, input[type=submit]), etc.
 *
 * Pensado para `play()` de stories que verifican cantidad mínima de
 * elementos sin querer depender de clases CSS internas.
 *
 * @example
 * play: async ({ canvasElement }) => {
 *   const sliders = queryAllByRoleSafe(canvasElement, "slider");
 *   await expect(sliders.length).toBeGreaterThanOrEqual(7);
 * }
 */
export function queryAllByRoleSafe(
  container: HTMLElement,
  role: string,
): HTMLElement[] {
  return within(container).queryAllByRole(role);
}

/**
 * Assertion idiomática para "al menos N elementos".
 *
 * Equivalente a `expect(els.length).toBeGreaterThanOrEqual(min)` pero
 * con nombre explícito que evita off-by-ones (`toBeGreaterThan(N)` con
 * count exacto N falla; `toBeGreaterThanOrEqual(N)` no).
 *
 * @example
 * await expectAtLeast(canvas.queryAllByRole("tab"), 3);
 */
export function expectAtLeast(
  els: ArrayLike<unknown>,
  min: number,
  message?: string,
): void {
  expect(
    els.length,
    message ?? `expected at least ${String(min)} elements, got ${String(els.length)}`,
  ).toBeGreaterThanOrEqual(min);
}
