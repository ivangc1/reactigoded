# Igoded DS — reglas inviolables

Documento de invariantes del design system. Validadas en CI por
`scripts/check-component-contrast.mjs` y por el runner storybook+axe.
Si vas a tocar paleta, tokens o estilos de componentes, lee esto antes.

## Geometría de la paleta dual

Cada cardinal tiene exactamente dos hex, `--ig-{cardinal}-{lux|nox}`,
con esta restricción matemática:

- ΔH OKLCH ≤ 10° entre lux y nox (mismo hue por cardinal)
- L_lux ≈ 0.32 ± 0.04
- L_nox ≈ 0.84 ± 0.04
- L_lux + L_nox ≈ 1.16 ± 0.08

Cardinales:

| Cardinal  | H     | Rol               |
|-----------|-------|-------------------|
| vitreus   | 195°  | brand (teal)      |
| axis      | 300°  | secondary (violeta) |
| cinis     | 267°  | text-body (gris azulado) |
| rutilus   | 55°   | warning (cobre)   |
| laurus    | 149°  | success (verde)   |
| malum     | 8°    | danger (rojo-granate) |
| cyaneus   | 214°  | info (cyan)       |

Cualquier cambio que rompa esta geometría falla `npm run test:contrast`.
**No es decorativo: la simetría OKLCH es lo que garantiza WCAG AA en
todas las combinaciones bg/cardinal del tema.**

## Uso en componentes

- Background cardinal: `background: var(--ig-{cardinal})` o el alias
  semántico (`--ig-brand`, etc.).
- Texto sobre fondo cardinal: SIEMPRE
  `color: var(--ig-text-on-{cardinal})` o `--ig-text-on-{role}`.
- **PROHIBIDO**: `color: var(--ig-fundus-lux)` o `--ig-fundus-nox`
  hardcoded sobre un fondo cardinal adaptativo. Romperá contraste en
  uno de los temas.
- `npm run test:contrast` valida en CI.

## Tres tiers de tokens

- **Tier 1 — Primitivos**: `--ig-{cardinal}-{lux|nox}`,
  `--ig-fundus-{lux|nox}`. Detalles de implementación de la paleta dual.
  No usar directamente en componentes.
- **Tier 2 — Semánticos**: `--ig-{cardinal}`, `--ig-{role}`,
  `--ig-text-on-*`, `--ig-bg-*`, `--ig-text-*`, `--ig-border-*`.
  Lo que usan los componentes.
- **Tier 3 — Escalas**: `--ig-neutral-{50..950}` (universal, no
  adaptativa), `--ig-{cardinal}-alpha-*`. Para uso ad-hoc.

## Separación info / secondary

`info` apunta a `cyaneus` (cyan H=214°), **no a `axis` (violeta H=300°)**.
Decisión deliberada desde 1.0.0-beta.3 para diferenciar visualmente
"información" de "acción secundaria". No volver a unificar.

## Escala neutral

`--ig-neutral-{50..950}` es **universal**: los mismos hex en dark y
light. Si necesitas un gris que cambie con el tema, usa
`--ig-text-body`, `--ig-bg-muted` o `--ig-border-subtle`.

## Backgrounds derivados de fundus

Los `--ig-bg-{surface,sunken,elevated,muted}` se generan vía
`color-mix(in oklch, var(--ig-fundus-{lux|nox}), …)`. Si cambias
`--ig-fundus-{lux|nox}`, todo el tema acompaña automáticamente. No los
declares con hex literales.

## Reset CSS

`igoded-reset.css` es opt-in. Resetea HTML nativo (`button`, `input`,
`a`, `h1-h6`, `p`, `table`, etc.) a estilos neutros — el reset NO debe
forzar colores cardinales sobre `<button>` ni similares; cualquier
colorido lo aplican las clases `ig-btn-*`, `ig-sidebar-item`, etc.

## CI / verify

`npm run verify` ejecuta en orden:

1. `lint` (ESLint con jsx-a11y)
2. `typecheck`
3. `test:unit` (vitest happy-dom)
4. `test:contrast` (script CSS)
5. `build`
6. `test:storybook` (vitest + chromium + axe-core)
7. `verify:size` (size-limit)

Cada uno es un guardrail diferente. Romper cualquiera bloquea publish.
