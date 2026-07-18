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
const CONSOLE_ALLOWLIST: RegExp[] = [
  // Dev-warnings de contrato del propio DS (intencionales en ciertos tests).
  /^\[reactigoded\]/,
  /^\[useControllableState\]/,
  // act(): ÚNICA clase de React allowlisted, a propósito. Es ruido inherente
  // de tests con updates async — floating-ui (Menu/Tooltip async positioning)
  // y matchMedia (useTheme) — que aparece bajo el `--isolate --pool=forks` de
  // CI (`test:unit:ci`) pero no bajo threads local; envolverlo suite-wide sería
  // un refactor grande y flaky. La policy NO pretende cazar act(); sí TODO lo
  // demás. Lo que NO se allowlista globalmente y la policy SÍ caza:
  // controlled↔uncontrolled, props DOM inválidas, errores de hooks, key
  // warnings, console.error accidental de app. Los tests que disparan uno a
  // propósito (Slot data-format-fn, Switch/Slider transiciones) lo suprimen
  // LOCAL con vi.spyOn — y la policy demostró valor cazando las transiciones de
  // Slider que filtraban sin suprimir (P2 codex #140).
  /An update to .* inside a test was not wrapped in act/,
  /not configured to support act/,
];
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
