# C-04 — `useOptionsMenu`/`useTabs`/etc accidentalmente públicos

**Fecha**: 2026-05-10
**Estado**: cerrada como duplicado de **B-04**

## Contexto

`docs/RC1_GATE_REVIEW.md § VI` (línea 1354) documenta C-04 como decisión cuestionada:

> ## C-04 — `useOptionsMenu`/`useTabs`/etc. accidentalmente públicos (B-04)
>
> Cubierto en B-04.

El propio review lo marca como duplicado de **B-04** (BLOCKER). No hay decisión separada — C-04 es la misma observación enmarcada como "decisión cuestionada", B-04 es la misma cosa enmarcada como "BLOCKER que requiere fix antes de RC1".

## Decisión

Cerrar C-04 sin acción separada. La resolución se aplicará al cerrar **B-04** ("Resolver inconsistencia hooks públicos: README vs `src/index.ts` vs dist").

## Impacto en L-10

L-10 (audit de `dist/index.d.ts`) ya identificó los 12 sospechosos cat3 acoplados a esta decisión:

- 6 hooks: `useAccordion`, `useAccordionItem`, `useOptionsMenu`, `useSidebar`, `useTabs`, `useToast`
- 6 ContextValues: `AccordionContextValue`, `AccordionItemContextValue`, `OptionsMenuContextValue`, `SidebarContextValue`, `TabsContextValue`, `ToastContextValue`

Cuando B-04 se cierre, los 12 sospechosos se resuelven en la misma operación. Ver `docs/decisions/L-10-no-bundle-types.md` § Coupling con C-04.

## Reapertura

No aplica. Si B-04 se cierra parcialmente o se decide mantener los hooks como API pública, este doc se actualiza para reflejar la coherencia.
