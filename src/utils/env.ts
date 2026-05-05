/**
 * Helpers de entorno (uso interno del DS).
 *
 * **NOTA**: `isDev()` se DESACONSEJA dentro de componentes. Usa
 * `import.meta.env.DEV` directamente — esbuild/Vite hacen DCE
 * (Dead Code Elimination) del bloque dev-only en producción cuando lo
 * ven como expresión literal estática, pero NO lo hacen cuando está
 * tras una llamada de función. Mantenemos `isDev()` solo para casos
 * raros donde el resultado se pasa como dato (raros).
 *
 * Cierra B-07: ningún componente del DS importa esta función desde
 * 1.0.0-beta.22; todos usan `import.meta.env.DEV` directo y los
 * `console.warn` dev-only desaparecen del bundle producción.
 */
export const isDev = (): boolean => {
  const env = (import.meta as unknown as { env?: { DEV?: boolean } }).env;
  return env?.DEV === true;
};
