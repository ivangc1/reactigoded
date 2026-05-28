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

| Cardinal  | H      | Rol               |
|-----------|--------|-------------------|
| vitreus   | 207.5° | brand (teal-cyan, centro perceptual verde↔azul OKLCH/Hering) |
| axis      | 300°   | secondary (violeta) |
| cinis     | 267°   | text-body (gris azulado) |
| rutilus   | 55°    | warning (cobre)   |
| laurus    | 140°   | success (verde)   |
| malum     | 8°     | danger (rojo-granate) |
| kobalium  | 260°   | info (cobalt blue) |

**Nota sobre vitreus H=207.5°**: es el punto medio matemático entre verde
Hering (~145°) y azul Hering (~270°), los hues *opponent-color* sobre los
que se construye el espacio OKLCH. Hasta `1.0.0-beta.15` vitreus estaba
en H≈194.83° (cyan puro sRGB, artefacto de la paleta de partida); en
`beta.16` se recolocó al centro perceptual prometido por la identidad
del DS. El hex pasó de `#033b3b`/`#30e6e6` a `#053a40`/`#3ae2f7`.

Cualquier cambio que rompa esta geometría falla `npm run test:contrast`.
**No es decorativo: la simetría OKLCH es lo que garantiza WCAG AA en
todas las combinaciones bg/cardinal del tema.**

## Watchlist — pares con ΔE OKLab marginal

