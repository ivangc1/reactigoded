import clsx, { type ClassValue } from "clsx";

/**
 * Combina clases CSS condicionalmente.
 *
 * Acepta strings, objetos, arrays anidados y valores condicionales
 * (false/null/undefined se ignoran).
 *
 * @example
 * cn("ig-btn", isActive && "ig-btn-active", { "ig-disabled": !canClick })
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
