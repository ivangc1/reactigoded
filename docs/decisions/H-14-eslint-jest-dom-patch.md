# H-14 — `eslint-plugin-jest-dom` patch local

**Fecha**: 2026-05-10
**Estado**: status quo (mantener patch local hasta upstream actualice)
**Origen**: gate review § IV.2 línea 892

## Contexto

`patches/eslint-plugin-jest-dom+5.5.0.patch` (gestionado por `patch-package`) sustituye `context.getSourceCode()` (retirado en ESLint 9+) por `context.sourceCode` en `dist/context.js` + 3 reglas afectadas.

Upstream (`eslint-plugin-jest-dom@5.5.0`) sin update desde feb 2025 por NPM_TOKEN inválido del bot semantic-release. El maintainer principal (@benmonro) no responde y solo él tiene permisos para republicar. Issue upstream tracking: https://github.com/testing-library/eslint-plugin-jest-dom/issues/417.

## Decisión

**Status quo**: mantener patch local hasta que upstream se mueva.

## Por qué NO ahora (opciones rechazadas)

- **PR upstream**: el repo upstream no tiene maintainers activos respondiendo. Un PR queda colgado indefinidamente.
- **Sustituir plugin** (eslint-community fork): trabajo grande sin garantía de longevidad. Probable que el fork también muera.

## Operativa actual

- `prepare` hook del package.json invoca `patch-package` automáticamente en `npm install` local.
- Consumer del paquete final NO ejecuta el `prepare` hook (`prepublishOnly` lo bloquea).
- CI corre el patch en cada install + verify.

## Plan post-RC1

- **Trigger 1**: upstream actualiza. `npm install` la versión nueva, `rm patches/eslint-plugin-jest-dom+*`.
- **Trigger 2**: aparece fork mantenido (eslint-community o testing-library oficial). Migrar al fork.
- **Trigger 3**: el patch se rompe con upgrade de ESLint mayor. Re-evaluar.

## Cierra

- **H-14** (HIGH del gate review § IV.2)
