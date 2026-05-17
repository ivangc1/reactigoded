# H-03 — Progress CSP-friendly via CSS custom property

**Fecha**: 2026-05-17
**Estado**: ✅ **IMPLEMENTADO en beta.24** (gate review claudegate3)
**Origen**: gate review beta.24, finding EXC-A2-3

## Contexto

Pre-fix, `Progress.tsx` (línea 130) emitía el porcentaje runtime como propiedad CSS arbitraria en el style attribute:

```tsx
style={indeterminate ? undefined : { width: `${String(percent)}%` }}
```

Resultado en DOM:

```html
<div class="ig-progress-bar" style="width: 42%"></div>
```

Esto rompe CSP estricto sin `'unsafe-inline'` en `style-src`. M-08 (RC1) lo había documentado como excepción legítima, pero la auditoría beta.24 lo re-clasificó como bug que sí tenía mitigación canónica.

## Decisión

Sustituir el style attribute con propiedad arbitraria por un único **CSS custom property** consumido por la regla del stylesheet, **cuantizado al conjunto finito 0%..100% paso 1%**:

```tsx
// Progress.tsx
const percentInt = Math.round((clamped / safeMax) * 100); // 0..100
style={
  indeterminate
    ? undefined
    : ({
        "--ig-progress-percent": `${String(percentInt)}%`,
      } as CSSProperties)
}
```

```css
/* igoded-components.css */
.ig-progress-bar {
  width: var(--ig-progress-percent, 0%);
  /* ... */
}
```

## Por qué es CSP-friendlier

El style attribute deja de contener propiedades visuales arbitrarias. Auditores CSP modernos (CSP Evaluator, Lighthouse) y políticas con `'unsafe-hashes'` pueden tratar `style="--var: value"` distinto a inline rules visuales:

1. **`'unsafe-hashes'` viable**: el conjunto de valores `--ig-progress-percent` emitido es finito y predecible (0% .. 100%, paso entero — el componente cuantiza con `Math.round` antes de emitir). Un CSP puede hashear los 101 valores posibles. Imposible con `width: X%` arbitrario porque (a) el style attribute mezcla propiedad y valor en una única declaración, (b) sin cuantización inputs como `value=1, max=3` producirían `33.33333333333333%`, fuera del conjunto hashable. La cuantización es un invariante que se testea (Progress.test.tsx).
2. **Separation of concerns**: la lógica visual (qué hacer con el porcentaje) vive en stylesheet, NO en el componente. El componente solo pasa datos.
3. **Patrón canónico DS modernos**: Radix UI Progress, Mantine, MUI Joy usan exactamente esto.

## Caveat honesto

Inline custom properties siguen estando dentro del style attribute. Un CSP `style-src 'self'` **sin** `'unsafe-inline'` ni `'unsafe-hashes'` todavía las bloquea — el browser no distingue. Pero la mitigación con `'unsafe-hashes'` o con un build step que sustituya custom properties por clases ahora ES alcanzable, mientras que pre-fix no había salida.

## Indeterminate mode

Sin cambio: cuando `indeterminate`, `Progress.tsx` no emite style attribute. La regla `.ig-progress-indeterminate .ig-progress-bar { width: 30% !important }` toma el control y la transición a animación funciona igual que pre-fix.

## Tests añadidos

`Progress.test.tsx`:

- `emite porcentaje como --ig-progress-percent en bar interno` — assert `toHaveStyle("--ig-progress-percent: 25%")` + regex guard sobre style attribute (no `width:` literal).
- `cuantiza porcentaje fraccional a entero (codex P2 #81)` — input `value=1 max=3` debe emitir `--ig-progress-percent: 33%` (no `33.333…%`). Garantiza el invariante de hashability.
- `indeterminate NO emite --ig-progress-percent inline` — guard que la rama indeterminate no emite style attribute.

## Documentación CSS-only consumer

`docs/CSSAPI.mdx` § Progress y bloque inline en `igoded-components.css` § 81 actualizados para mostrar el patrón canónico (`style="--ig-progress-percent: 70%"`) con nota explicando que `style="width: 70%"` también funciona (specificity del inline style gana al stylesheet) pero NO es CSP-friendly.
