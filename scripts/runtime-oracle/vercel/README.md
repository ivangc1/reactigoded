# Vercel Edge — oráculo fiel (#18, cierra el ~5% de `@edge-runtime/vm`)

El runtime-oracle mide las premisas del gate `@server-safe` contra **workerd**
y **Deno** (reales, 13/13 PASS). El tercer runtime del mandato es **Vercel
Edge**, que `@edge-runtime/vm` solo aproxima (~95%): es un sandbox sobre Node
y **filtra globals Node-shared** (`performance.eventLoopUtilization`,
`URL.createObjectURL`, `WebAssembly.Module`…) que en el Edge REAL no existen o
lanzan. Este probe se deploya al Vercel Edge de **producción** — el único
oráculo fiel para ese runtime — y confirma que el catálogo del gate
(`SAFE_GLOBALS`, `EDGE_MISSING_GLOBALS`, premisas) coincide con la realidad.

## Deploy (requiere cuenta Vercel)

`vercel dev` **NO sirve** — corre `@edge-runtime/vm` (el 95%). Hace falta un
deploy de **producción** (runtime Edge real).

```bash
# 1. Vercel CLI (si no la tienes)
npm i -g vercel

# 2. Deploy de producción desde ESTE directorio
cd scripts/runtime-oracle/vercel
vercel deploy --prod --yes        # primera vez: te pide login + link a un proyecto

# 3. Comparar contra el catálogo del gate (fail-loud si hay drift). `compare`
#    hace POST con el catálogo → el probe prueba `name in globalThis` en el Edge
#    real. La ENUMERACIÓN no es fiable (objeto-global exótico: URL/Blob/fetch no
#    salen en getOwnPropertyNames ni en el prototype-walk aunque existan).
cd -                              # volver al repo root
node scripts/runtime-oracle/compare-vercel.mjs https://<tu-deploy>.vercel.app/api/probe
# (inspección manual: curl GET https://<tu-deploy>.vercel.app/api/probe → dump)

# 4. Borrar el deploy efímero cuando termines
vercel rm <nombre-del-proyecto> --yes
```

## Interpretación

- **✓ verde**: el Vercel Edge real coincide con el catálogo → fidelidad
  confirmada (95→98%). Pega el output aquí / a Claude para pinear la medición
  en este README (fecha + región) como se hizo con workerd `2026-07-17`.
- **✗ drift**: uno de tres casos, cada uno accionable:
  - **`SAFE_GLOBAL` ausente** en Edge real → **falso negativo del gate**: un
    módulo `@server-safe` que lo use bare crashearía en producción. Sacarlo de
    `SAFE_GLOBALS` (restarlo).
  - **`EDGE_MISSING_GLOBAL` presente** en Edge real → gate **sobre-estricto**
    (FP corregible, no crash): quitarlo de `EDGE_MISSING_GLOBALS`.
  - **premisa que no coincide** (p.ej. `createObjectURL` no lanza) →
    re-clasificar el hazard en el catálogo.

## Notas

- Es un proyecto Vercel **aislado y efímero** (`package.json`/`vercel.json`
  propios): NO forma parte del paquete npm ni del build del DS. Se deploya, se
  mide y se borra.
- El probe (`api/probe.ts`) replica las 13 sondas de `../worker.js` (el probe de
  workerd) + añade el dump de `Object.getOwnPropertyNames(globalThis)`.
- Pinear la medición: cuando pase verde, anota aquí `fecha + región + versión`
  igual que las premisas pineadas del `../README.md`, para que el drift futuro
  (bump del Edge runtime de Vercel) se detecte.
