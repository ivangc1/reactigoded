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
  + npm link" (estado real). **NOTA 2026-07-18**: ese fichero se movió
  después a `docs/Introduction.mdx`; la ruta de arriba se conserva
  porque describe el estado de mayo-2026, pero el procedimiento de
  reversión de abajo apunta al sitio actual.
- `README.md`: instalación documentada como clone + npm link.
- Tag git `v1.0.0-beta.22` se mantendrá tras merge para trazabilidad
  histórica del repo, pero NO se acompaña de `npm publish`.

**Reversión cuando se publique**:
1. Decidir versión a publicar (probablemente `1.0.0-beta.23` con cambios
   acumulados desde beta.22, o `beta.22` re-tagged si nada cambió).
2. Revertir commit `7a5c922` (B-01-followup) o reescribir las docs
   manualmente — hoy son `README.md` y **`docs/Introduction.mdx`**
   (movido desde `src/stories/`).
3. Ejecutar `npm publish --tag beta`.
4. Añadir nueva sección "Reactivación" a este MD documentando fecha y
   versión publicada.

**Decisión a largo plazo NO cambia**: B1 sigue siendo `(a) publicar
betas`. Lo único que cambia es la fecha — de "tras merge de
rc1-gate-fixes" a "cuando Iván tenga capacidad operativa o consumer
externo lo justifique".

---

### Reactivación 2026-07-18: publicado `1.0.0-beta.26`

**Qué se publicó**: `reactigoded@1.0.0-beta.26`, con `npm publish --tag beta`.
Estado resultante en el registro:

```
dist-tags = { beta: '1.0.0-beta.26', latest: '1.0.0-beta.26' }
time.created = 2026-07-18T22:09:23Z
```

**Qué motivó levantar la pausa** — una razón que la decisión de mayo **no
ponía en la balanza**: el nombre `reactigoded` seguía **sin reservar** en npm
(`npm view` → 404). Con el freeze de API pública ya cerrado (§5.13: 323
clases, 37 tokens Tier-2, 6 data-attrs), 27 tags git, el CHANGELOG y
`igoded.es` apuntando todos a ese nombre, perderlo habría forzado un rename
de blast-radius total **justo después de congelar**. Probabilidad baja
(nombre acuñado), coste altísimo, mitigación de un comando: asimetría clara.

**El `latest` NO fue intencionado.** El plan era publicar solo bajo `beta`
para reservar el nombre sin que `npm install reactigoded` resolviera.

Lo **medido**, que es lo único que este documento afirma:

```
tras la publicación → dist-tags = { beta: 1.0.0-beta.26, latest: 1.0.0-beta.26 }
npm dist-tag rm reactigoded latest → 400 Bad Request
```

