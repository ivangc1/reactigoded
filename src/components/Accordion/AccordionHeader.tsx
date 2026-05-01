import {
  useRef,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/utils/cn";
import { useAccordionItem } from "./AccordionContext";

export interface AccordionHeaderProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  /** Texto/contenido del header. */
  children: ReactNode;
  /** Si `true`, oculta el icono indicador. */
  hideIcon?: boolean;
  /** Reemplaza el icono por defecto (▼). */
  icon?: ReactNode;
  /** Callback al togglear (además del toggle interno). */
  onOpenChange?: (open: boolean) => void;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * AccordionHeader — botón clicable que abre/cierra el item.
 *
 * Acepta keyboard navigation entre headers del mismo Accordion: ↑/↓ ciclan,
 * Home/End van a extremos. Los items con `disabled` se saltan.
 *
 * Renderiza un `<button>` con `aria-expanded` y `aria-controls` apuntando al
 * panel asociado.
 */
export function AccordionHeader({
  className,
  children,
  hideIcon = false,
  icon,
  disabled,
  onOpenChange,
  onKeyDown,
  ref,
  ...rest
}: AccordionHeaderProps) {
  const { open, toggle, headerId, contentId } = useAccordionItem();
  const internalRef = useRef<HTMLButtonElement | null>(null);

  const setRef = (node: HTMLButtonElement | null) => {
    internalRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as { current: HTMLButtonElement | null }).current = node;
  };

  const handleClick = () => {
    toggle();
    onOpenChange?.(!open);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    const node = internalRef.current;
    const root = node?.closest(".ig-accordion");
    if (!node || !root) return;

    const headers = Array.from(
      root.querySelectorAll<HTMLButtonElement>(".ig-accordion-header"),
    ).filter((el) => !el.disabled);

    const currentIndex = headers.indexOf(node);
    if (currentIndex === -1) return;

    let nextIndex = -1;
    switch (event.key) {
      case "ArrowDown":
        nextIndex = (currentIndex + 1) % headers.length;
        break;
      case "ArrowUp":
        nextIndex = (currentIndex - 1 + headers.length) % headers.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = headers.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    headers[nextIndex]?.focus();
  };

  return (
    <button
      {...rest}
      ref={setRef}
      id={headerId}
      type="button"
      className={cn("ig-accordion-header", className)}
      aria-expanded={open}
      aria-controls={contentId}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <span>{children}</span>
      {!hideIcon && (
        <span className="ig-accordion-icon" aria-hidden="true">
          {icon ?? "▼"}
        </span>
      )}
    </button>
  );
}
