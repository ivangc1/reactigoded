# H-07 — state.css: conservar con plan abierto

**Fecha**: 2026-05-10
**Estado**: A+ aplicado (conservar + justify + plan triggered)
**Origen**: gate review § IV.2 (H-07) + § VI (C-05) + § IV.5 (D-03)

## Decisión RC1

Conservar `state.css` en el paquete principal con su subpath wildcard actual (`./styles/state/*.css`). Añadir story canónica en Storybook que justifica el caso de uso (CSS-only HTML prototyping) y doc explícita en `CSSAPI.mdx` sobre cuándo importarlo y cuándo no.

## Por qué A+ (no D — eliminar)

Sesión anterior comenzó con opción D (eliminar) tras audit consumer mostrar 0 matches. Iván corrigió: el audit no implica eliminación — el use case (HTML estático utility-first sin build) es legítimo y vale conservarlo aunque actualmente no se use en consumers tracked.

**El paso clave de A+ vs A puro**: la story de Storybook hace **visible** el valor. Un consumer evaluando el peso del paquete ve "713 KB gz, ¿para qué?" en el README. La story responde la pregunta con HTML ejecutable. Sin la story, los 713 KB son deuda de percepción.

## Por qué NO paquete separado ahora (opción C)

Sin demand real, montar la infra (monorepo o publish independiente) es trabajo sin ROI inmediato. Y la migración a paquete separado puede hacerse post-RC1 sin breaking del consumer si se mantiene el subpath actual como alias deprecado durante 6-12 meses. **C queda como opción abierta**, no descartada.

## Por qué NO eliminar (opción D)

- Use case legítimo identificado: HTML estático utility-first sin build pipeline.
- Coste de mantener = ~7.3 MB en source + ~50 KB gz por fragment (28 fragments). Build pipeline ya estable. Tests verde.
- La story de Storybook absorbe la deuda de percepción ("¿para qué?") con respuesta ejecutable.

## Triggers para reabrir post-RC1

### Trigger hacia opción C (paquete separado)

- **Demand real**: ≥3 consumers reportan que valoran state.css pero el peso percibido del DS principal les disuade de adoptarlo.
- **Decisión interna de marketing**: limpiar la primera impresión del tarball del DS principal.

Si se reabre hacia C: mover state.css al paquete separado `@reactigoded/state-css`, mantener el subpath wildcard `./styles/state/*.css` como alias deprecado durante 6-12 meses, eliminar en 2.0.

### Trigger hacia opción Tailwind preset (sugerencia C-05 original del review)

- Decisión interna de **profesionalizar** utility-first y reducir mantenimiento.
- Si el equipo decide deprecar state.css y publicar `@reactigoded/tailwind-preset` como path oficial.

Coste alto pero mantenimiento mucho menor (deja que el motor de Tailwind genere lo que hoy es pre-generado en CSS estático).

### Trigger hacia eliminación (opción D)

- Si en post-RC1 + 12 meses la story `Cookbook/CSS-Only HTML Prototyping` tiene **<100 views** en Storybook analytics Y nadie reporta uso, evaluar deprecación.

## Cambios aplicados en RC1

1. **Story canónica**: `src/stories/Cookbook/CSS-Only-Prototyping.stories.tsx` con iframe srcDoc que demuestra `hover:`/`focus:`/`disabled:`/`peer-checked:`/`group-hover:` + utilities `user-select` funcionando en HTML estático sin React.

2. **CSSAPI.mdx**: sección nueva "Cuándo usar `state.css`" con:
   - Caso de uso intencionado y caso de NO uso.
   - Patrón de import granular (`reactigoded/styles/state/hover.css`) vs bundle completo.
   - Link a la story.

3. **Decision doc**: este archivo (`docs/decisions/H-07-state-css-and-future.md`).

4. **Cero código modificado**: state.css, fragments, package.json#exports, vite.lib.config.ts, size budgets — todos intactos.

## Gate ejecutable (D9 beta.24)

`scripts/check-state-css-exclusion.mjs` + `npm run test:state-css-exclusion`, encadenado en `verify:unit` post-build. Verifica que ningún string literal con prefijo `hover:ig-`, `focus:ig-`, `active:ig-`, `disabled:ig-`, `checked:ig-`, `default:ig-`, `empty:ig-`, `first-child:ig-`, `last-child:ig-` aparezca en `dist/index.js` ni `dist/index.cjs`.

Razón del gate: si un componente del DS empieza accidentalmente a referenciar utilities de `state.css` (713 KB gz standalone) por error, el bundle React crece silenciosamente y el TTI del consumer típico se rompe. El gate caza esto pre-publish.

Si alguna vez el DS decide adoptar utilities de `state.css` internamente (improbable — los componentes usan clases tipo `ig-button`, no utilities `hover:ig-bg-brand`), el gate se actualiza explícitamente en el mismo PR + decision doc.

Detalle en `docs/decisions/D9-size-limit-baseline.md` § "H-07 gate ejecutable".

## Cierra (parcialmente)

- **H-07** (HIGH del gate review § IV.2): cerrada con A+ en RC1.
- **C-05** (decisión cuestionada § VI cubierta por H-07): cerrada.
- **D-03** (DEFERRED § IV.5 cubierta por H-07): cerrada en sentido de "decisión tomada", no en sentido de "ejecutada".

## Próxima revisión

- **Programada**: RC1 + 6 meses (tentativo: 2026-11-10).
- **Anticipada**: si se cumple algún trigger antes.
