# D6 — Dialog Full compound refactor (Provider + Content + Trigger)

**Fecha**: 2026-05-17
**Estado**: ✅ **IMPLEMENTADO en beta.24** (gate review claudegate3)
**Origen**: B-06.4 decisión "Dialog open opcional + defaultOpen" + B2-PR2 scope ampliado a Full compound

## Contexto

Pre-D6, `Dialog` era un componente monolítico: `<Dialog open={x} onOpenChange={fn}>` ERA el `<dialog>` HTML nativo con toda la lógica visual/de cierre. Sus children iban DIRECTAMENTE dentro del `<dialog>`.

```tsx
// Pre-D6
<Dialog open={x} onOpenChange={fn}>
  <DialogHeader />
  <DialogBody />
  <DialogFooter />
</Dialog>
```

Limitaciones:
1. **Controlled-only**: el consumer DEBE crear `useState` externo para abrir/cerrar, incluso en casos sencillos.
2. **No hay Trigger DS-native**: el consumer escribe el `<Button>` que abre, sin `aria-haspopup`/`aria-controls`/`aria-expanded` correctos.
3. **DialogClose no conoce el contexto**: requiere `onClick={() => setOpen(false)}` manual del consumer.
4. **Asimetría con el resto del DS**: Tabs, Sidebar, Stepper, Accordion ya tienen patrón compound con Provider.

## Decisión

Refactor a patrón compound canonical Radix-style — `Dialog` se convierte en **Provider** + nuevos `DialogContent` y `DialogTrigger`. Breaking change limpio (no auto-detection mágica), con migration mecánica documentada.

### Arquitectura

