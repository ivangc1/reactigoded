# CLAUDE.md — protocolos del repo para Claude Code

Este archivo lo lee Claude Code automáticamente al abrir el repo y
fija convenciones que el linter/CI no pueden enforzar.

## Verify cold — protocolo obligatorio

PROHIBIDO usar `| tail -N` para verificar exit codes de lint/typecheck/tests.
`tail` siempre devuelve exit 0 si lee algo, lo que oculta fallos reales.

Patrón correcto:

```bash
npm run lint || { echo "LINT FAIL"; exit 1; }
npm run typecheck || { echo "TYPECHECK FAIL"; exit 1; }
npx vitest run --project unit || { echo "TESTS FAIL"; exit 1; }
```

`tail -N` queda permitido SOLO para inspección humana después de un
fallo, nunca como gate de CI ni dentro de cadenas `&&`/`;`.

Para iterar en una task, ejecutar `bash scripts/verify-cold.sh`. El
script reproduce el mismo patrón con tests del componente afectado o
de toda la suite según se invoque.

## Imports

- Intra-componente → relativo (`./Button.styles`, `./useButton`).
- Cross-componente → alias `@/...` (`@/components/Button`, `@/hooks/useTheme`).
- Sin excepciones. La regla está documentada en `feedback_imports_alias.md`
  de la memoria persistente de Claude.

## Dev warns

Patrón canónico del DS (ver `Slider.tsx`, `Pagination.tsx`,
`Stepper.tsx`):

```tsx
const warnedRef = useRef(false);
useEffect(() => {
  if (!import.meta.env.DEV) return;
  if (warnedRef.current) return;
  if (<condición>) {
    warnedRef.current = true;
    console.warn(`[reactigoded] <Componente prop=...> ...`);
  }
}, [<deps>]);
```

NO usar `process.env.NODE_ENV` (Node global, no disponible en
typecheck strict del DS browser sin `@types/node` en
`compilerOptions.types`).

## Workflow PRs

- BLOCKERs estructurales: PR separado por task (bisect-friendly).
- Quick wins cohesivos: agrupables en un PR con commits atómicos
  (uno por task) para que `git bisect` funcione.
- PR body siempre via `--body-file <archivo.md>`. Nunca heredoc con
  escapes complejos en bloques que el user va a pegar.
- Tras tu push del branch, Claude crea el PR con `gh pr create`
  desde su sandbox.

## Git

- Sin trailer `Co-Authored-By: Claude` en mensajes de commit.
- Force-push solo en branches privadas, nunca en main.
- Amend solo si el commit no está pusheado.