`Check 3` de `scripts/check-component-contrast.mjs` valida la separación
perceptual ΔE OKLab entre los cardinales de UI activa (excluye `cinis`,
que es texto). Política desde `1.0.0-beta.19`, **threshold endurecido en
beta.27 (#154)** subiendo `error_threshold` 0.05 → 0.07 para blindar el
invariante sin recalibrar tokens (allowlist v2):

- **ERROR** si `ΔE < 0.07` y el par no está en `scripts/perceptual-allowlist.json`.
- **ERROR** si un par allowlisted ha derivado más del 5% por debajo de
  su `deltaE_at_decision` registrado (drift detection).
- **WARN** si `ΔE < 0.10` (par cercano pero aceptable; revisar al
  planificar futuras paletas).
- Pares allowlisted con su valor de decisión vigente: `WARN` informativo.

Para regenerar la tabla: `node scripts/check-component-contrast.mjs --print-perceptual-table`.

### LIGHT (suffix -lux)

| Par | ΔE | Estado |
|-----|-------|--------|
| laurus-vitreus    | 0.0847 | allowlisted (ref=0.0847, eje fresco) |
| malum-rutilus     | 0.0943 | allowlisted (ref=0.0943, gradient utility opt-in `.ig-gradient-warning-danger`) |
| axis-kobalium     | 0.0951 | allowlisted (ref=0.0951, no usado adyacente) |
| kobalium-vitreus  | 0.0962 | allowlisted (ref=0.0962, no usado adyacente) |
| laurus-rutilus    | 0.1085 | ok |
| rutilus-vitreus   | 0.1176 | ok |
| axis-malum        | 0.1531 | ok |
| axis-vitreus      | 0.1602 | ok |
| malum-vitreus     | 0.1751 | ok |
| kobalium-laurus   | 0.1809 | ok |
| kobalium-rutilus  | 0.1829 | ok |
| axis-rutilus      | 0.1892 | ok |
| kobalium-malum    | 0.1953 | ok |
| laurus-malum      | 0.1979 | ok |
| axis-laurus       | 0.2356 | ok |

### DARK (suffix -nox)

| Par | ΔE | Estado |
|-----|-------|--------|
| axis-kobalium     | 0.0522 | allowlisted (ref=0.0522, ratificado #154 beta.27 vía error_threshold=0.07) |
| malum-rutilus     | 0.0706 | allowlisted (ref=0.0706, danger vs warning cálidos) |
| axis-malum        | 0.0929 | bajo warn=0.10 |
| kobalium-vitreus  | 0.1058 | ok |
| kobalium-malum    | 0.1257 | ok |
| axis-rutilus      | 0.1402 | ok |
| kobalium-rutilus  | 0.1504 | ok |
| axis-vitreus      | 0.1580 | ok |
| rutilus-vitreus   | 0.2136 | ok |
| malum-vitreus     | 0.2174 | ok |
| laurus-vitreus    | 0.2184 | ok |
| laurus-rutilus    | 0.2391 | ok |
| kobalium-laurus   | 0.2705 | ok |
| laurus-malum      | 0.2973 | ok |
| axis-laurus       | 0.3070 | ok |

### Notas y decisiones

- `laurus ↔ vitreus` LIGHT (0.0847): par cromáticamente vecino en el eje
  fresco verde-cyan. Decisión consciente desde `1.0.0-beta.8`
  (recalibración de `laurus` H=149° → H≈140°), confirmada tras la
  recolocación de `vitreus` a H=207.5° en `1.0.0-beta.16`. La confusión
  perceptual se resuelve con iconografía en componentes (Badge con
  icono, Alert con icono), no moviendo más hex. **Allowlisted**.
- `malum ↔ rutilus` DARK (0.0706): par cálido danger vs warning. Allowlisted
  como decisión consciente; recalibrar bajaría WCAG sobre `fundus`.
- `axis ↔ kobalium` DARK (0.0522): par UI más estrecho del sistema.
  Decisión de beta.18 (c8a5202) lo dejó fuera de allowlist con la
  intención de que un drift a la baja rompiese CI, pero `error_threshold`
  (0.05) estaba por debajo de 0.0522 — la decisión no era operativa.
  **Beta.27 (#154) ratificó** la cercanía como excepción consciente
  vía allowlist explícita + subió `error_threshold` a 0.07. El drift
  gate (5% por debajo de 0.0522) sigue activo; cualquier par nuevo o
  degradación adicional bajo 0.07 sin entrada explícita en allowlist
  rompe CI. Justificación completa y 3 triggers de reapertura en la
  entry del JSON + tracking en `docs/POST_RC1_BACKLOG.md`. **Allowlisted**.

## Cinis es un cardinal especial

- **No tiene alias de rol semántico** (a diferencia de los otros 6:
  vitreus→brand, axis→secondary, laurus→success, rutilus→warning,
  malum→danger, kobalium→info).
- **Solo se usa como `--ig-text-body`**, nunca como background de
  componente. No existe `--ig-bg-cinis` ni `.ig-bg-cinis` ni utility
  alguna que lo aplique como fondo.
- **Está incluido en Check 2** (geometría dual lux/nox) porque mantiene
  la simetría OKLCH del sistema, pero **NO está en Check 3** (ΔE
  perceptual entre cardinales UI), porque su separación con otros
  cardinales no afecta a la UI: nunca aparece como fondo contiguo a
  otro cardinal.
- Se mantiene como **cardinal** y no se degrada a primitivo de texto
  plano (`--ig-text-body: #c4cada`) porque su tinte azulado (H≈267°,
  croma bajo) aporta personalidad al texto del cuerpo del DS,
  diferenciándolo de los grises neutros de Tailwind/Material/etc. La
  asimetría es **decisión deliberada documentada**, no olvido.

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

`info` apunta a `kobalium` (cobalt blue H≈260°), **no a `axis` (violeta H=300°)**.
Decisión deliberada desde 1.0.0-beta.3 para diferenciar visualmente
"información" de "acción secundaria"; en `1.0.0-beta.7` se renombró desde
`cyaneus` y se reasignó el hue (de H≈214° cyan a H≈260° cobalt blue)
porque la separación perceptual ΔE OKLab vs `vitreus` era marginal
(0.054). No volver a unificar.

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

### Scope real de `test:contrast`

`scripts/check-component-contrast.mjs` parsea `igoded-components.css` con
postcss y evalúa cada regla que declara `color` y `background[-color]` **en
el mismo bloque**. **Cubre**:

- Pares `color` + `background[-color]` con valores resolubles a sRGB
  (token `var(--ig-*)` mapeado a su hex en ambos temas, o hex literal).
- Variantes `:hover`/`:focus`/`:disabled`/`:active` cuando declaran el par
  bg/color completo.
- Geometría OKLCH dual de los 7 cardinales (`L_lux ≈ 0.32 ± 0.04`,
  `L_nox ≈ 0.84 ± 0.04`, `ΔH ≤ 10°` lux/nox).

**NO cubre** (puntos ciegos conocidos — para esto está el runner
`test:storybook` que evalúa DOM real con axe-core):

- **Alphas/tinted/transparent** sin contexto: `color-mix(... transparent)`,
  `color-mix(... 30%)`, `rgba(... .5)` resuelven a un alpha que el script
  no compone contra el fondo del padre. Ejemplo: `.ig-bg-vitreus-soft`
  (alpha 20%) sobre `bg-base` se evalúa como vitreus puro, no como mezcla.
- **Combinators padre-hijo en reglas separadas**: si `color` lo declara
  `.ig-card-title` y el `background` lo declara `.ig-card`, el script no
  cruza esas dos reglas. Solo ve pares dentro del mismo bloque.
- **Gradients** (`linear-gradient`, `radial-gradient`): el script ignora
  el background si no es un color sólido.
- **`currentColor`**: cuando el background es `currentColor` se omite el
  par (el `color` viene del consumer).
- **CSS custom properties no definidas en `igoded-tokens.css`**: cualquier
  `var(--algo-externo)` se omite.

Cuando añadas un componente con alphas, gradients o color desde el padre,
asume que `test:contrast` no te cubre y verifica con `test:storybook`.
