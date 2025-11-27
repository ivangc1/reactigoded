import clsx from 'clsx'

/**
 * Helper para combinar clases condicionalmente
 * @param {...any} inputs - Clases CSS o condiciones
 * @returns {string} - Clases combinadas
 */
export function cn(...inputs) {
  return clsx(inputs)
}
