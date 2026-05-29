# D14 — Slot pattern DS-wide (asChild en Trigger/Close de 4 familias)

**Fecha**: 2026-05-28
**Estado**: ✅ **IMPLEMENTADO** — Bloques A/B/C/D mergeados (PRs #110-#113), taggeado y publicado en `1.0.0-beta.26`. `asChild` en 4 familias (Dialog/AlertDialog/Tooltip/Menu); `DialogAction` eliminado; primitive `<Slot>` interno en `src/components/Slot/`.
**Origen**:
- M-01 (post-RC1, beta.20) deferred Slot pattern DS-wide a 2.0.
- Cruce reviews beta.25 (Opus 4.7 generic, 2026-05-27): cuantificó ~1800–2700 LOC evitables + asimetría léxica `DialogClose styled / DialogAction unstyled / AlertDialogClose clone` como deuda heredada permanente del 1.x si M-01 no se revierte.
- Decisión Iván (2026-05-27): vanguardia a tope. Slot DS-wide entra en 1.0 (beta.27), no en 2.0. M-01 deprecada con superseded-by → D14.

## Decisión

Adoptar **Slot pattern via `asChild` prop** en los componentes Trigger / Close / Action de las 4 familias del DS que existen hoy con triggers:

1. **Dialog**: `DialogTrigger`, `DialogClose`, `DialogAction` (este último eliminado).
2. **AlertDialog**: `AlertDialogTrigger`, `AlertDialogClose`.
3. **Tooltip** (`floating/Tooltip/`): ya usa Slot-style (D-01) pero NO propaga props del outer Slot a su child. Bloque C es **refactor interno** para que Tooltip use el `<Slot>` primitive del Bloque A internamente — necesario para que el nested asChild case del edge #6 funcione.
4. **Menu** (`floating/Menu/`): `MenuTrigger`. Idéntica forma.

Las 13 familias futuras del roadmap floating (Popover, HoverCard, ContextMenu, Submenu, MenuBar, Combobox/Select, DatePicker, TimePicker, ColorPicker, etc. — ver `src/components/floating/README.md`) **NO se hacen ahora**. Se diseñan ya nativas con Slot cuando se añadan post-rc.1 / 1.x.

Se introduce un primitive `<Slot>` hand-rolled en `src/components/Slot/` (~200 LOC + tests). NO se adopta `@radix-ui/react-slot` como peer dep — la razón principal es que dejaría el código fuera de la cobertura del server-safe gate (PR #106, import-following AST), que corta en peer specifiers. Mantener hand-rolled = mantener el gate cubriendo todo lo que importa, alineado con la filosofía DS hand-rolled total.

## Plan de bloques (PR por bloque)

```
beta.27.0
  Bloque A → PR-A: <Slot> primitive standalone + tests
              (NO toca ningún componente; si está mal, se arregla
               antes de propagar el bug a 4 familias)
  Bloque B → PR-B: Dialog + AlertDialog migration
              (cierra la asimetría léxica más visible del DS;
               BREAKING: elimina DialogAction)
  Bloque C → PR-C: Tooltip refactor — usar <Slot> internamente
              (corregido tras codex P2 round 2: NO es solo audit/verify;
               es refactor real. Razón: Tooltip actual NO propaga props
               del outer Slot a su child, así que el nested asChild
               case [edge #6] no funciona hasta que Tooltip use <Slot>
               internamente con `...rest` forwarding.)
  Bloque D → PR-D: Menu MenuTrigger migration

beta.27.1 — release con Slot DS-wide cerrado
1.0.0-rc.1 — siguiente release, beta.27 estable

Nota sobre el orden: B antes que C porque B aporta más valor visible
(cierra la asimetría léxica). Entre el merge de B y el merge de C,
el nested asChild case (edge #6) queda con known-limitation. Los 4
bloques deben ir todos en la misma beta release (beta.27.1) para que
el consumer no vea un estado intermedio donde nested falla silencioso.
```

Cada bloque tiene su PR independiente para que `git bisect` siga funcionando si una regresión emerge en el camino.

## Patrón Slot — diseño del primitive

### Forma del API

```tsx
// Internal — exportado solo a otros componentes del DS.
export interface SlotProps {
  /** Single React element to clone with the props of Slot. */
  children: React.ReactNode;
  /** Props que se mergean con los del child cloned. */
  [key: string]: unknown;
}

export function Slot(props: SlotProps): React.ReactElement;
```

Vocabulario (importante para evitar la confusión que Codex P2 round 1 cazó):
- **"props del parent"** = props pasados A Slot por el componente library (e.g., `DialogClose` pasa `onClick={closeHandler}` a `<Slot>` para cerrar el dialog al click). NO son props del consumer.
- **"props del child"** = props que el child element del consumer ya tiene (e.g., `<Button onClick={consumerHandler}>` que el consumer escribió dentro del `<DialogClose asChild>`).

Comportamiento:
- Recibe **exactamente UN child React element**.
- Mergea props del parent Slot + props del child con estas reglas:
  - **`className`**: `cn(parentClassName, childClassName)` — parent primero, child appended. Consumer's classes pueden override las del library porque se aplican después en el cascade CSS.
  - **`style`**: merge shallow con child wins en colisiones (`{...parentStyle, ...childStyle}`). Consumer's inline style override defaults del library.
  - **`ref`**: `composeRefs(parentRef, childRef)` — ambos refs reciben el DOM node, ninguno se pierde.
  - **Event handlers** (`onClick`, `onPointerDown`, etc.): chained, **child handler primero** (consumer's). Library's handler corre **solo si** consumer no llamó `e.preventDefault()`. Ver edge case #4 para el rationale completo — patrón canónico Radix `composeEventHandlers(child, parent)`.
  - **Resto de props** (aria-*, data-*, role, etc.): parent provee defaults, child override (consumer's value gana si está set).

### Edge case contract (explícito antes de implementar)

Estos son los casos que doblan el coste si se descubren a mitad de implementación. Se documentan AHORA para que Codex los revise en este plan:

#### 1. `React.Fragment` como child

```tsx
<DialogClose asChild>
  <>
    <Button>X</Button>
  </>
</DialogClose>
```

**Decisión**: **error en dev** con mensaje claro:

```
[reactigoded] Slot received a React.Fragment as its child. Slot
needs a single concrete element (e.g., <Button>, <a>, <button>).
Replace <>...</> with a single element wrapper.
```

En prod, el mensaje no se emite (DCE via `import.meta.env.DEV`). El Fragment se ignora silenciosamente — Slot devuelve `null`. Rationale: error temprano > magia de "auto-unwrap Fragment a su único child" que crea ambigüedad cuando el Fragment tiene 0 ó 2+ children.

Mismo patrón que Radix Slot.

#### 2. Múltiples children

```tsx
<DialogClose asChild>
  <a>Link 1</a>
  <a>Link 2</a>
</DialogClose>
```

**Decisión**: **error en dev** con mensaje claro:

```
[reactigoded] Slot expects exactly 1 child element; received 2.
Wrap multiple children in a single parent element (e.g., <div>).
```

En prod, Slot toma el primer child y descarta el resto. Rationale: visibilidad del bug en dev sin crashear la app en prod si un consumer lanza una regresión.

#### 3. Child con `ref` propio

```tsx
const myRef = useRef<HTMLButtonElement>(null);
<DialogClose asChild>
  <Button ref={myRef}>Aceptar</Button>
</DialogClose>
```

**Decisión**: **composeRefs**. El DOM node se asigna tanto al `myRef` del consumer como a cualquier ref interno que Slot necesite (FUI anchor, focus management, etc.). Implementación canónica:

```tsx
function composeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref != null) (ref as React.MutableRefObject<T | null>).current = node;
    }
  };
}
```

React 19 simplifica: `ref` es prop normal (no `forwardRef`), composeRefs trabaja igual.

#### 4. Event chain order (`onClick` consumer + handler interno)

```tsx
<DialogClose asChild>
  <Button onClick={() => console.log("consumer first")}>
    Aceptar
  </Button>
</DialogClose>
```

**Decisión**: **consumer first**, library second. Si consumer llama `e.preventDefault()`, library handler NO corre.

Orden exacto:
1. Consumer's `onClick` ejecuta.
2. Library check `e.defaultPrevented` (sí o no).
3. Library's `onClick` corre solo si no fue prevented.

Razón: respeta la intención del consumer. Si quiere abortar el cierre del dialog (e.g., validar form antes de cerrar), `e.preventDefault()` en su handler funciona.

Coincide con el patrón ya implementado en `DialogClose.tsx` actual (pre-Slot).

#### 5. `asChild={false}` o ausente

```tsx
<DialogClose>Aceptar</DialogClose>
```

**Decisión**: **renderiza el wrapper default** del componente, NO activa Slot machinery. El `children` prop pasa como contenido del default element.

Para `DialogClose` (no-asChild):
```html
<button class="ig-dialog-close" aria-label="Cerrar" onClick=...>
  Aceptar
</button>
```

Para `DialogTrigger` (no-asChild):
```html
<button onClick=...>
  Aceptar
</button>
```

Es decir, comportamiento idéntico al actual de los componentes pre-D14. Backwards-compatible para uso sin `asChild`.

#### 6. asChild anidado

```tsx
<DialogClose asChild>
  <Tooltip text="Cancela y cierra">
    <Button variant="danger">X</Button>
  </Tooltip>
</DialogClose>
```

**Decisión**: **compose-friendly**, PERO requiere Bloque C completado.

Codex P2 round 2 cazó (correctamente) que la `Tooltip` actual NO propaga props del outer Slot a su child. Su `TooltipProps` solo acepta campos propios sin `...rest`, y su `cloneProps` solo inyecta FUI handlers (hover/focus) + ref + `aria-describedby`. Si un outer Slot clona `<Tooltip>` con `onClick={closeHandler}` + `ref={...}`, Tooltip los DROPEA — el close handler nunca llega al `<Button>` final.

**Por tanto, este patrón está soportado SOLO después de Bloque C** (que refactoriza Tooltip para usar el `<Slot>` primitive internamente y propagar props del outer slot transparentemente). Bloque C deja de ser "audit / verify" y pasa a ser refactor real.

Implementación del fix en Bloque C:
1. `TooltipProps` añade `...rest` (heredando `HTMLAttributes<HTMLElement>` o similar) para aceptar arbitrary props del outer Slot.
2. Internamente, el `cloneElement(children, cloneProps)` se reemplaza por `<Slot {...rest} {...cloneProps}>{children}</Slot>` (o equivalente vía utility), de modo que las reglas de composition del primitive (composeRefs, event chain consumer-first, className/style merge) aplican uniformemente.
3. La cadena resultante: outer Slot clona Tooltip con close handler → Tooltip's inner Slot mergea close handler + FUI handlers → Button final recibe ambos chained con preventDefault honored en cada salto.

**Hasta Bloque C merge**: este patrón nested NO funciona. Bloques A + B publicados solos (sin C) tienen este known-limitation. Para evitarlo, los 4 bloques se mergean dentro de la misma beta release (beta.27.1) — el consumer nunca ve un estado intermedio donde el nested case falle silenciosamente.

#### 7. Props del componente padre que deben llegar al child (aria/data)

Cuando un Trigger / Close hace `asChild`, el child element debe heredar **automáticamente**:
- `aria-haspopup`, `aria-expanded`, `aria-controls` (Trigger).
- `data-state="open"|"closed"` (Trigger).
- `aria-label="Cerrar"` (Close, si el child no lo override).

Estos se pasan a Slot como props normales y se mergean en el cloneElement.

#### 8. Imposible cubrir hoy (documentar como hueco conocido)

- **Polymorphic-as via `as` prop** (`<DialogTrigger as="a" href="...">`): explícitamente fuera de scope. Sigue M-01 deferred. `asChild` cubre el 80% de casos; el otro 20% se diseña en 1.x post-rc.1 si la demanda lo justifica.
- **Slot.Slottable** (slot-within-slot composer): no necesario para las 4 familias actuales. Diferido a cuando aparezca el caso.

## API change matrix (BREAKING para 1.0)

| Componente | Pre-D14 | Post-D14 (beta.27) |
|---|---|---|
| `<DialogClose>X</DialogClose>` | Renderiza `<button class="ig-dialog-close">X</button>` (X icon) | Idéntico. Backwards-compat. |
| `<DialogClose asChild><Button>X</Button></DialogClose>` | N/A | **NUEVO**. Renderiza el Button del consumer con close semantics. |
| `<DialogAction>X</DialogAction>` | Renderiza `<button>X</button>` unstyled. | **ELIMINADO**. Migration: `<DialogClose asChild><Button>X</Button></DialogClose>`. |
| `<DialogTrigger>Open</DialogTrigger>` | Renderiza `<button>Open</button>`. | Idéntico. Backwards-compat. |
| `<DialogTrigger asChild><Button>Open</Button></DialogTrigger>` | N/A | **NUEVO**. Renderiza el Button del consumer con trigger semantics. |
| `<AlertDialogClose>X</AlertDialogClose>` | Renderiza `<button>X</button>` unstyled. | **CAMBIO**: ahora renderiza `<button class="ig-dialog-close">X</button>` (styled como header X, coherente con DialogClose). Para usar como CTA del footer: `<AlertDialogClose asChild><Button variant="danger">X</Button></AlertDialogClose>`. |
| `<AlertDialogTrigger>` | Existe vía alias `DialogTrigger`. | Sigue como alias (no se duplica componente). asChild funciona vía DialogTrigger. |
| `<Tooltip>` | Slot-style D-01 (children: ReactElement). `TooltipProps` no acepta `...rest` → outer Slot props se pierden. | **Refactor interno (bloque C)**: usar `<Slot>` primitive del bloque A internamente + aceptar `...rest` props. API público preservado (`text`, `placement`, `variant`, `children`, delays). El cambio habilita el nested asChild case (edge #6). |
| `<MenuTrigger>` | Renderiza wrapper button. | Análogo a DialogTrigger: añade `asChild` para hacer Slot del child del consumer. |

### Migration table para CHANGELOG (1.0.0-beta.27)

```markdown
## [1.0.0-beta.27] - 2026-XX-XX

### BREAKING

- **Slot pattern DS-wide**: `DialogTrigger`, `DialogClose`, `AlertDialogClose`,
  `MenuTrigger` ahora aceptan `asChild` prop para componer con el elemento
  del consumer. Patrón coherente con Radix/shadcn. Ver D14.
- **`DialogAction` eliminado**. Migration:
  ```diff
  <DialogFooter>
  -  <DialogAction className="ig-btn ig-btn-brand">Aceptar</DialogAction>
  +  <DialogClose asChild>
  +    <Button variant="brand">Aceptar</Button>
  +  </DialogClose>
  </DialogFooter>
  ```
- **`AlertDialogClose` cambia render default**: antes unstyled `<button>`,
  ahora styled como `DialogClose` (icon X). Para CTAs del footer usar
  asChild:
  ```diff
  <AlertDialogFooter>
  -  <AlertDialogClose className="ig-btn ig-btn-danger">Borrar</AlertDialogClose>
  +  <AlertDialogClose asChild>
  +    <Button variant="danger">Borrar</Button>
  +  </AlertDialogClose>
  </AlertDialogFooter>
  ```

### Added

- `<Slot>` primitive interno (no exportado al consumer). Power de los
  `asChild` props del DS.
- `composeRefs` utility (interno).
```

## Risk matrix

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| `composeRefs` bug en edge case (function ref + object ref combinados) | Baja-Media | Alto (rompe ref forwarding en muchos componentes) | Bloque A es PR independiente con coverage ≥95% líneas y fixtures explícitos para cada combo ref. Codex revisa el primitive aislado antes de propagar a 4 familias. |
| Event chain priorización wrong (library first en lugar de consumer first) | Baja | Alto (rompe consumer escape hatches via preventDefault) | Tests explícitos en bloque A para esta semántica. |
| Tooltip refactor en Bloque C rompe consumer existente (D-01 already shipped) | Media | Medio | Bloque C debe preservar el API publico (children como ReactElement, semantica D-01) — el cambio es interno (uso de <Slot> en lugar de cloneElement raw + aceptar ...rest props para forwarding). Tests existentes de Tooltip deben pasar sin modificación. Si rompen, el refactor diverge del API y hay que rediseñar. |
| Tooltip D-01 diverge del primitive nuevo en sutilezas (Fragment handling, error messages) | Media | Bajo | Bloque C alinea D-01 con el primitive. Si la divergencia es solo ergonómica (mensajes de error distintos) y la semántica es la misma, dejamos D-01 quieto. |
| Consumer hace `<DialogClose asChild>{condition && <Button/>}</DialogClose>` (children dinámicos null) | Media | Bajo | Detect `null` / `false` children → emit dev warn, render nothing. NO crashea. |
| Storybook stories pre-D14 rompen al migrar (porque usan `DialogAction` que se elimina) | Alta | Bajo | Bloque B incluye update de stories + test:storybook. CI lo caza. |
| Consumer-pack gate falla en bloque B (porque consumer-types fixture importa DialogClose con shape vieja) | Media | Bajo | Bloque B también actualiza `fixtures/consumer-pack/app.tsx` + `fixtures/consumer-types*/app.tsx` para reflejar la nueva API. |

## Test strategy

### Bloque A (primitive)

- 1 file: `src/components/Slot/Slot.test.tsx` con vitest.
- Cubrir cada edge case del contrato (Fragment, multiple children, ref merge, event chain, asChild=false equivalente, nested asChild).
- Cobertura objetivo: ≥95% líneas.
- Storybook story: NO (es internal, no consumer-facing).

### Bloque B (Dialog + AlertDialog)

- Update `Dialog.test.tsx`, `AlertDialog.test.tsx`, `DialogClose.test.tsx`, `AlertDialogClose.test.tsx`.
- Tests para: default render, asChild render, asChild + ref consumer, asChild + onClick chain.
- Update Storybook stories `Dialog.stories.tsx`, `AlertDialog.stories.tsx`.
- Update fixture consumers (consumer-types, consumer-types-nodenext, consumer-pack) con la nueva API.
- Update Migration guide en CHANGELOG.

### Bloque C (Tooltip refactor)

(Scope corregido tras codex P2 round 2: NO es solo audit/verify.)

- Refactor interno de Tooltip: `cloneElement(children, cloneProps)` → `<Slot {...rest} {...cloneProps}>{children}</Slot>`.
- `TooltipProps` añade aceptar `...rest` (cualquier prop del outer Slot debe pasar al Button final).
- API público se preserva: `text`, `placement`, `variant`, `children` (ReactElement), `openDelay`, `closeDelay` siguen igual. Lo que cambia es que ahora Tooltip ALSO acepta cualquier otro prop y lo forwardea — convirtiendo Tooltip en una capa transparente para Slot composition.
- Tests existentes de Tooltip deben pasar sin modificación (gate de no-regression).
- Test nuevo: `<DialogClose asChild><Tooltip text="x"><Button onClick={consumerHandler}/></Tooltip></DialogClose>` — click en Button debe invocar consumerHandler primero, luego cerrar el dialog, con preventDefault honorando ambos.
- Update Storybook story de Tooltip con un ejemplo del nested case (opt-in showcase de la composability).

### Bloque D (Menu)

- Análogo a bloque B sobre MenuTrigger.

### Cross-cutting

- `verify:unit` (931+ tests existentes + nuevos) → EXIT 0.
- `test:consumer-pack` → EXIT 0 (gate de PR #108 caza regresiones de tipos en la API consumer).
- `test:server-safe-markers` → EXIT 0 (gate de PR #106 caza si Slot accede a globals).
- Codex review por bloque, mismo workflow que beta.26.

## Cumplimiento con D7 (floating namespace)

Las 4 familias afectadas en bloque B/C/D viven en:
- `src/components/Dialog/` (NO floating).
- `src/components/AlertDialog/` (NO floating).
- `src/components/floating/Tooltip/`.
- `src/components/floating/Menu/`.

El primitive `<Slot>` va en `src/components/Slot/` (top-level, no floating). Es utility cross-family, no es FUI. Coherente con D7 (floating es solo para componentes que USAN FUI primitives — Slot no usa FUI).

## Plan de salida si algo va mal

Si en bloque A o B Codex caza un agujero arquitectónico imposible de cerrar sin rediseñar, **el plan tiene punto de salida**:

1. Cerrar el PR de bloque A/B sin merge.
2. Revertir a M-01 (Slot diferido a 2.0).
3. Cerrar rc.1 con la asimetría léxica heredada — el coste de mantenerlo durante 1.x es alto pero no bloqueante.

El checkpoint barato es ESTE PR (plan-only doc). Si Codex caza un problema fundamental en el plan, no hemos invertido tiempo en código.

## Referencias

- M-01 (`docs/decisions/M-01-polymorphic-as.md`): decisión original de deferir Slot a 2.0. **Superseded by D14**.
- D-01 (`docs/decisions/D-01-tooltip-slot-refactor.md`): precedente Slot en Tooltip.
- D7 (`docs/decisions/D7-floating-namespace.md`): organización del namespace floating.
- D13 (`docs/decisions/D13-name-reservations-pre-rc1.md`): reservas de nombres pre-rc.1.
- Cruce A↔B beta.25 (Opus 4.7 generic, 2026-05-27): cuantificación del coste evitable de M-01.
- PR #106 (server-safe gate import-following): por qué hand-rolled vs `@radix-ui/react-slot` peer dep.
- [[reactigoded-beta26-progress]]: sesión donde se formalizó.
