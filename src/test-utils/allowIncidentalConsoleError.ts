import { beforeEach, vi } from "vitest";

/**
 * Suprime SOLO un patrón de `console.error` INCIDENTAL (mecánico, no testeado)
 * en el fichero/describe que lo llama, dejando pasar CUALQUIER OTRO
 * `console.error` al guard de la policy de stderr (#28, `src/test/setup.ts`).
 *
 * A diferencia de un `vi.spyOn(console,"error").mockImplementation(() => {})`
 * ciego, esto NO reabre el agujero de #28 en pequeño: un `console.error` nuevo
 * o distinto en ese fichero sigue llegando al guard y fallando el test. Solo
 * se traga la clase que ya sabes incidental (p.ej. el `not wrapped in act` de
 * floating-ui, o el dev-warning de un hook cuyo contrato se testea en otro
 * sitio).
 *
 * Requisito de uso — el warning debe ser categoría 3 (incidental): mecánico Y
 * la aserción del test NO depende de él. Si la aserción DEPENDE del async que
 * dispara el warning (carrera sobre un valor que el test comprueba), NO uses
 * esto — envuelve el trigger en `act()`/`await` (fix de causa), o el spy
 * silenciaría un test roto.
 *
 * El guard de #28 se captura en el `beforeEach` (que corre DESPUÉS del
 * `beforeEach` de setup.ts, el cual ya instaló el guard como `console.error`).
 */
export function allowIncidentalConsoleError(pattern: RegExp): void {
  beforeEach(() => {
    // Cubre error Y warn: React emite act() por console.error, pero los
    // dev-warnings de hooks (p.ej. useControllableState) van por console.warn.
    for (const method of ["error", "warn"] as const) {
      const guard = console[method] as (...args: unknown[]) => void;
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        if (!pattern.test(args.map((a) => String(a)).join(" "))) guard(...args);
      });
    }
  });
}