**La causa NO está establecida.** Una primera versión de esta sección afirmaba
que "npm asigna `latest` en el primer publish pase lo que pase con `--tag`".
Eso era una **inferencia**, no una medición, y la documentación de npm dice lo
contrario: *"Publishing a package sets the `latest` tag ... unless the `--tag`
option is used"* ([npm-dist-tag](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/)).
El issue [npm/cli#7553](https://github.com/npm/cli/issues/7553), que parecía
respaldarlo, reproduce el caso **sin** `--tag` — no es este. Cazado por codex en
review; la afirmación se retira.

**La invocación SÍ está confirmada.** Comando ejecutado, verbatim (Iván):

```bash
cd ~/reactigoded && npm publish --tag beta
```

El log de npm de esa ejecución ya se rotó, así que no hay traza automática — la
evidencia es testimonial, pero es el comando exacto, no una reconstrucción. Con
el flag confirmado el confound queda descartado y lo observado es:

> primera publicación del paquete, **con `--tag beta` explícito** → npm asignó
> **`beta` y `latest`**.

Eso **contradice la documentación** citada arriba. Lo honesto es dejarlo ahí:
la contradicción está medida, pero es **n=1** sobre un solo paquete y un solo
registro, así que **no se eleva a regla general de npm**. Si alguien necesita la
regla, hace falta reproducirlo con un paquete de prueba.

**Regla que sale de esto**: una operación irreversible sobre un registro
público se ejecuta **dejando traza del comando exacto**, no fiándose de que el
log sobreviva ni de la memoria.

Para el `rc.1` esa trazabilidad la aporta el workflow de release
(`.github/workflows/release.yml`) — **pero no por su log**. Los logs de Actions
tienen **retención limitada y configurable** (máx. 400 días): apoyarse solo en
ellos reproduce este mismo hueco cuando venzan, que es justo lo que pasó aquí
con el log de npm. Lo que sí es duradero, y que el release automatizado aporta
sin esfuerzo extra:

| Evidencia | Dónde vive | Durabilidad |
|---|---|---|
| **El comando exacto** | El propio `release.yml`, en el commit tageado | Permanente: es código versionado, no una línea de log |
| **Origen del artefacto** (repo, commit SHA, workflow) | Attestation de **provenance**, que trusted publishing firma sola | La retiene npm/Sigstore, independiente de Actions |
| **dist-tag aplicado** | Asset `release-record.json` de la GitHub Release | Sobrevive a la retención de Actions y a una edición del cuerpo |

> **Corrección de registro (gate 1.0.0, hallazgo `A-REL-01`).** Esta tabla se escribió como
> argumento *a priori* del release automatizado y dos de sus tres filas resultaron falsas al
> medirlas sobre `rc.1`:
>
> - La fila de **origen del artefacto** describía lo que la provenance *debería* decir. Lo que
>   dijo fue `refs/heads/main` + el commit de main, porque npm deriva la attestation de las
>   variables del **evento** de Actions y aquel publish salió por `workflow_dispatch`. Quien
>   siguiera la provenance auditaba otro árbol. Cerrado con el guard de evento de `release.yml`
>   (solo un push de tag publica) y con `scripts/verify-provenance.mjs`, que lo comprueba en
>   cada release en vez de darlo por hecho.
> - La fila del **dist-tag** decía «cuerpo de la GitHub Release». El cuerpo es a la vez notas
>   para humanos y registro de máquina: una edición manual borró la tabla que el workflow había
>   escrito, así que el registro «duradero» duró horas. Ahora va como asset
>   `release-record.json`, que ninguna edición del texto toca, y se verifica contra npm y contra
>   la attestation al final del release.
>
> La lección no es que la automatización no sirva: el comando *sí* quedó versionado. Es que un
> argumento sobre durabilidad hay que **medirlo sobre el artefacto**, no derivarlo del diseño.

Ese es el argumento real para automatizar el release, más allá de la comodidad:
**convierte el comando en un artefacto versionado** en vez de en algo que
depende de que alguien recuerde o de que un log sobreviva.

> **Por qué el dist-tag NO se lee del registro.** `npm view reactigoded
> dist-tags` solo prueba el valor **actual**: un dist-tag es un **puntero
> mutable** y `npm dist-tag add` lo mueve (de hecho, más abajo se sugiere
> justamente eso para `latest` en el `rc.1`). Consultarlo a futuro no dice qué
> tag se aplicó **en ese release**. Por eso el workflow lo escribe en el cuerpo
> de la GitHub Release junto al SHA — ahí queda el valor del momento, aunque el
> puntero se mueva después.

Todo lo anterior **solo aplica cuando el workflow esté en `main`**. Mientras no
lo esté, publicar el `rc.1` a mano **repite exactamente esta misma falta de
evidencia**. Comprobación antes de tagear, no asunción:

```bash
git ls-tree -r main --name-only | grep -q '^\.github/workflows/release\.yml$' \
  && echo "trazabilidad cubierta" || echo "NO cubierta: publicar a mano deja el mismo hueco"
```

**Consecuencia operativa a vigilar**: con `latest` apuntando a `beta.26`, un
`--tag rc` en el rc.1 **no lo moverá** — `npm install reactigoded` seguiría
dando la beta hasta que se publique `1.0.0` final (que sí mueve `latest`) o se
mueva a mano con `npm dist-tag add`.

**Consecuencia real, sin adornos**: esto es una publicación normal, no una
"reserva silenciosa". `npm install reactigoded` funciona. La distinción
`beta`-vs-`latest` resultó ser cosmética para lo que preocupaba: el paquete
es público, indexado e instalable en ambos casos; `@beta` era una pulsación
de teclas, no una barrera.

**Qué pasa con las razones de la pausa**:
- *"Iván es el único consumer previsible"* → sigue siendo cierto. Sin difusión
  ni promoción, los consumers reales son ~0.
- *"Publicar implica compromiso de mantenimiento sostenido"* → asumido. El
  coste escala con consumers reales; hoy es teórico.
- *"Sin urgencia de DS público, mejor esperar"* → **superado**: la urgencia no
  era publicar, era **no perder el nombre**.

**Implicaciones aplicadas**:
- `README.md`: la nota "aún no está publicado a npm" + instalación por
  clone/`npm link` era **falsa** desde el publish → sustituida por
  `npm install` con el aviso de pre-release; el clone/`npm link` se conserva
  como vía de desarrollo sobre la librería.

**Lo que NO cambia**: el tag `rc.1` sigue pendiente y la API congelada manda.
Publicar una beta no adelanta el release ni relaja el freeze.

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
