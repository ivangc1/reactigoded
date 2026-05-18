import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { __resetLandmarkRegistryForTests } from "@/utils/useLandmarkRegistry";
import { __resetTopLevelLandmarkCheckForTests } from "@/utils/useTopLevelLandmarkCheck";

afterEach(() => {
  cleanup();
  // M-07 (beta.24): los registries module-level de landmarks acumulan
  // estado entre tests del mismo módulo si no se resetean. Cada test
  // antes invocaba el reset manualmente; centralizarlo aquí evita
  // omisiones silenciosas y resets duplicados en tests futuros.
  // Los helpers __reset*ForTests están marcados @internal en sus
  // archivos.
  __resetLandmarkRegistryForTests();
  __resetTopLevelLandmarkCheckForTests();
});
