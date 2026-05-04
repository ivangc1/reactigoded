/**
 * Detecta si estamos en build de desarrollo (Vite-aware).
 *
 * Usamos `import.meta.env.DEV` directamente, pero con un cast local en
 * vez de declararlo en `env.d.ts` ambient. Razón:
 *  - `env.d.ts` con declaraciones globales se filtraba al `dist/` y los
 *    consumers acababan viendo `interface ImportMetaEnv` mergeada en
 *    su propia `ImportMetaEnv`, contaminando su typing.
 *  - Centralizar el acceso aquí evita el cast disperso por componentes
 *    y ofrece un único punto de cambio si en el futuro saltamos a otra
 *    convención (process.env.NODE_ENV, custom build flag, etc.).
 *
 * El bundler (Vite/Rollup) reemplaza `import.meta.env.DEV` por
 * `true`/`false` literal en build, así que el tree-shaker elimina los
 * bloques de warnings dev-only en producción.
 */
export const isDev = (): boolean => {
  const env = (import.meta as unknown as { env?: { DEV?: boolean } }).env;
  return env?.DEV === true;
};
