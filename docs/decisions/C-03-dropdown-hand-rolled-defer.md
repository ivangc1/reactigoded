# C-03 — Hand-rolled OptionsMenu vs Floating UI

**Fecha**: 2026-05-10
**Estado**: **diferida a 1.1.0** como decisión consciente

## Contexto

`docs/RC1_GATE_REVIEW.md § VI` (línea 1349):

> ## C-03 — Hand-rolled OptionsMenu vs Floating UI
>
> Tooltip usa Floating UI. OptionsMenu no. Si llega `floating/menu/OptionsMenuContent`, dos arquitecturas en paralelo para siempre.

Estado actual verificado el 2026-05-10:

```bash
$ grep -cE "useFloating|useFocus|useHover|useDismiss|@floating-ui" src/components/OptionsMenu/OptionsMenu.tsx
0
```

`OptionsMenu` es 100% hand-rolled. `Tooltip` (post-RC1 en subfamilia `floating/`) sí usa `@floating-ui/react`. La preocupación del review: si el roadmap añade `floating/menu/OptionsMenuContent`, el DS publica RC1 con dos arquitecturas paralelas para componentes hermanos (overlay/menu).

## Decisión

**Diferir migración a 1.1.0**. Mantener OptionsMenu hand-rolled en RC1.

### Razonamiento

- **Coste de migrar pre-RC1**: trabajo grande (semana+ mínimo). Tests verde actualmente (OptionsMenu + OptionsMenuTrigger + OptionsMenuItem + OptionsMenuContent + OptionsMenuDivider + OptionsMenuHeader). Migración requiere reescritura completa de positioning + keyboard nav + a11y compliance. Riesgo alto de regresión en RC1.
- **Coste de NO migrar**: dos arquitecturas paralelas si llega `floating/menu/OptionsMenuContent` post-RC1.
- **Mitigación de la convivencia**: nombrar las APIs nuevas con prefijo `floating/` ya separa visualmente (`@/components/OptionsMenu` vs `@/components/floating/menu/...`). El consumer puede elegir cuál usar caso por caso. Cuando `floating/menu/OptionsMenuContent` esté listo, `OptionsMenu` (hand-rolled) puede deprecarse en 2.0.
- **No-regret**: si nunca llegamos a construir `floating/menu/`, el hand-rolled actual no necesita cambio.

## Plan post-RC1

1. Construir `floating/popover/Popover` y `floating/menu/OptionsMenuContent` en 1.1.0+ con la API consensuada para la subfamilia.
2. Documentar paralelismo en docs/POST_RC1_BACKLOG.md durante el periodo de transición.
3. Cuando la subfamilia `floating/menu/` esté completa y estable, marcar `OptionsMenu` (hand-rolled) como `@deprecated` en JSDoc + CHANGELOG con migration guide. Eliminar en 2.0.

## Reapertura

Reabrir si:
- El roadmap descarta la subfamilia `floating/menu/` por completo (mantener hand-rolled como permanente, este doc se actualiza a "decisión permanente").
- Aparece un consumer reportando bugs de positioning del hand-rolled que serían triviales en FUI.
- Pre-2.0, decidir el camino de deprecación + migration tooling para consumers existentes.
