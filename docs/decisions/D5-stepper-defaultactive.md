# D5 — Stepper `defaultActive` + modo uncontrolled

**Fecha**: 2026-05-17
**Estado**: ✅ **IMPLEMENTADO en beta.24** (gate review claudegate3)
**Origen**: C.2 callback rename + patrón controlled/uncontrolled DS-wide

## Contexto

Pre-D5, `Stepper` era el último componente del DS con estado público que rompía el patrón controlled/uncontrolled DS-wide:

```tsx
export interface StepperProps {
  active: number;                                  // ← OBLIGATORIO
  onActiveChange?: (next: number) => void;
  // ...
}
```

Sin modo uncontrolled, el consumer DEBE gestionar el estado externamente incluso para casos sencillos:

```tsx
// Pre-D5 — requiere useState siempre, aunque no necesites observar transiciones.
const [step, setStep] = useState(0);
<Stepper active={step} onActiveChange={setStep}>{steps}</Stepper>
```

Esto rompe la simetría con Pagination (D3), Sidebar (D4), Tabs, Accordion, Switch, Slider, Rating, ThemeToggle — todos con patrón `value?` + `defaultValue?` + `onValueChange?`.

## Decisión

Stepper adopta el patrón DS-wide:

```ts
export interface StepperProps {
  active?: number;                                 // opcional → controlled o ausente
  defaultActive?: number;                          // valor inicial en uncontrolled (default 0)
  onActiveChange?: (next: number) => void;         // callback (sigue C.2 rename)
  // ...
}
```

### Semántica de modos

| Props pasados | Modo | Interactive |
|---|---|---|
| `active=N` | Controlled | NO (sin callback no hay forma de aplicar transición) |
| `active=N, onActiveChange=fn` | Controlled | SÍ (callback es el único vector de cambio) |
| `defaultActive=N` (o nada) | Uncontrolled | SÍ (estado interno + opcional observer) |
| `defaultActive=N, onActiveChange=fn` | Uncontrolled + observer | SÍ |

Razonamiento de "controlled-sin-callback queda presentational": habilitar keyboard nav cuando no hay forma de aplicar la transición es confuso — el focus se movería visualmente pero `aria-current` quedaría congelado. La decisión coincide con la API pre-D5 (que tenía esta semántica intencionalmente).

### Razonamiento de "uncontrolled-siempre-interactive"

Si el consumer pasa `defaultActive` (o nada), está pidiendo un valor inicial mutable. Sin keyboard nav / clicks ese valor sería un display estático sin razón de ser — caso degenerate. La API canónica para "stepper estático" sigue siendo controlled + sin callback.

## Implementación

```tsx
// Stepper.tsx
const { value: rawActive, setValue: setActive } = useControllableState<number>({
  value: active,
  defaultValue: defaultActive ?? 0,
  onChange: onActiveChange,
});

const isControlled = active !== undefined;
const interactive = !isControlled || onActiveChange !== undefined;

// Keyboard handlers + click handler invocan `setActive(nextIdx)` en
// ambos modos. useControllableState resuelve internamente:
// - Controlled: NO actualiza state interno, llama onChange.
// - Uncontrolled: actualiza state interno + llama onChange si está.
```

`useControllableState` ya emite dev-warn de "controlled without onChange" — patrón DS-wide reutilizado.

## Tests añadidos (Stepper.test.tsx)

Nuevo `describe("Stepper — modo uncontrolled (D5 beta.24)")` con 7 casos:

1. Sin `active` arranca en `defaultActive` (default 0).
2. `defaultActive=N` setea el valor inicial.
3. Uncontrolled siempre es interactive (dots focuseables sin `onActiveChange`).
4. ArrowRight actualiza estado interno sin callback consumer.
5. Click en step actualiza estado interno sin callback consumer.
6. `onActiveChange` en uncontrolled actúa como observer.
7. Controlled sin `onActiveChange` queda presentational (regression guard del comportamiento pre-D5).

## API pública pre-D5 vs D5

| Antes | Después |
|---|---|
| `active: number` (obligatorio) | `active?: number` (opcional) |
| — | `defaultActive?: number` (nuevo, opcional, default 0) |
| `onActiveChange?: (next: number) => void` | (sin cambio) |

**No breaking change**: consumers que pasaban `active` siguen funcionando idénticamente. Consumers que pasaban `active` + `onActiveChange` también. La adición de uncontrolled solo abre comportamientos nuevos sin remover ninguno.

## Dev-warn

`useControllableState` emite "controlled without onChange" si `active` está definido pero `onActiveChange` está omitido — comportamiento DS-wide. La validación de `active` out-of-range (B-05) se preserva pero solo aplica en modo controlled (los valores que vengan del propio Stepper en uncontrolled siempre están en rango).

## Patrón organizacional consolidado

D5 cierra el último componente de estado del DS que rompía la simetría. Todos los componentes con estado interno ahora siguen el mismo patrón:

| Componente | Prop controlled | Prop uncontrolled | Callback |
|---|---|---|---|
| Accordion | `value` | `defaultValue` | `onValueChange` |
| Pagination | `page` | `defaultPage` | `onPageChange` |
| Rating | `value` | `defaultValue` | `onValueChange` |
| Sidebar | `collapsed` | `defaultCollapsed` | `onCollapsedChange` |
| Slider | `value` | `defaultValue` | `onValueChange` |
| Stepper | `active` | `defaultActive` | `onActiveChange` |
| Switch | `checked` | `defaultChecked` | `onCheckedChange` |
| Tabs | `value` | `defaultValue` | `onValueChange` |
| ThemeToggle | `theme` | `defaultTheme` | `onThemeChange` |
