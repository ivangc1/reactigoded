# D3 — Callback rename C.2 DS-wide (Pagination, Stepper, ThemeToggle, Sidebar)

**Fecha**: 2026-05-17
**Estado**: ✅ DONE en beta.24.
**Origen**: gate review § B-06 + sesión Bloque 0 sprint D3.

## Decisión

**C.2 — Rename DS-wide callbacks aligned al prop name local cuando el
prop tiene nombre de dominio**. 4 components afectados:

| Componente | Prop name | Callback antes | Callback después |
|---|---|---|---|
| Pagination | `page` (renamed de `currentPage`) | `onValueChange` | `onPageChange` |
| Stepper | `active` | `onValueChange` | `onActiveChange` |
| ThemeToggle | `theme` | `onValueChange` | `onThemeChange` |
| Sidebar | `collapsed` | `onValueChange` | `onCollapsedChange` |

## Sub-patrón DS articulado

Verificable in situ: el DS NO tiene regla "todo callback es `onValueChange`".
Tiene sub-patrón observable basado en si el prop name es semántico o
arbitrario:

- **Prop name arbitrario** (`value` para state genérico):
  Tabs (`value: string` para tab IDs), Accordion (`value: string | null`
  para item IDs), Slider (`value: number`), Rating (`value: number`).
  Callback: `onValueChange`.

- **Prop name de dominio** (semántico, identifica qué state representa):
  Pagination (`page` 1-based), Stepper (`active` idx), ThemeToggle
  (`theme` light/dark/system), Sidebar (`collapsed` boolean).
  Callback: `on<PropName>Change` con casing matched (`onPageChange`,
  `onActiveChange`, `onThemeChange`, `onCollapsedChange`).

Regla: **el callback aligns al prop name local**. Si prop es `value`,
callback es `onValueChange`. Si prop es `page`, callback es `onPageChange`.

## Por qué C.2 sobre C.1 (Pagination-only)

Versión previa (C.1) renombraba solo Pagination. Critica del filtro
agresivo en sesión Bloque 0 D3: si la regla "callback aligned al prop"
es DS-wide, aplicar solo a Pagination deja 3 outliers internos
(Stepper, ThemeToggle, Sidebar) con `onValueChange` mientras sus props
son de dominio. Cualquier auditor externo competente flag-earía la
inconsistencia.

C.2 cierra los 4 simultáneo. Pre-rc.1 es el momento — breakings
aceptables porque API pública no congelada todavía.

## Componentes aligned (sin cambio)

Accordion, Rating, Slider, Tabs: sus props se llaman `value`, callbacks
`onValueChange` son ya aligned localmente. Sin rename.

Toast, Theme, ToastProvider, FloatingTreeRoot: ver decision doc D11
sobre hooks/providers públicos formales.

## Migration consumer

Mecánico sed:

```bash
# Pagination
sed -i 's/currentPage=/page=/g; s/onValueChange={/onPageChange={/g' archivos-pagination.tsx
# Stepper
sed -i 's/onValueChange={/onActiveChange={/g' archivos-stepper.tsx
# ThemeToggle
sed -i 's/onValueChange={/onThemeChange={/g' archivos-themetoggle.tsx
# Sidebar
sed -i 's/onValueChange={/onCollapsedChange={/g' archivos-sidebar.tsx
```

Cuidado con cross-componente: si un archivo usa Pagination + Stepper,
sed global cambiaría todos. Mejor aplicar por archivo o usar IDE
refactor con scope.

## Acoplamientos

- **D4 (Sidebar)** depende de D3 en el callback rename. D4 añade
  sub-decisiones específicas de Sidebar (SidebarItem aria-label
  conditional, useSidebar JSDoc rewrite).
- **D5 (Stepper uncontrolled)** llega post-D3 — añade `defaultActive`
  + interactive gate corregido + wiring setActive. Independiente del
  rename pero ambos pre-rc.1.
- **B-01 README sweep** (B1-PR1) actualizará las referencias en docs
  públicas tras este PR mergeado.

## Reapertura

Reabrir si:
- Algún consumer reporta confusión específica con el sub-patrón (improbable).
- Aparece nuevo componente DS con state semántico — aplicar regla
  desde diseño inicial, no como rename retroactivo.
