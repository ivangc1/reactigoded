// _internal-env.d.ts
//
// Ambient types **solo** para que `tsc -p tsconfig.build.json` resuelva
// `import.meta.env.DEV` cuando los componentes lo usan directamente
// (B-07 — bundle DCE de dev warns en producción).
//
// Este archivo NO contiene module declarations de assets (`*.css`,
// `*.svg`, etc.). Todo eso vive en `src/vite-env.d.ts`, que SÍ está
// excluido del build para no contaminar el typing del consumer.
//
// Si alguno de estos `.d.ts` artefactos llegara a generarse en `dist/`,
// `scripts/clean-internal-dist.mjs` lo elimina post-build. La opción
// 2 del trade-off documentada en RC1_DECISIONS / B-07-followup.

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
