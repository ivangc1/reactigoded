# `scripts/audit/` — harness del re-hunt adversarial del gate `@server-safe`

Reproducibilidad de las auditorías del gate por terceros. **No se publica** en el paquete npm
(`package.json` `files` allowlista solo `dist/` + docs).

## Harness

```js
import { checkSingle, checkGraph, passes } from "./rehunt-harness.mjs";

// un solo archivo
passes(checkSingle(`/** @server-safe */\nexport const x = performance.eventLoopUtilization();`)); // false = FLAG

// entry + deps (VFS)
passes(checkGraph(entrySrc, { "dirty.ts": dirtySrc }));
```

- `checkSingle(src)` → violaciones de un archivo (0 = PASA).
- `checkGraph(entry, extraFiles)` → entry `@server-safe` + deps montadas en VFS.
- `passes(v)` / `rules(v)` → helpers.

## Plantillas anti-error de sonda (`probe-templates.mjs`)

Custodio de las **tres clases de error de sondeo** del ciclo #7 (código 9, autores 1 — dos del ejecutor,
una del auditor; la regla es del PROCESO). Una sonda mal construida mide otra cosa y cierra un hueco falso:

1. **`case` sin llaves** — un `{ … }` en el case va por el walker de Block, no el de CaseBlock →
   `switchCaseProbe(stmts)` emite el cuerpo de clause SIN bloque.
2. **miembro contra catálogo** — `.now` (seguro) nunca flaggea; una celda que exige denegado se auto-sabotea →
   `assertDeniedMember(src)` exige un read de `eventLoopUtilization`.
3. **formas sancionadas** — `?.()`/`?? fb`/default toleran ausencia (SILENT correcto) → `assertFlagCapableRead(src)`
   rechaza esas formas cuando la celda espera FLAG.

## Proceso: tabla de sweep pre-push

Todo PR del gate pasa un **sweep de completitud** antes del push: por cada criterio abierto/no-bloqueante,
medir su estado (DENTRO del commit / RENUNCIADO-con-línea / DIFERIDO-con-línea) y tabularlo. El criterio 9
(oráculo) se escurrió por dos checkpoints como "restante" hasta que la regla de mismo-PR lo hizo aflorar —
la tabla formaliza ese chequeo. Barata, y ya demostró su valor.
