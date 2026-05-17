# C-03 — Hand-rolled Menu vs Floating UI

**Fecha**: 2026-05-10 → **resuelto 2026-05-17 (post-D2 RC1 gate review beta.24)**
**Estado**: ✅ **DONE en beta.24**. Migración completa a FUI primitive realizada
en B1-PR3 (D2 + D7).

## Contexto

`docs/RC1_GATE_REVIEW.md § VI` (línea 1349):

> ## C-03 — Hand-rolled Menu vs Floating UI
>
> Tooltip usa Floating UI. Menu no. Si llega `floating/menu/MenuContent`, dos arquitecturas en paralelo para siempre.

Estado actual verificado el 2026-05-10:

```bash
$ grep -cE "useFloating|useFocus|useHover|useDismiss|@floating-ui" src/components/Menu/Menu.tsx
0
```

`Menu` es 100% hand-rolled. `Tooltip` (post-RC1 en subfamilia `floating/`) sí usa `@floating-ui/react`. La preocupación del review: si el roadmap añade `floating/menu/MenuContent`, el DS publica RC1 con dos arquitecturas paralelas para componentes hermanos (overlay/menu).

## Decisión original (2026-05-10): diferir a 1.1.0

Pre-D2: mantener Menu hand-rolled en RC1, migrar a FUI en 1.1.0.

## Decisión revisada (2026-05-17, post-D2 gate review beta.24): MIGRAR PRE-RC1

D2 ejecutado en B1-PR3:
- `<FloatingPortal>` wrap MenuContent (escapa ancestor overflow:hidden).
- `floatingStyles` inline aplicado (flip+shift+offset visible).
- `data-side`/`data-align`/`data-state` attributes para CSS hooks.
- `<FloatingFocusManager>` con `returnFocus`.
- `<FloatingNode>` para cascade dismiss via FloatingTree.
- Unmount-on-close (no más CSS-hidden + `:focus-within` fallback).
- Path move: `src/components/Menu/` → `src/components/floating/Menu/` (D7.1).

Razón del cambio respecto al diferimento original: bajo gate review
beta.24 (cierre Bloque 0), CONV-3 + EXC-A1-17 + audit A2 BLOCKER
explícito sobre "Menu importa FUI pero no usa portal" forzaron
re-evaluar. Sin amortiguadores de tiempo, la migración era el camino
correcto pre-rc.1 — diferimento era "marketing de deuda técnica"
(documentar limitación como feature).

Tests nuevos cubren flip/shift/portal/cascade behavior (3 stories
cruzadas Tooltip ya cubrían integración con FloatingTree).

### Decisión original conservada como contexto histórico:

### Razonamiento

- **Coste de migrar pre-RC1**: trabajo grande (semana+ mínimo). Tests verde actualmente (Menu + MenuTrigger + MenuItem + MenuContent + MenuSeparator + MenuLabel). Migración requiere reescritura completa de positioning + keyboard nav + a11y compliance. Riesgo alto de regresión en RC1.
- **Coste de NO migrar**: dos arquitecturas paralelas si llega `floating/menu/MenuContent` post-RC1.
- **Mitigación de la convivencia**: nombrar las APIs nuevas con prefijo `floating/` ya separa visualmente (`@/components/Menu` vs `@/components/floating/menu/...`). El consumer puede elegir cuál usar caso por caso. Cuando `floating/menu/MenuContent` esté listo, `Menu` (hand-rolled) puede deprecarse en 2.0.
- **No-regret**: si nunca llegamos a construir `floating/menu/`, el hand-rolled actual no necesita cambio.

## Plan post-RC1

1. Construir `floating/popover/Popover` y `floating/menu/MenuContent` en 1.1.0+ con la API consensuada para la subfamilia.
2. Documentar paralelismo en docs/POST_RC1_BACKLOG.md durante el periodo de transición.
3. Cuando la subfamilia `floating/menu/` esté completa y estable, marcar `Menu` (hand-rolled) como `@deprecated` en JSDoc + CHANGELOG con migration guide. Eliminar en 2.0.

## Reapertura

Reabrir si:
- El roadmap descarta la subfamilia `floating/menu/` por completo (mantener hand-rolled como permanente, este doc se actualiza a "decisión permanente").
- Aparece un consumer reportando bugs de positioning del hand-rolled que serían triviales en FUI.
- Pre-2.0, decidir el camino de deprecación + migration tooling para consumers existentes.
