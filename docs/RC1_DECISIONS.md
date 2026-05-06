# RC1 — decisiones humanas

**Fecha inicial**: 2026-05-05 (defaults razonables aplicados por Claude
para no bloquear la sesión).
**Confirmación explícita**: 2026-05-05 (Iván confirma todas las decisiones
desde su cuenta tras revisión).
**Branch**: `rc1-gate-fixes`.
**Origen**: las 4 decisiones de la fase B del plan
`CLAUDE_CODE_RC1_PLAN.md` que requerían input humano.

Cada decisión queda documentada aquí para que pueda revertirse antes del
merge a `main` si surge un cambio de criterio.

---

## B1 — ¿Publicar `1.0.0-beta.21` a npm o saltar a rc.1 directo?

**Default inicial**: **(b) saltar publicación, reescribir docs como
pre-publicación**.

**Decisión confirmada (Iván, 2026-05-05)**: **(a) publicar betas** —
más feedback real antes de congelar API.

**Implicaciones del cambio respecto al default inicial**:
- B-11 (banner Introduction.mdx) cambia de tono: en lugar de "no
  publicado, clona y npm link" pasa a recomendar
  `npm install reactigoded@beta`.
- README línea 7 dirá `Estado: 1.0.0-beta.22 (saneamiento RC1)`, no
  "sin publicaciones aún en npm".
- El bump de Fase E sigue siendo `npm version 1.0.0-beta.22`
  (el commit final). La publicación a npm la hace Iván tras el merge,
  fuera de esta sesión.

---

### Actualización 2026-05-06: pausa operativa

**Contexto**: tras cerrar el branch `rc1-gate-fixes` (41 commits, beta.22
listo para publicar) y antes de hacer `npm publish --tag beta`, Iván
decide pausar la publicación a npm sin fecha definida.

**Razones**:
- Iván es el único consumer previsible a corto plazo. No hay equipo
  externo esperando feedback.
- Publicar implica compromiso de mantenimiento sostenido (issues, PRs
  de consumers, semver discipline). Sin urgencia de DS público, mejor
  esperar.
- El branch `rc1-gate-fixes` ya cierra los 18 Blockers + 8 Highs y
  añade trazabilidad post-RC1. La calidad del código no requiere
  publicación inmediata para ser real.

**Implicaciones operativas (commit `7a5c922` B-01-followup)**:
- `src/stories/Introduction.mdx`: banner pasa a "no publicado, clona
  + npm link" (estado real).
- `README.md`: instalación documentada como clone + npm link.
- Tag git `v1.0.0-beta.22` se mantendrá tras merge para trazabilidad
  histórica del repo, pero NO se acompaña de `npm publish`.

**Reversión cuando se publique**:
1. Decidir versión a publicar (probablemente `1.0.0-beta.23` con cambios
   acumulados desde beta.22, o `beta.22` re-tagged si nada cambió).
2. Revertir commit `7a5c922` (B-01-followup) o reescribir las docs
   manualmente.
3. Ejecutar `npm publish --tag beta`.
4. Añadir nueva sección "Reactivación" a este MD documentando fecha y
   versión publicada.

**Decisión a largo plazo NO cambia**: B1 sigue siendo `(a) publicar
betas`. Lo único que cambia es la fecha — de "tras merge de
rc1-gate-fixes" a "cuando Iván tenga capacidad operativa o consumer
externo lo justifique".

---

## B2 — Skeleton API: ¿breaking ahora o nunca?

**Default inicial**: **(a) breaking ahora — split `Skeleton` (decorativo)
+ `SkeletonContainer` (a11y wrapper)**.

**Decisión confirmada (Iván, 2026-05-05)**: **(a) breaking ahora** —
mejor BC pre-rc.1 que bug ARIA permanente.

**Por qué**:
- El informe lo marca **Blocker**. Si no se arregla en RC1, queda
  congelado para 1.0.0 y luego cualquier fix es 2.0.
- Pre-1.0 es exactamente el momento donde un breaking de API es
  aceptable.
- El plan documenta el patrón de migración con `<SkeletonContainer
  label="...">` envolviendo el grupo. CHANGELOG explica.

**Reversible**: posible pero costoso. Si Iván decide (b), hay que
revertir el commit del split y mantener `role="status"` con un warn
dev sobre uso múltiple.

---

## B3 — Sidebar `ariaLabel`: ¿eliminar o mantener?

**Default inicial**: **(a) eliminar**.

**Decisión confirmada (Iván, 2026-05-05)**: **(a) eliminar**.

**Por qué**:
- Consistencia con el resto del DS (las demás props `ariaLabel` se
  eliminaron en beta.4).
- Mantenerla deja un outlier permanente que confunde a consumers
  (¿por qué solo Sidebar usa esa convención?).
- El reemplazo (`<Sidebar aria-label="...">`) es el HTML estándar y
  no requiere prop especial.
- BC con migration documentada en CHANGELOG.

**Reversible**: trivial. Re-introducir la prop si surge feedback de
consumers que la usaban.

---

## B4 — RSC: `"use client"` global o subpath?

**Default inicial**: **(a) global** (`"use client";` en `src/index.ts`).

**Decisión confirmada (Iván, 2026-05-05)**: **(a) global** — más
simple, menos superficie API.

**Por qué**:
- El plan lo describe como "más simple" y "sin BC".
- Toda la lib usa hooks de cliente; no hay un caso real donde un
  Server Component se beneficie de importar componentes que requieren
  estado.
- La opción (b) crea una superficie API extra (`/client`) que pide
  mantenimiento y un breaking si se decide migrar después.

**Riesgos**:
- Si un futuro componente del DS fuera puramente presentacional sin
  hooks, en (a) seguiría yendo al cliente innecesariamente. Aceptable:
  ya lo va de todas formas porque comparte CSS y bundle.

**Reversible**: posible pero BC. Eliminar la directiva del entry y
crear el subpath es lo que (b) habría implementado desde el principio.

---

## Cómo revertir si Iván no está de acuerdo

Las decisiones se aplican en commits separados por blocker. Para
revertir cualquiera:

```bash
git log --oneline rc1-gate-fixes
# encontrar el commit del Blocker correspondiente
git revert <SHA>
```

Las 4 decisiones afectan a estos blockers (commits separados):

| Decisión | Blocker(s) | Commits a revertir |
|---|---|---|
| B1 = (a) | B-11 (banner publicación) | el commit `[B-11]` |
| B2 = (a) | B-12 | el commit `[B-12]` |
| B3 = (a) | B-09 | el commit `[B-09]` |
| B4 = (a) | B-17 | el commit `[B-17]` |
