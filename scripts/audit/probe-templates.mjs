// Plantillas anti-error de sonda — custodio de las TRES clases de error de sondeo observadas en el ciclo #7
// (código 9, autores 1: dos fueron del ejecutor, una del auditor; la regla es del PROCESO, no de un autor).
// Una sonda mal construida da un veredicto que parece medir el gate pero mide otra cosa → cierra un hueco
// falso. Estos helpers construyen/validan las formas correctas.
//
// Uso:  import { switchCaseProbe, assertDeniedMember, assertFlagCapableRead } from "./probe-templates.mjs";

// Miembro DENEGADO conocido (hazard=absence): leerlo sobre un partial-root DEBE flaggear. Contrasta con `.now`
// (SEGURO), cuyo uso en una celda que exige denegado da SILENT espurio (error clase 2).
export const DENIED_MEMBER = "eventLoopUtilization"; // performance.eventLoopUtilization — ausente en Edge
export const SAFE_MEMBER = "now"; // performance.now — presente; NO sirve para una celda flag-capaz

// CLASE 1 — `case` SIN llaves / clause multi-statement. Un `{ … }` dentro del case va por el walker de Block,
// NO por el de CaseBlock → la sonda prueba el path equivocado. Este helper emite un cuerpo de clause SIN
// bloque (CaseBlock-scoped real). `stmts` es un array de statements crudos.
export function switchCaseProbe(stmts, { discriminant = "k" } = {}) {
  return `switch (${discriminant}) { case 1: ${stmts.join(" ")} break; }`;
}

// CLASE 2 — validación de miembro contra catálogo. Rechaza una sonda que usa un miembro SEGURO cuando la celda
// exige uno DENEGADO (un read de `.now` nunca flaggea → SILENT no prueba nada). Lanza si el src no contiene el
// miembro denegado en una lectura.
export function assertDeniedMember(src) {
  if (!src.includes(`.${DENIED_MEMBER}`) && !src.includes(`["${DENIED_MEMBER}"]`)) {
    throw new Error(
      `[probe] la sonda no lee un miembro DENEGADO (${DENIED_MEMBER}); un miembro seguro como .${SAFE_MEMBER} ` +
        `da SILENT espurio y no prueba el flag. Usa .${DENIED_MEMBER}.`,
    );
  }
  return src;
}

// CLASE 3 — rechazo de formas SANCIONADAS de ausencia. `x?.()` (optional-call), `x ?? fb` (nullish-default) y
// el default-destructuring son formas VÁLIDAS de tolerar ausencia → SILENT es correcto en ellas, así que una
// celda que espera FLAG con esa forma se auto-sabotea (error clase 3: la sonda de Fable con `c.elu?.()`).
// Lanza si la lectura no es flag-capaz (plana).
export function assertFlagCapableRead(src) {
  const sanctioned = [
    /\?\.\s*\(/, // ?.()
    /\?\?/, // ?? fallback
    /=\s*[^)]*\)\s*=>/, // (heurístico) default en destructuring/param — revisar a mano si dispara
  ];
  for (const re of sanctioned) {
    if (re.test(src)) {
      throw new Error(
        `[probe] la sonda usa una forma SANCIONADA de ausencia (\`?.()\`/\`?? fb\`/default) → SILENT es correcto ` +
          `ahí y no prueba un flag. Usa una lectura PLANA (\`x.${DENIED_MEMBER}()\`) si la celda espera FLAG.`,
      );
    }
  }
  return src;
}
