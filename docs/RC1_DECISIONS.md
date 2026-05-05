# RC1 — decisiones humanas tomadas con default razonable

**Fecha**: 2026-05-05
**Branch**: `rc1-gate-fixes`
**Origen**: las 4 decisiones de la fase B del plan
`CLAUDE_CODE_RC1_PLAN.md` que requerían input humano.

Iván autorizó proceder con defaults conservadores (sesión `/loop`-style con
mandamiento 7 desactivado). Cada default queda documentado aquí para que
pueda revertirse antes del merge a `main` si no encaja.

---

## B1 — ¿Publicar `1.0.0-beta.21` a npm o reescribir docs como pre-publicación?

**Default elegido**: **(b) reescribir docs**.

**Por qué**:
- El plan dice "Si (a): yo lo hago manualmente. Tú no publicas". No
  puedo ejecutar publicación a npm sin Iván.
- Reescribir docs no bloquea la promoción a rc.1; publicar exige
  esperar 1-2 semanas de feedback adicionales.
- (b) está alineado con avanzar el ciclo RC1 sin depender de canales
  externos.

**Reversible**: trivial. Si Iván decide (a) después, basta con publicar
y eliminar el banner de pre-publicación que se añadirá en B-11.

---

## B2 — Skeleton API: ¿breaking ahora o nunca?

**Default elegido**: **(a) breaking ahora — split `Skeleton` (decorativo)
+ `SkeletonContainer` (a11y wrapper)**.

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

**Default elegido**: **(a) eliminar**.

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

**Default elegido**: **(a) global** (`"use client";` en `src/index.ts`).

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
| B1 = (b) | B-11 | el commit `[B-11]` |
| B2 = (a) | B-12 | el commit `[B-12]` |
| B3 = (a) | B-09 | el commit `[B-09]` |
| B4 = (a) | B-17 | el commit `[B-17]` |
