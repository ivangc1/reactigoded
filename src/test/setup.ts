import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { __resetLandmarkRegistryForTests } from "@/utils/useLandmarkRegistry";
import { __resetTopLevelLandmarkCheckForTests } from "@/utils/useTopLevelLandmarkCheck";

// #28 — política de stderr limpio. La suite unit no debe filtrar
// console.error/warn a stderr SALVO los dev-warnings de contrato del propio
// DS (que ciertos tests disparan a propósito para verificar el
// comportamiento — el warning es ruido esperado). CUALQUIER otro console
// (React DOM warnings, act(...), un error accidental) FALLA el test.
//
// Cómo lidiar con un fallo de esta policy:
//   - Si el test dispara el warning A PROPÓSITO (p.ej. Slot con una prop
//     no-evento, Switch en transición controlled↔uncontrolled, hydrateRoot
//     sin IS_REACT_ACT_ENVIRONMENT): suprímelo en el test con
//     `vi.spyOn(console, "error"|"warn").mockImplementation(() => {})` (o
//     asértalo con un spy). Así el warning no llega a este guard.
//   - Si es accidental: arregla la causa (esa es la red que compra la
//     policy — un console nuevo no pasa inadvertido).
//
// El guard reemplaza console.* por asignación directa (no `vi.spyOn`) para
// no chocar con el ciclo de mocks de los tests: un `vi.spyOn` de un test
// envuelve este guard y, si no restaura, el `afterEach` de aquí resetea a
// la referencia real igualmente.
const REAL_CONSOLE = { error: console.error, warn: console.warn };
// CONSOLE_ALLOWLIST — SOLO el namespace de dev-warnings del propio DS. TODO lo
// demás lo caza la policy y falla el test: React warnings (act(),
// controlled↔uncontrolled, key, prop DOM inválida), warnings de otros hooks, o
// un console.error accidental de app. Un warning DISPARADO A PROPÓSITO por un
// test se suprime EN ESE test con `vi.spyOn(console,…).mockImplementation()`,
// NO se allowlista central — allowlistar una clase reabre el agujero para
// cualquier warning nuevo de esa clase (la policy afirmaría cazar lo que su
// propio allowlist deja pasar). P2 codex #140.
const CONSOLE_ALLOWLIST: RegExp[] = [/^\[reactigoded\]/];
let leakedConsole: string[] = [];

function makeConsoleGuard(kind: "error" | "warn") {
  return (...args: unknown[]): void => {
    const msg = args
      .map((a) => (typeof a === "string" ? a : String(a)))
      .join(" ");
    if (CONSOLE_ALLOWLIST.some((re) => re.test(msg))) return; // ruido esperado
    leakedConsole.push(`console.${kind}: ${msg.split("\n")[0] ?? msg}`);
  };
}

beforeEach(() => {
  leakedConsole = [];
  console.error = makeConsoleGuard("error");
  console.warn = makeConsoleGuard("warn");
});

afterEach(() => {
  // REINSTALAR el guard antes de cleanup(): un test pudo reemplazar console.*
  // con `vi.spyOn(console,…).mockImplementation()` y NO restaurarlo (los casos
  // Slot/Switch lo hacen), dejando el mock no-op del test como console.*. Sin
  // reinstalar, cleanup() correría bajo ese no-op y los warnings de unmount se
  // tragarían. Reinstalado, cleanup() + resets corren bajo el guard → los
  // warnings de unmount (console.* desde un effect cleanup, avisos de React al
  // desmontar) pasan por la policy igual que los de render. El console real se
  // restaura DESPUÉS (P2 codex #140).
  console.error = makeConsoleGuard("error");
  console.warn = makeConsoleGuard("warn");
  cleanup();
  // M-07 (beta.24): los registries module-level de landmarks acumulan
  // estado entre tests del mismo módulo si no se resetean. Cada test
  // antes invocaba el reset manualmente; centralizarlo aquí evita
  // omisiones silenciosas y resets duplicados en tests futuros.
  // Los helpers __reset*ForTests están marcados @internal en sus
  // archivos.
  __resetLandmarkRegistryForTests();
  __resetTopLevelLandmarkCheckForTests();
  console.error = REAL_CONSOLE.error;
  console.warn = REAL_CONSOLE.warn;
  if (leakedConsole.length > 0) {
    const captured = leakedConsole;
    leakedConsole = [];
    throw new Error(
      "[#28 stderr policy] console.error/warn inesperado (no allowlisted). " +
        "Suprímelo en el test con vi.spyOn(console,…).mockImplementation() o " +
        "arregla la causa:\n  " +
        captured.join("\n  "),
    );
  }
});
