# M-01 — Polymorphic `as` solo en Card

**Fecha**: 2026-05-10
**Estado**: status quo (mantener solo en Card), decisión patrón global diferida a 2.0
**Origen**: gate review § IV.3 línea 1086

## Contexto

`<Card>` es el único componente del DS con prop `as` polimórfica:

```tsx
<Card as="article">...</Card>
<Card as="a" href="/...">...</Card>
<Card as={Link}>...</Card>
```

El review pregunta si extenderlo a TODOS los componentes (con patrón Slot consistente estilo Radix) o eliminarlo de Card por consistencia.

## Decisión

**Status quo**: mantener `as` solo en Card. **Decidir patrón global en 2.0**.

## Por qué NO extender ahora

- Implementar Slot/asChild en TODOS los componentes pre-RC1 es **trabajo masivo**: 32 componentes, cada uno con su propio set de props HTML que tienen que tipar correctamente con genéricos polimórficos.
- Patrón Slot tiene trade-offs reales: ergonomía vs DX. Radix lo resuelve con `asChild` que esconde el polymorfismo en el DOM resolution.
- Pre-RC1 no es el momento de tomar esta decisión arquitectónica de raíz.

## Por qué NO eliminar de Card

- Card es el caso de uso paradigmático (link card, article card, button card). Eliminarlo es regresión real para el consumer.

## Plan post-RC1

- 1.1+: evaluar Slot pattern en componentes piloto (Tooltip M-05, Button como link). Si funciona bien, extender uniformemente.
- 2.0: decisión final del patrón polimórfico para todo el DS. Migración mecánica con codemod si se elige Slot.

## Reapertura

Reabrir si:
- 1.1+ valida Slot pattern en pilotos → migración progresiva.
- Consumer reporta inconsistencia del DS al no poder usar `as` en otros componentes habituales (Button, Badge).

## Cierra parcialmente

- **M-01** (MEDIUM del gate review § IV.3)