```tsx
<Dialog                          // Provider (no DOM)
  open?={x}                      // controlled (opcional)
  defaultOpen?={false}           // uncontrolled inicial
  onOpenChange?={fn}             // observer
>
  <DialogTrigger>Abrir</DialogTrigger>   // <button> con aria-haspopup/-controls/-expanded
  <DialogContent                          // el <dialog> real
    size? backdrop? closeOnBackdrop?
    closeOnEsc? loading?
  >
    <DialogHeader />
    <DialogBody />
    <DialogFooter>
      <DialogClose />               // <button> "×" auto-cierra via contexto
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Modos

| Props pasados al `Dialog` | Modo | Quién maneja state |
|---|---|---|
| `open=X, onOpenChange=fn` | Controlled | Consumer |
| `open=X` (sin callback) | Controlled "presentational" | Consumer (state estático, sin transiciones) |
| `defaultOpen=X` (o nada) | Uncontrolled | Dialog provider interno |
| `defaultOpen=X, onOpenChange=fn` | Uncontrolled + observer | Dialog provider + observer |

`useControllableState` interno con `SUPPRESS_NO_HANDLER_WARN` en modo controlled-presentational (mismo patrón D5 Stepper / Rating readOnly).

### Reparto de responsabilidades

- **`Dialog`** (Provider): wiring de state controlled/uncontrolled. Sin DOM. Solo renderiza el contexto. Acepta `open` / `defaultOpen` / `onOpenChange` + alias deprecated `onClose` (1.x compat).
- **`DialogContent`** (el modal real): heredas todas las props visuales antiguas de `Dialog` — `size`, `backdrop`, `closeOnBackdrop`, `closeOnEsc`, `loading`, `ref`, `className`, `onPointerDown`/`onClick` (chained). Consume `useDialogContextRequired()` para leer `open` y llamar `setOpen(false)` en eventos `close`/`backdrop`/`ESC`. H-02 drag-out parity preservado.
- **`DialogTrigger`** (nuevo): `<button>` plano con `type="button"` + `aria-haspopup="dialog"` + `aria-controls={contentId}` + `aria-expanded={open}`. Llama `setOpen(true)` al click. Chainea consumer `onClick`.
- **`DialogClose`** (actualizado): igual que antes, pero ahora consume `useDialogContextOptional()` para llamar `setOpen(false)`. Si vive fuera de `<Dialog>` sigue siendo un botón válido (solo no cierra nada — responsabilidad del consumer via `onClick`).
- **`DialogHeader/Body/Footer`**: sin cambios.

### Migración consumer

Mecánica simple: **envolver children actuales en `<DialogContent>`**, mover las props visuales a `DialogContent`:

```diff
- <Dialog open={x} onOpenChange={fn} size="md" backdrop="blur">
-   <DialogHeader />
-   <DialogBody>texto</DialogBody>
-   <DialogClose onClick={() => setOpen(false)} />
- </Dialog>
+ <Dialog open={x} onOpenChange={fn}>
+   <DialogContent size="md" backdrop="blur">
+     <DialogHeader />
+     <DialogBody>texto</DialogBody>
+     <DialogClose />   {/* ya no necesita onClick manual */}
+   </DialogContent>
+ </Dialog>
```

Opcional: para casos uncontrolled, eliminar `useState` externo:

```diff
- const [open, setOpen] = useState(false);
- <Button onClick={() => setOpen(true)}>Abrir</Button>
- <Dialog open={open} onOpenChange={setOpen}>
-   <DialogHeader />...
- </Dialog>
+ <Dialog defaultOpen={false}>
+   <DialogTrigger className="ig-btn ig-btn-brand">Abrir</DialogTrigger>
+   <DialogContent>
+     <DialogHeader />...
+   </DialogContent>
+ </Dialog>
```

### `DialogTrigger` styling

`DialogTrigger` es un `<button>` plano para preservar HTML válido (no `<button>` dentro de `<button>` con `<Button>`). Para estilarlo como Button del DS, pasar la clase via `className="ig-btn ig-btn-brand"`. Un patrón `asChild` (Radix-style) que permita pasar un `<Button>` como child se evalúa para 1.1, no para 1.0 — añade complejidad de tipos no justificada en RC1.

Mismo razonamiento para `DialogClose`: cuando el caso de uso es "botón × en el header", el componente solito sirve. Cuando el caso es "Aceptar/Cancelar en el footer", se pueden poner DialogClose con `className="ig-btn ig-btn-brand"` para que se vean como Button.

## Por qué breaking change limpio

Auto-detect (Children.forEach + inspect type) tiene tres problemas:
1. TypeScript no puede enforzar el invariante (children es ReactNode opaco).
2. DialogTrigger en modo legacy haría cosas raras (queda hermano de los Header/Body sin separación lógica).
3. Acumula deuda — el día que se introduzca otro componente compound similar, el patrón "auto-detect children" se replica como cargo cult.

Migration mecánica + documentada en CHANGELOG + decision doc es el approach correcto. Coherente con D7 (Menu Full FUI portal) y D3/D4 (callback renames) que ya fueron breaking pre-RC1.

## Lección material (transferible)

D5 Stepper expuso el patrón `useControllableState` + `silent: true` para sync prop-driven. D6 Dialog usa el mismo hook. Para futuro `AlertDialog` (D8, B2-PR3), heredar la misma arquitectura: Provider + Content + Trigger, `useControllableState` interno, `SUPPRESS_NO_HANDLER_WARN` en controlled-presentational, H-02 drag-out preservado (si AlertDialog reusa native `<dialog>`).

Si el compound necesita sync de `open` por prop externa que cambia (no por interacción), usar `setOpen(next, { silent: true })` desde el Provider — pero por ahora no hay caso en Dialog/D6 que lo requiera (controlled mode delega al consumer; uncontrolled solo cambia por interacción de Trigger/Close/backdrop/ESC).

## Tests añadidos

`Dialog.test.tsx` ahora cubre:

- **DialogContent** (suite existente migrada): size, backdrop, showModal/close sync, backdrop click, H-02 drag-out (5 casos), closeOnEsc, ref, className. **Equivalente 1:1 al coverage pre-D6**.
- **Dialog (Provider compound) — D6** (suite nueva):
  - `defaultOpen=false/true` arranca cerrado/abierto.
  - `DialogTrigger` abre en uncontrolled sin useState consumer.
  - `DialogTrigger` anuncia `aria-haspopup="dialog"` + `aria-controls` + `aria-expanded`.
  - `aria-expanded` refleja open state.
  - `DialogClose` cierra via contexto sin onClick consumer.
  - `DialogTrigger.onClick` consumer con `preventDefault` NO abre.
  - Controlled (`open` + `onOpenChange`) sigue funcionando.
- **Subcomponents** (existentes): DialogClose default + override + `onClick` consumer con `preventDefault` bloquea el cierre (nuevo).

`Dialog.stories.tsx`: 7 stories cubren ambos modos (uncontrolled con Trigger + controlled con prop).

`src/__ssr__.test.tsx`: caso Dialog actualizado al patrón compound. Emite `ig-dialog` (clase base del `<dialog>` SSR-renderizado en estado cerrado).

`src/components/floating/Tooltip/Tooltip.stories.tsx`: story `TooltipDentroDeModal` actualizada — el `ref` del `<dialog>` se forwardea via `DialogContent` (no via `Dialog` Provider).

## Implementación archivo por archivo

- `DialogContext.ts`: extendido — añade `open`, `setOpen`, `contentId`. Exporta `useDialogContextRequired()` para sub-componentes que asumen Provider.
- `Dialog.tsx`: reescrito — solo Provider. `useControllableState` + `SUPPRESS_NO_HANDLER_WARN` + alias `onClose` deprecated con dev-warn.
- `DialogContent.tsx`: NUEVO — todo el `<dialog>` extraído. H-02 drag-out parity preservado.
- `DialogTrigger.tsx`: NUEVO — `<button>` con ARIA disclosure.
- `DialogClose.tsx`: añadido consumo de contexto (auto-close + chain `onClick` consumer).
- `DialogHeader.tsx`: sin cambios funcionales (el contexto extendido sigue exponiendo `headerId`/`setHeaderId`).
- `index.ts`: nuevos exports (`DialogContent`, `DialogTrigger`, `DialogContentProps`, `DialogContentSize`, `DialogContentBackdrop`) + alias backward-compat (`DialogSize` = `DialogContentSize`, `DialogBackdrop` = `DialogContentBackdrop`).

## Out of scope

- `asChild` (Radix-style polymorphism): evaluado para 1.1, no para 1.0. Complejidad de tipos (`Slot`) no justificada en RC1.
- `AlertDialog`: B2-PR3 (D8) sobre esta base. Hereda Provider + Content + Trigger + `role="alertdialog"`.
- Scroll lock del body: el browser ya lo hace con `<dialog>` top-layer; no cambia.
- C-02 (Tooltip dentro de Dialog): el patrón `container={dialogRef.current}` manual queda igual; el ref se forwardea via DialogContent en lugar de Dialog Provider.
