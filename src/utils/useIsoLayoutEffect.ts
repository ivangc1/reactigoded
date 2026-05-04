import { useEffect, useLayoutEffect } from "react";

/**
 * `useLayoutEffect` en cliente, `useEffect` en server. Convención canónica
 * del ecosistema React (Radix, Framer Motion, TanStack…). Evita el
 * warning "useLayoutEffect does nothing on the server" durante SSR sin
 * caer al noop `() => {}`, que rompe el contrato de hooks (deps,
 * cleanup) cuando el componente se renderiza en un runtime con efectos.
 */
export const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
