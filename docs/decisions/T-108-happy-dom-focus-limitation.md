# T-108 — Tests de focus APG menu pattern: spy global sobre `HTMLElement.prototype.focus`

**Fecha**: 2026-05-11
**Estado**: ✅ APLICADO en Menu (C-03 RC1)

## Decisión

Los tests de focus management en componentes que usan Floating UI con APG menu pattern (Menu y futuros `Popover` / `HoverCard`) verifican el **contrato de invocación `.focus()`** mediante `vi.spyOn(HTMLElement.prototype, "focus")` con introspección de `mock.contexts` (el elemento sobre el que se llamó `.focus()`).

NO se verifica `document.activeElement` ni roving tabindex (`tabindex="0"/"-1"` dinámico).

## Razón

Dos limitaciones convergen:

1. **happy-dom no actualiza `document.activeElement`** de manera fiable cuando `.focus()` se llama programáticamente sobre elementos con `tabIndex` transitorio. Tests con `toHaveFocus()` / `document.activeElement` quedan en falso negativo aunque FUI sí invoque `.focus()` correctamente.

2. **APG menu pattern NO usa roving tabindex** (`tabindex="0"/"-1"` dinámico). En menus, `Tab` NO navega entre items — solo arrows + typeahead. El foco entra al primer/último item via `.focus()` programático invocado por `useListNavigation` con `focusItemOnOpen: 'auto'`. Por tanto `tabIndex={-1}` hardcoded en `MenuItem` es **correcto APG** (permite `.focus()` programático sin entrar al Tab order del documento).

   Roving tabindex (`0`/`-1` dinámico) aplica a Toolbar, RadioGroup, ListBox single-select — componentes donde `Tab` sí debe navegar. NO al Menu.

3. **FUI `useListNavigation` con `focusItemOnOpen: 'auto'`** invoca `.focus()` directo sobre `listRef.current[i]` **sin propagar a `activeIndex` via `onNavigate` en el initial focus** (solo en navegación subsiguiente con flechas). Intentar derivar el estado de "qué item está activo" desde `activeIndex` del state externo falla para el primer focus tras open.

## Solución aplicada

```ts
it("ArrowDown en trigger abre y FUI invoca .focus() en primer item", async () => {
  render(<Menu>...</Menu>);
  const trigger = screen.getByRole("button", { name: /abrir/i });
  const focusSpy = vi.spyOn(HTMLElement.prototype, "focus");
  trigger.focus();
  focusSpy.mockClear();
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  await waitFor(() => {
    const focusedFirst = focusSpy.mock.contexts.some((el) => {
      const node = el as HTMLElement;
      return (
        node.getAttribute?.("role") === "menuitem" &&
        node.textContent === "Uno"
      );
    });
    expect(focusedFirst).toBe(true);
  }, { timeout: 1500 });
  focusSpy.mockRestore();
});
```

El spy es **global** (sobre `HTMLElement.prototype`) para ser robusto a remount — las dos ramas JSX `open ? ... : ...` del `MenuContent` pueden crear `div` elements distintos en cada cambio de estado, y los MenuItems podrían remountarse. El spy captura llamadas en cualquier instancia.

`mock.contexts` discrimina por `role="menuitem"` + `textContent` exacto, evitando falsos positivos por llamadas a `.focus()` sobre el trigger u otros elementos.

## Trade-off

- **Tests unit** verifican el **contrato de invocación** (`.focus()` se llama sobre el nodo correcto). Es lo que un browser real ejecutará.
- **Tests e2e (futuros, fuera de RC1)** verificarán el efecto DOM real (`document.activeElement`) en Playwright/Cypress.

Cobertura aceptable para RC1: el patrón APG menu queda verificado en su contrato observable; la actualización de `document.activeElement` queda diferida a e2e en 1.1+.

## Referencias

- happy-dom focus management: `document.activeElement` no se sincroniza con `.focus()` programáticas con tabIndex transitorio.
- WAI-ARIA APG menu pattern: https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
  - "Tab and Shift+Tab move focus to and from the menu" → entrada/salida del menú entero, NO navegación entre items.
  - "Down Arrow / Up Arrow: opens menu and moves focus to first/last menuitem" → via `.focus()` programático.
- Floating UI `useListNavigation`: https://floating-ui.com/docs/useListNavigation
  - `focusItemOnOpen: 'auto'` detecta evento de apertura keyboard vs click; en keyboard, invoca `.focus()` directo en el item (no notifica `onNavigate` para initial focus).

## Aplicado a

- `Menu` (PR `refactor/options-menu-to-menu-fui`, RC1).
- A futuros `Popover` / `HoverCard` / componentes floating con `useListNavigation` o focus management programático.

## Cierra

- T-108 (issue de tests detectado durante migración Menu a FUI, C-03).
