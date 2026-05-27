# D13 — Reservas de nombres pre-rc.1

**Fecha**: 2026-05-26 (post-merge HIGH-1 #105 + HIGH-2 #106 beta.26)
**Estado**: ✅ **DECIDIDO y VIGENTE**. Aplica a 1.0.0-rc.1 y futuras minor pre-2.0.
**Origen**: cruce gate reviews beta.25 (Codex Auditor A + Claude Auditor B). Codex marcó `B-01 naming HIGH-2 ⏸` como pendiente; las reservas de esta decisión destraban el bloqueo.

## Decisión

Se reservan los siguientes nombres de exports en el API público del DS. **Reservados contra componentes NO-relacionados** — es decir, durante la línea 1.x ningún PR puede exportar bajo estos identificadores un componente cuya semántica sea distinta a la documentada en esta decisión. La introducción del componente PREVISTO en su semántica reservada (Popover FUI, ContextMenu, etc.) es el camino esperado para "levantar" la reserva — ver §"Levantamiento de reservas" + roadmap en `src/components/floating/README.md` (Popover/HoverCard/ContextMenu/Select/Combobox planeados para 1.1.0+).

Cada reserva lleva su **semántica explícita** + los nombres adyacentes contra los que NO debe usarse. Sin esta delimitación, un PR de buena fe puede reinterpretar `Popover` como "tooltip persistente" o `Field` como "input wrapper genérico" — la reserva queda en pie pero el día que llegue el componente real, el nombre ya estaría ocupado por otra cosa.

**Distinción crítica**: la reserva NO es un compromiso de no-introducción durante 1.x. Es un compromiso de **no-introducción bajo semántica distinta** durante 1.x. Las introducciones planeadas en `floating/README.md` (1.1.0+) son adiciones esperadas que cumplen este D13, no excepciones a él.

### `Select`

**Semántica reservada**: combobox FUI con anchor positioning, lista de opciones renderizables (custom item content), filtrado/búsqueda opcional, virtualización opcional, portal management con primitives FUI (internamente bajo `src/components/floating/`, expuesto al consumer vía root barrel — ver D7).

- **NO usar para**: wrapper sobre `<select>` HTML — eso es `NativeSelect` (ya existe). El día que llegue `Select`, los dos coexisten para casos distintos.
- **NO usar para**: dropdown menu de acciones — eso es `Menu` (ya existe, expuesto en el root barrel de `reactigoded` per D7.5; internamente vive en `src/components/floating/Menu/`).

### `Form`

**Semántica reservada**: form root con `FormContext` (estado de validación, submit state, dirty/touched tracking, schema integration opcional).

- **NO usar para**: helper utility tipo `useForm()` sin componente — si llega, el hook iría bajo otro nombre (`useFormState`) y `Form` queda libre para el componente compound.
- **NO usar para**: wrapper estilizado sobre `<form>` — el `<form>` nativo es lo que el DS recomienda hoy; el día que `Form` exista, será un compound con estado, no un styled wrapper.

### `Field`

**Semántica reservada**: compound `Label + Input + Helper + ErrorText` con `FieldContext` (id, describedBy wiring automático, validation state propagation).

- **NO usar para**: componente genérico "input wrapper" sin context — eso rompe la inversión actual donde el consumer compone Label/Input/Helper manualmente.
- **NO usar para**: un alias de `Input` con label encima.

### `RadioGroup`

**Semántica reservada**: container controlado con `value`/`onValueChange`, keyboard navigation (←→ entre items), `aria-activedescendant`, focus management. Inyecta context que `Radio` (existente) consume cuando está dentro del grupo. Patrón paralelo a `Stepper`/`Step` del DS — ver §"Coexistencia primitive ↔ compound".

- **NO usar para**: rebrand de `Radio` actual a `RadioGroup` — `Radio` es primitive y se queda como single input (cierra B-CROSS y respeta el caso de uso "un único radio").
- **NO usar para**: lista visual de radios sin estado controlado — eso ya se obtiene poniendo varios `Radio` con `name` compartido.

### `CheckboxGroup`

**Semántica reservada**: container controlado para selección múltiple, con `values: T[]` / `onValuesChange`. Mismo patrón que `RadioGroup` pero array de valores activos.

- **NO usar para**: rebrand de `Checkbox` actual.
- **NO usar para**: layout horizontal/vertical de checkboxes sin estado — eso es composición manual.

### `Popover`

**Semántica reservada**: popover FUI persistente con trigger click, anchor + content + arrow opcional, dismissable por click outside / Escape. Es **interactivo** — el usuario navega dentro del content.

- **NO usar para**: `Tooltip`. `Tooltip` es transient + descriptivo (hover/focus, no interactivo, dismiss al salir). Casos de uso ortogonales.
- **NO usar para**: `HoverCard`. `HoverCard` se abre por hover con delay; `Popover` por click.
- **NO usar para**: dropdown menu de acciones — eso es `Menu` (ya existente).

### `HoverCard`

**Semántica reservada**: HoverCard FUI con delay configurable, abre por hover sobre trigger, cierra por leave, content típicamente rich (perfiles, previews). NO interactivo en el sentido "el usuario hace click dentro" (eso lo rompe vs hover semantics).

- **NO usar para**: `Tooltip` con contenido más rico — el threshold conceptual es el delay + el dismiss behavior, no el tamaño del content. Si dudas, usa `Tooltip`.
- **NO usar para**: `Popover`. Si el usuario debe poder hacer click sin que se cierre solo, es `Popover`, no `HoverCard`.

### `ContextMenu`

**Semántica reservada**: menu contextual que se abre vía evento `contextmenu` (right-click / long-press en touch) sobre un target. Posicionado en el cursor.

- **NO usar para**: `Menu` (export en root barrel de `reactigoded`, internamente en `src/components/floating/Menu/`) — `Menu` abre por click sobre un trigger visible explícito (icon, button), posicionado relativo al trigger.
- **NO usar para**: dropdown que aparece como respuesta a click derecho sobre un dropdown trigger normal — eso sigue siendo `Menu`.

## Justificación

### Por qué bloquearlas explícitamente

Sin reservar, un PR posterior podría exportar bajo cualquiera de estos nombres un componente diferente (e.g., un `Select` que solo envuelve `<select>` con estilos del DS, sin Floating UI). El día que llegue el verdadero Combobox FUI, el nombre estaría ocupado y romperíamos consumers en 1.x → ese es exactamente el tipo de breaking que rc.1 quiere descartar.

Cada reserva implica un **compromiso de no-introducción bajo semántica distinta** durante la línea 1.x (no un blanket no-introducción — ver §"Decisión" introductoria + §"Levantamiento de reservas"). La introducción real del componente PREVISTO en su semántica reservada (Popover FUI 1.1.0+, ContextMenu 1.1.0+, etc., per `floating/README.md`) es una **adición**, no un rename — los consumers que ya usan `NativeSelect`, `Menu`, etc. siguen funcionando, y los que adopten `Select`, `Popover`, etc. lo hacen sobre nombres frescos.

### Coexistencia primitive ↔ compound (Radio/Checkbox + futuros Groups)

**Razón principal**: `Radio` y `Checkbox` actuales son **primitives**, no compounds. Un `Radio` solo es un `<input type="radio">` con styling y a11y — eso tiene valor sin necesidad de un Group context, igual que `<input>` no necesita un Group para existir. El Group de Radix existe para gestionar valor controlado + keyboard navigation entre items, que son problemas de **conjunto**, no de **item**.

Por eso `Radio` standalone sigue siendo válido en 1.x:

```tsx
// Caso primitive: agrupación HTML nativa, sin context controlado.
<Radio name="plan" value="free" defaultChecked>Free</Radio>
<Radio name="plan" value="pro">Pro</Radio>
```

Y cuando llegue `RadioGroup`, los consumers podrán mezclar:

```tsx
// Caso compound: estado controlado + keyboard navigation gestionado por el grupo.
<RadioGroup name="plan" value={plan} onValueChange={setPlan}>
  <Radio value="free">Free</Radio>
  <Radio value="pro">Pro</Radio>
</RadioGroup>
```

**Paralelo con `Stepper`/`Step`**: `RadioGroup` es a `Radio` lo que `Stepper` es a `Step` — compound context-aware con primitive injectable. Ambos primitives (`Step` y `Radio`) **SÍ son exports públicos** (ver `src/components/Stepper/index.ts` + roadmap futuro `Radio`/`RadioGroup`), pero la separación es por **shape de props**, no por visibilidad del componente: el primitive expone `StepProps` (público — children, label, etc.) y mantiene un `StepInternalProps` (interno — current active index, onActivate, onStepKeyDown) marcado `@internal` con `stripInternal`. El compound `Stepper` lo inyecta cuando el primitive vive dentro de su contexto; cuando se renderiza standalone, el primitive tiene defaults sensatos pero pierde la integración con el grupo.

Este patrón cerró el blocker B-STEP en beta.25 (codex BLOCKER 3 del gate review beta.25): `StepProps` y `StepInternalProps` quedaron separados para que `skipLibCheck: false` deje de fallar con TS2339 al ver props @internal que `stripInternal` había borrado del .d.ts publicado. `Radio`/`RadioGroup` heredará la misma disciplina — `RadioProps` público estable, `RadioInternalProps` que solo `RadioGroup` inyecta vía contexto (focus management, group value, keyboard navigation handlers), marcados `@internal` con `stripInternal`.

Nota operativa: LOW-6 del cruce beta.25 (tracker #161) audita si la separación `StepProps`/`StepInternalProps` está completa o si quedan props del compound expuestas como públicas. Cualquier residuo cerrará en beta.26+ y servirá de referencia exacta para el split análogo en `RadioGroup`/`CheckboxGroup` cuando lleguen.

**Para `Checkbox` + `CheckboxGroup`**: misma estructura. La diferencia con `Radio` es que el grupo gestiona `values: T[]` (multi-selection) en lugar de un único `value`.

### Coexistencia funcional (overlapping nombres)

- **`Tooltip` ≠ `Popover`**: `Tooltip` es transient + descriptivo + manejado por hover/focus, `Popover` será persistente + interactivo + manejado por click. Casos de uso ortogonales.
- **`Tooltip` ≠ `HoverCard`**: ambos abren por hover, pero `Tooltip` cierra al salir + content textual/breve; `HoverCard` mantiene abierto con grace period + content rich (no interactivo dentro).
- **`Popover` ≠ `HoverCard`**: trigger (click vs hover) + interactividad dentro (sí vs no).
- **`Menu` ≠ `ContextMenu`**: `Menu` (export root barrel, src en `floating/Menu/`) abre por click sobre trigger visible; `ContextMenu` interceptará `contextmenu` events (right-click / long-press).

### Por qué `NativeSelect` y no `Select` directamente

`NativeSelect` ya estaba consolidado pre-beta.26 (renombrado desde `Select` en una iteración anterior del DS precisamente para liberar el nombre `Select`). El componente actual envuelve `<select>` HTML nativo, no es un combobox. Mantenemos `NativeSelect` como nombre permanente — la futura `Select` será conceptualmente distinta (combobox FUI), no un rename del native.

## Cumplimiento

### Inventory actual (verificado 2026-05-26)

```
Top-level components (31): Accordion, Alert, AlertDialog, Avatar, Badge,
  Breadcrumb, Button, Card, Checkbox, Chip, Dialog, Divider, Input,
  NativeSelect, Navbar, Pagination, Progress, Radio, Rating, Sidebar,
  Skeleton, Slider, Spinner, Stepper, Switch, Table, Tabs, Textarea,
  ThemeToggle, Timeline, Toast.

Floating subpath (3): Menu, Tooltip, primitives.
```

Ninguno de los 8 nombres reservados aparece — la reserva es de futuro,
no requiere rename de nada existente. **Acción inmediata: cero.** Lo
que hace este doc es:

1. Documentar el commitment.
2. Servir de referencia para review de PRs futuros que añadan componentes (cualquier PR que intente añadir un export `Select`/`Form`/`Field`/`RadioGroup`/`CheckboxGroup`/`Popover`/`HoverCard`/`ContextMenu` debe linkear a este doc y justificar la introducción).

### Enforcement en review

No hay gate automático en CI — la cadena `src/components/*/index.ts` no es lo bastante regular para detectar regresiones del API con regex sin falsos positivos. El enforcement es por convención + review.

Si en algún momento la cadena justifica un gate automático (más reservas, más volumen de PRs), se puede añadir `scripts/check-reserved-names.mjs` que liste los exports top-level + subpath floating y falle si alguno matchea esta lista. Hoy es coste/beneficio negativo.

## Levantamiento de reservas

Cada reserva se libera por el PR de **introducción real** del componente previsto (path esperado, alineado con el roadmap de `floating/README.md` para Popover/HoverCard/ContextMenu/Select/Combobox 1.1.0+). El PR de introducción debe:

1. Implementar el componente con la **semántica reservada** documentada en esta decisión (no una variante distinta).
2. Cumplir via tests las características clave de la tabla (anchor positioning para `Popover`, delay para `HoverCard`, etc.).
3. Actualizar este D13 moviendo la fila a "Reservas levantadas" con la versión donde se liberó + link al PR.
4. Quedar incluido en CHANGELOG como `Added` (no `BREAKING` — la reserva blindaba este nombre precisamente para que la adición no rompa nada).

**Cambio de criterio**: si en algún momento se decide que el componente reservado se introducirá bajo una semántica DIFERENTE a la prevista (e.g., `Popover` que NO use anchor positioning), requiere un nuevo doc D-XX que justifique el cambio de criterio + supersede la fila correspondiente de este D13. No es necesario para introducciones que respetan la semántica.

## Referencias

- Cruce A↔B beta.25 §6 punto 10 (`naming reservar Select/Form/Field/...`).
- D7 (`floating-namespace.md`) — namespace interno `src/components/floating/` (no subpath público) donde vivirán `Popover`/`HoverCard`/`ContextMenu`. Sus exports llegan al consumer vía root barrel de `reactigoded`.
- D6 (`dialog-compound.md`) — patrón de compound API que `Form`/`Field` heredarán.
- [[reactigoded-beta26-progress]] — sesión donde se formalizó.
