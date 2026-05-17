// D7.4 (RC1 gate review beta.24): `useFloatingNode` retirado del barrel.
// JSDoc declaraba @example interno pero el wildcard re-export del barrel
// + cadena components/index.ts lo exponía al bundle root accidentalmente.
// Anti-pattern paralelo a D4 useSidebar (JSDoc miente vs bundle real).
//
// Internal consumers (Menu, Tooltip) importan via path directo
// `@/components/floating/primitives/useFloatingNode`. Sin cambio en
// source — solo retirado del re-export público.
//
// CHANGELOG breaking: consumers que (accidentalmente) importaron
// `useFloatingNode` desde "reactigoded" deben removerlo. JSDoc del hook
// ya documentaba @example interno — uso público era unintended.

export { FloatingTreeRoot } from "./FloatingTreeRoot";
export type { FloatingTreeRootProps } from "./FloatingTreeRoot";
