/**
 * Selector compartido por DropdownTrigger y DropdownItem para localizar
 * los items navegables del menú.
 *
 * Excluye:
 *  - `[disabled]` — los <button> nativos disabled no son focuseables.
 *  - `[aria-disabled="true"]` — los <a> y custom items que se marcan
 *    deshabilitados por ARIA pero NO por el atributo HTML `disabled`.
 *
 * Tener UN solo selector evita que trigger e item se desincronicen
 * (el bug histórico era que ↓ desde trigger saltaba a un item con
 * aria-disabled, y luego ArrowDown desde ahí lo saltaba — comportamiento
 * inconsistente).
 */
export const NAVIGABLE_ITEM_SELECTOR =
  '[role="menuitem"]:not([disabled]):not([aria-disabled="true"])';
