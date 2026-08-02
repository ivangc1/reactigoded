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

## CERRADO (gate 1.0.0, 2026-08-02)

**El patch ya no existe y no hace falta.** La condición de salida que este mismo documento
declaraba —«cuando salga una versión nueva, basta instalarla y borrar el patch»— se cumplió:
`eslint-plugin-jest-dom@5.10.1` ya no usa `context.getSourceCode()`. Verificado: **0**
ocurrencias en `dist/rules/`, y `patch-package` rechazaba aplicar el patch por desajuste de
versión (hecho para 5.5.0, instalada 5.10.1).

Se retiran las tres piezas: `patches/`, la devDependency `patch-package` y el hook `prepare`.

**Efecto colateral que cierra otro hallazgo**: sin `prepare` en el manifest publicado, `SYM-1`
desaparece de raíz. Ya no hay hook que se ejecute al instalar desde un directorio o un symlink,
así que `npm link` y `npm install file:<dir>` no tienen nada que romper — ni siquiera hace falta
el guard `existsSync("patches")` que se había añadido para ello.

Nota de método: la 5.10.1 trajo además dos reglas nuevas. Una de ellas,
`jest-dom/prefer-to-have-value`, tiene un **autofix incorrecto** para atributos ARIA: convirtió
5 aserciones sobre `aria-valuenow` en `toHaveValue()` y rompió 10 tests de `Progress`, porque
`toHaveValue` lee la propiedad `value` de un control de formulario y un
`<div role="progressbar">` no la tiene. Está desactivada solo en ese fichero, con la razón
escrita ahí.

Lo de abajo queda como registro histórico del problema y de por qué se eligió parchear.

## Operativa (histórica)

- El hook `prepare` invocaba `patch-package` en cada `npm install` local.
- CI corría el patch en cada install + verify.

> **Corrección (gate 1.0.0, `SYM-1`).** Este documento afirmaba que «el consumer del paquete
> final NO ejecuta el `prepare` hook (`prepublishOnly` lo bloquea)». Las dos mitades son falsas:
> `prepublishOnly` es un hook del **publish de este paquete**, no bloquea nada en el consumer; y
> `prepare` **sí** se ejecuta cuando alguien instala desde un directorio o un symlink, porque
> viaja en el manifest publicado. Medido: `npm link` y `npm install file:<dir>` fallaban HARD con
> el `patch-package` pelado, y `--ignore-scripts` no lo evitaba en el npm del engine floor.
>
> Se cierra con el guard, no sacando `patch-package` de `prepare`: mover el hook a `prepack` ya
> se intentó (`3cc9249`) y hubo que revertirlo (`7d62faf`) porque `prepack` no corre en
> `npm ci`, que es justo donde el repo necesita el patch. El espacio de soluciones estaba
> acotado por esa reversión previa, no era libre.

## Plan post-RC1

- **Trigger 1**: upstream actualiza. `npm install` la versión nueva, `rm patches/eslint-plugin-jest-dom+*`.
- **Trigger 2**: aparece fork mantenido (eslint-community o testing-library oficial). Migrar al fork.
- **Trigger 3**: el patch se rompe con upgrade de ESLint mayor. Re-evaluar.

## Cierra

- **H-14** (HIGH del gate review § IV.2)
