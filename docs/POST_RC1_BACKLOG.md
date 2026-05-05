# POST-RC1 backlog

Cosas que se han visto durante la sesión `rc1-gate-fixes` y se han
**dejado intencionalmente fuera** del scope de los Blockers/Highs del
plan. No bloquean la promoción a `1.0.0-rc.1`. Se procesan en una
sesión posterior.

Cada entrada documenta:
- **De dónde sale**: el fix que descubrió la observación.
- **Por qué no se arregló ahora**: scope creep, decisión política,
  riesgo, o coste/beneficio bajo.
- **Acción concreta** cuando se procese.

---

## CSP estricta — script inline en `.storybook/main.ts`

**De dónde sale**: revisión humana de C5 (B-04 + B-05).

**Observación**: el `managerHead` inyecta un script inline que ejecuta
JS en el `<head>` (lang fix, dedupe, rewrite del title). Si en algún
momento el sitio quiere CSP estricta con `script-src 'self'` (sin
`'unsafe-inline'`), este script rompe.

**Por qué no se arregla ahora**: scope creep. El sitio actual no usa
CSP estricta y el coste/beneficio para RC1 es bajo.

**Acción**: extraer el script a `.storybook/manager-head.js`
(`<script src="..." />`). Empaquetarlo en build de Storybook y
referenciarlo desde `managerHead`. Verificar que el bundle copia el
archivo a `storybook-static/`.

---

## Observer race benigna en el script de `.storybook/main.ts`

**De dónde sale**: análisis del C5.

**Observación**: si Storybook hace `head.replaceChild(newTitle,
oldTitle)`, el observer registrado en el `<title>` viejo dispara con
un valor stale **un tick antes** de que el observer del `head` también
dispare con la mutación de `childList`. Resultado: `rewrite() + dedupe()`
corren 2 veces seguidas.

**Por qué no se arregla ahora**: el dedupe es idempotente y rewrite
solo escribe si la condición de regex matchea. Coste: cero. No es bug.

**Acción**: ninguna. Documentado para que un futuro lector no se
asuste si ve `rewrite()` corriendo en pares en DevTools.

---

## CI step explícito de greps `console.*` en `dist/`

**De dónde sale**: B-07 (commit `626ef77`) — verificación local
imposible en Windows por el bug de `@rolldown/binding-win32-x64-msvc`.

**Observación**: hoy si un `console.warn` sobreviviese a producción,
`size-limit` lo detectaría como crecimiento de bundle, pero la señal
no es limpia (puede confundirse con features legítimas).

**Acción**: añadir step a `.github/workflows/verify.yml`:

```yaml
- name: Bundle has no dev warns
  run: |
    test "$(grep -c 'console\.' dist/index.js || true)" = "0"
    test "$(grep -c 'console\.' dist/index.cjs || true)" = "0"
    test "$(grep -c '\[reactigoded\]' dist/index.js || true)" = "0"
```

(Ya hay registro previo en `docs/RC1_FOUND_DURING_FIX.md`. Esta
entrada lo eleva a backlog accionable post-RC1.)

---

## `src/utils/env.ts` huérfano

**De dónde sale**: B-07 (commit `626ef77`) eliminó todos los imports
de `isDev()` desde componentes.

**Observación**: la función `isDev()` ya no es importada por ningún
archivo del repo (sólo el archivo que la define). Está excluida del
dts publicado vía `tsconfig.build.json` y del tarball vía
`scripts/clean-internal-dist.mjs`.

**Por qué no se arregla ahora**: borrarla en este ciclo es scope creep
para B-07. La regla "un commit, un objetivo" lo prohíbe.

**Acción**: en una sesión post-RC1 borrar `src/utils/env.ts`,
`src/utils/env.test.ts` (si existe) y limpiar la entrada
`"src/utils/env.ts"` del exclude de `tsconfig.build.json` y del
prefix list de `clean-internal-dist.mjs`. Commit
`chore: remove orphaned env.ts util`.

---

## `.claude/` directorio untracked en el repo

**De dónde sale**: visible en `git status` durante toda la sesión
RC1.

**Observación**: el directorio contiene datos de sesión Claude Code
(prompts, transcripts internos). Si en algún commit alguien ejecuta
`git add -A` o `git add .`, el directorio entra al repo público con
todo el contenido sensible.

**Por qué no se arregla ahora**: intencionalmente no lo añadí al
`.gitignore` durante esta sesión porque ya existían los archivos en
working tree y quería evitar agruparlo con los Blockers.

**Acción**: en un commit limpio y separado:
```bash
echo ".claude/" >> .gitignore
git add .gitignore
git commit -m "chore(gitignore): exclude .claude/ session data"
```

---

## ThemeSwitch SSR test versión A (borrar `globalThis.document`)

**De dónde sale**: C6 (B-08). El test #6 actual (`renderToString` smoke)
valida que ThemeSwitch no rompe en `react-dom/server`, pero NO valida
explícitamente el branch `typeof document === "undefined"` del `derive`
porque jsdom siempre tiene `document`.

**Por qué no se hace ahora**: borrar `globalThis.document` con
`vi.stubGlobal('document', undefined)` y restaurarlo en cleanup tiene
casos esquina (otros tests, internals de React, internals del runner)
que justifican una sesión propia con cleanup robusto. Pre-RC1 el coste
supera al beneficio incremental.

**Acción**: activar si un consumer SSR real abre issue de regresión
(Next.js, Astro, Remix). Implementación esperada:

```ts
it("SSR sin document: derive cae a defaultTheme sin lanzar", () => {
  vi.stubGlobal('document', undefined);
  try {
    const html = renderToString(<ThemeSwitch defaultTheme="light" />);
    expect(html).toContain('role="switch"');
  } finally {
    vi.unstubAllGlobals();
  }
});
```

Validar antes que `vi.unstubAllGlobals()` no rompe el runner, y que
internals de React 19 no requieren `document` en `renderToString`.

---

## Notas dispersas sin tocar (`.notes-beta15..18.txt`, `.release-beta14..18.sh`, `BLOQUEOS.md`, `SESION-RESUMEN*.md`)

**De dónde sale**: `git status` durante toda la sesión.

**Observación**: archivos locales del autor que aparecen como
`untracked` y nunca se han committeado. Algunos serían interesantes
para tracking interno (BLOQUEOS, SESION-RESUMEN) pero no para el
repo público.

**Por qué no se arregla ahora**: decisión del autor — no es scope
RC1.

**Acción**: el autor decide si añadirlos al `.gitignore` (recomendado
para `.notes-*` y `.release-*`) o moverlos a `~/notes/` fuera del
repo.

---
