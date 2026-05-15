"use client";

import { useFloatingNodeId, useFloatingParentNodeId } from "@floating-ui/react";

/**
 * useFloatingNode — registra un float en el `FloatingTreeRoot` activo
 * (si existe). Devuelve `nodeId` para pasar a `useFloating({ nodeId })`
 * y `parentId` para detectar floats anidados.
 *
 * Si no hay tree (consumer sin `FloatingTreeRoot`), `nodeId` queda
 * registrado pero sin ancestros, así que el float opera independiente
 * sin romper. Esto significa que componentes del DS (Tooltip, Popover,
 * Dropdown FUI) **siempre** llaman este hook — el comportamiento es
 * gradual: sin tree → independiente; con tree → cascade dismiss.
 *
 * H-01 / B-03 (gate review): primitiva compartida para los floats del
 * DS. Aísla del consumer el detalle de qué hooks de FUI se llaman
 * para registrarse en el árbol.
 *
 * @example interno de un componente flotante del DS
 * ```tsx
 * const { nodeId } = useFloatingNode();
 * const { context, ... } = useFloating({ nodeId, ... });
 * ```
 */
export function useFloatingNode(): {
  nodeId: string | undefined;
  parentId: string | null;
} {
  // `useFloatingNodeId` devuelve `string | undefined`: undefined cuando
  // no hay `<FloatingTree>` ancestor (o ningún `<FloatingNode>` que lo
  // requiera). En ese caso el float opera fuera del árbol — `useFloating`
  // y `<FloatingNode>` aceptan `nodeId` opcional, así que se pasa como
  // está sin necesidad de fallback.
  const nodeId = useFloatingNodeId();
  const parentId = useFloatingParentNodeId();
  return { nodeId, parentId };
}
