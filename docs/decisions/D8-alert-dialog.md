# D8 — AlertDialog family

**Fecha**: 2026-05-18
**Estado**: ✅ **IMPLEMENTADO en beta.24** (gate review claudegate3)
**Origen**: B-06 + D6 (Dialog compound) closed; AlertDialog hereda la arquitectura

## Contexto

Hasta D8 el DS solo exponía `<Dialog>` con `role="dialog"` automático del `<dialog>` HTML. Para confirmaciones destructivas o acciones que demandan atención consciente, WAI-ARIA APG recomienda `role="alertdialog"` — un modal que:

1. Anuncia mayor urgencia al SR ("alert dialog" se lee distinto de "dialog").
2. NO debe cerrarse por click outside (click outside es un cierre "casual"; un alert requiere acción consciente).
3. Idiomáticamente tiene al menos un botón de confirmación + opcional cancelar.

Pre-D8, el consumer que necesitaba esta semántica debía:
- Pasar `role="alertdialog"` manualmente al `<DialogContent>` (TS no enforza nada).
- Pasar `closeOnBackdrop={false}` manualmente cada vez.
- Recordar la convención de "dos botones explícitos" sin afirmación visual del DS.

## Decisión

Crear una **family AlertDialog** que reusa la infraestructura completa de Dialog (D6) — Provider, Trigger, Header, Body, Footer, Close son **aliases directos** (re-exports renombrados). El único componente con comportamiento propio es `<AlertDialogContent>`.

### Arquitectura

```tsx
<AlertDialog defaultOpen={false}>              // alias de <Dialog>
  <AlertDialogTrigger>Borrar</AlertDialogTrigger>   // alias de <DialogTrigger>
  <AlertDialogContent>                              // wrapper de <DialogContent>
    <AlertDialogHeader>...</AlertDialogHeader>      // alias de <DialogHeader>
    <AlertDialogBody>...</AlertDialogBody>          // alias de <DialogBody>
    <AlertDialogFooter>                             // alias de <DialogFooter>
      <AlertDialogClose>Cancelar</AlertDialogClose> // alias de <DialogClose>
      <AlertDialogClose>Confirmar</AlertDialogClose>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Reparto de responsabilidades

- **`AlertDialog`** (alias de `Dialog`): el Provider con `useControllableState` + state interno + `contentId`. Sin DOM. Mismo wiring controlled/uncontrolled DS-wide.
- **`AlertDialogTrigger`** (alias de `DialogTrigger`): el botón con `aria-haspopup="dialog"` + `aria-controls` + `aria-expanded`. (Nota: el `aria-haspopup` queda como `"dialog"` por simplicidad — WAI-ARIA acepta los valores `"dialog"` y `"alertdialog"`, pero "dialog" es la lectura más universal y los SR mainstream no distinguen.)
- **`AlertDialogContent`** (wrapper de `DialogContent`): aplica:
  1. `role="alertdialog"` (override del `role="dialog"` automático del `<dialog>`).
  2. `closeOnBackdrop={false}` por defecto (override del `true` de DialogContent).
  Acepta exactamente las mismas props que `DialogContent`. El consumer puede sobreescribir cualquiera de las dos defaults (`role="dialog"` o `closeOnBackdrop={true}`) — el wrapper solo cambia el default, no fuerza nada.
- **`AlertDialogHeader/Body/Footer/Close`** (aliases): cero comportamiento propio, mismo DOM y context-handling que sus equivalentes Dialog.

### Razón de aliases (vs wrappers)

| Opción | Pro | Con |
|---|---|---|
| **Aliases (re-exports)** | Zero overhead. Mismo bundle. Cero divergence (impossible drift). | Stack traces muestran el nombre original (`DialogTrigger`, no `AlertDialogTrigger`). |
| Wrappers (`function AlertDialogTrigger(p) { return <DialogTrigger {...p} /> }`) | Stack traces correctos. | Capa innecesaria. Riesgo de drift si Dialog evoluciona. |

Elegidos aliases. Stack traces apuntan al componente real (Dialog*) — lo cual ES informativo (el problema en runtime vive ahí; el AlertDialog* es solo etiqueta semántica del consumer).

### Razón de `closeOnBackdrop={false}` por defecto

WAI-ARIA APG sobre `alertdialog`:
> "An alert dialog is a modal dialog that interrupts the user's workflow to communicate an important message and acquire a response."

Click outside es la forma más "casual" de cerrar un modal — el usuario puede hacerlo sin querer, sin haber considerado la pregunta. Un AlertDialog quiere respuesta consciente. El default refleja esa intención.

ESC sigue `true` por defecto: es un atajo de teclado universal que los SR anuncian como cancelación implícita, y NO contradice el carácter del role (es como pulsar Cancel explícitamente con el teclado).

### Razón de no añadir `aria-describedby` automático

WAI-ARIA APG sugiere `aria-describedby` apuntando al body de un alertdialog para que el SR lea el mensaje completo automáticamente al abrir. Considerado para D8 pero **deferido a una iteración futura**:

- Requeriría extender `DialogContext` con `descriptionId`/`setDescriptionId` (impacto cross-Dialog).
- O crear un `AlertDialogContext` separado (duplicación de state machinery).
- El consumer puede pasar `aria-describedby` manualmente al `<AlertDialogContent>` apuntando a un id del body. Documentado en el JSDoc.

Si futuro user testing con SR real (D-04 está completed pero sin trigger aún) muestra que la lectura del body es deficiente sin describedby auto, esto se reabre.

## Tests

`AlertDialog.test.tsx`: 7 tests específicos de las diferencias D8 (role, closeOnBackdrop default + override) + composición uncontrolled end-to-end. La cobertura completa del compound infrastructure ya está en `Dialog.test.tsx` (no replicamos para evitar drift).

`AlertDialog.stories.tsx`: 2 stories (PorDefecto interactiva + AllStates visual regression con role=alertdialog en el selector).

## Migration consumer

No hay migration — D8 es API nueva pura. Consumers que querían un alert dialog antes pasaban `role="alertdialog"` manualmente a `DialogContent`; pueden migrar a `<AlertDialog>` family para ergonomía + defaults correctos.

## Out of scope

- `aria-describedby` automático (ver arriba).
- `AlertDialogAction` / `AlertDialogCancel` como sub-componentes específicos al estilo Radix UI. Los `<AlertDialogClose>` con `className="ig-btn ig-btn-danger/secondary"` cubren el caso 80/20 sin añadir API surface. Si hay demanda, se reconsidera 1.1.
- `<AlertDialogTrigger>` con `aria-haspopup="alertdialog"` específico. WAI-ARIA acepta el valor, pero los SR mainstream lo leen igual que `"dialog"`. Mantenemos `"dialog"` para evitar divergence con Dialog.
