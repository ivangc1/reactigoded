/**
 * Tipos para `import.meta.env` (Vite). Este archivo SÍ va al build (a
 * diferencia de `vite-env.d.ts` que está excluido para no exportar las
 * declaraciones de módulos `*.css`/`*.svg` al consumer).
 *
 * Solo declaramos las propiedades que usamos en runtime de los componentes:
 *  - `DEV`: true en dev/test, false en producción. Usado para warnings
 *    dev-only (Card, Tabs).
 *
 * Si añades más usos de `import.meta.env` en componentes, declara aquí las
 * propiedades correspondientes.
 */
interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
