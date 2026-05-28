/**
 * `<Slot>` primitive — INTERNAL barrel.
 *
 * NO exportado al root `src/components/index.ts` ni al `package.json#exports`.
 * Solo los components del DS pueden importar desde aquí via alias
 * `@/components/Slot` cuando implementan su `asChild` prop.
 *
 * D14 Bloque A: primitive standalone con tests propios. Bloques B/C/D
 * lo consumirán para Dialog/AlertDialog/Tooltip/Menu.
 *
 * @internal
 */
export { Slot } from "./Slot";
export type { SlotProps } from "./Slot";
export { composeRefs } from "./composeRefs";
export { composeEventHandlers } from "./composeEventHandlers";
