# C-06 — ToastProvider single-instance + multi-instance workaround

**Fecha**: 2026-05-10
**Estado**: cerrada con docs (no requiere cambio de código)

## Contexto

`docs/RC1_GATE_REVIEW.md § VI` (línea 1362):

> ## C-06 — Single-instance Toast Provider sin documentar comportamiento multi-instance
>
> Position fija al provider. Para errores en bottom-center + notificaciones en top-right, dos providers requeridos. Documentar.

## Comportamiento verificado (2026-05-10)

```
src/components/Toast/ToastProvider.tsx:236  → <ToastContext.Provider value={value}>
src/components/Toast/ToastContext.ts:84-90  → useToast() lee useContext(ToastContext) y throw si null
```

`useToast()` se conecta al **ancestro `<ToastProvider>` más cercano** vía Context. La `position` es prop del provider, no del toast individual — un solo provider sirve una sola posición.

## Decisión

Documentar el patrón **single-instance como recomendado** + **multi-instance como workaround válido pero con limitaciones**.

### Patrón canónico (recomendado): single-instance global

```tsx
function App() {
  return (
    <ToastProvider position="top-right" defaultDuration={5000}>
      <Routes />
    </ToastProvider>
  );
}

function ErrorButton() {
  const { toast } = useToast();
  return <Button onClick={() => toast({ variant: "danger", title: "Error" })}>X</Button>;
}
```

Toda la aplicación comparte una sola cola de toasts en una sola posición. Patrón usado por casi todos los DSs maduros (Mantine, Chakra, Sonner).

### Workaround multi-instance (avanzado)

Para *errores en bottom-center + notificaciones de éxito en top-right*, anidar providers con scopes geográficos distintos:

```tsx
function App() {
  return (
    <ToastProvider position="top-right">          {/* Notifications scope */}
      <Routes>
        <Route path="/critical-flow" element={
          <ToastProvider position="bottom-center"> {/* Errors scope sobreescribe */}
            <CriticalFlow />
          </ToastProvider>
        } />
      </Routes>
    </ToastProvider>
  );
}
```

Limitaciones:
- **Solo el provider más cercano gana**: dentro de `<CriticalFlow>`, `useToast()` siempre usa el provider de `bottom-center`. No puede emitir simultáneamente al de `top-right` desde el mismo árbol.
- **Sin separación lógica por tipo**: si en `<CriticalFlow>` quieres mezclar errores (bottom-center) y notificaciones (top-right), necesitas refactorizar el árbol.

### Patrón futuro (no en RC1, considerado para 1.1.0+)

API alternativa con scope nombrado:

```tsx
<ToastProvider position="top-right" scope="notifications">
  <ToastProvider position="bottom-center" scope="errors">
    <App />
  </ToastProvider>
</ToastProvider>

// Consumer opta por scope:
const { toast } = useToast({ scope: "errors" });
toast({ variant: "danger", title: "Falló" });

const { toast: notify } = useToast({ scope: "notifications" });
notify({ variant: "success", title: "Guardado" });
```

Requiere cambios en API pública de `ToastContext` + `useToast`. **Diferido a 1.1.0+** si emerge demanda real (no observada en feedback hasta 2026-05-10).

## Acción ejecutada

Añadir sección "Multi-instance" al JSDoc de `ToastProvider.tsx` con el patrón anidado documentado y sus limitaciones (commit separado).

## Reapertura

Reabrir si:
- Múltiples consumers reportan querer mezclar tipos en mismo árbol — entonces evaluar la API `scope` para 1.1.0+.
- Aparece patrón de uso real que el workaround anidado no cubra.
