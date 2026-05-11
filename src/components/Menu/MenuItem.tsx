import { useMergeRefs } from "@floating-ui/react";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  Ref,
} from "react";
import { useRef } from "react";
import { cn } from "@/utils/cn";
import { useMenu } from "./MenuContext";

interface CommonProps {
  /** Marca el item como acción destructiva (color malum). */
  danger?: boolean;
  /** Marca el item como seleccionado actualmente. */
  active?: boolean;
}

// Callbacks consumer-facing tipados con HTMLElement (no element-specific).
// Razón (C-03 RC1): los handlers internos del MenuItem no aprovechan API
// anchor/button-specific. Auditar el repo + consumers reveló 0 accesos a
// e.currentTarget.{href,disabled,form,target,...} desde callbacks del
// consumer. Alinear consumer-facing con la firma que el componente
// realmente necesita evita 4 casts `as unknown as` en el bridge interno.
// Si un consumer necesitase API anchor-specific, narrowing manual:
//   onClick={(e) => { if (e.currentTarget instanceof HTMLAnchorElement) ... }}
type ItemMouseHandler = (e: MouseEvent<HTMLElement>) => void;
type ItemKeyboardHandler = (e: KeyboardEvent<HTMLElement>) => void;

type ButtonItemProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "onKeyDown"> & {
    href?: undefined;
    onClick?: ItemMouseHandler;
    onKeyDown?: ItemKeyboardHandler;
    ref?: Ref<HTMLButtonElement>;
  };

type AnchorItemProps = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "onClick" | "onKeyDown"> & {
    href: string;
    onClick?: ItemMouseHandler;
    onKeyDown?: ItemKeyboardHandler;
    ref?: Ref<HTMLAnchorElement>;
  };

export type MenuItemProps = ButtonItemProps | AnchorItemProps;

/**
 * Helper interno — extrae texto plano de children para typeahead matching.
 */
function extractLabel(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractLabel).join(" ");
  if (
    children !== null &&
    typeof children === "object" &&
    "props" in children &&
    typeof children.props === "object" &&
    children.props !== null &&
    "children" in children.props
  ) {
    return extractLabel(children.props.children as ReactNode);
  }
  return "";
}

/**
 * MenuItem — entrada del menú con `role="menuitem"`.
 *
 * Si recibe `href` renderiza un `<a>`, si no un `<button>`. Cierra el menu
 * al activarse cuando `Menu.closeOnSelect` está activo (por defecto).
 *
 * **C-03 (RC1)**: navegación delegada a `useListNavigation` + `useTypeahead`
 * de Floating UI sobre el primitive layer.
 *
 * **A11y APG menu**:
 * - `role="menuitem"`.
 * - `aria-disabled="true"` salta el item en flechas Y bloquea clicks.
 * - Roving tabindex: `tabIndex={-1}` para todos.
 *
 * **H-19**: `<a>` sintetiza click en Space (Enter ya dispara click nativo).
 *
 * **Tipo de callbacks**: `onClick`/`onKeyDown` tipan `MouseEvent<HTMLElement>`
 * / `KeyboardEvent<HTMLElement>` (no element-specific). Razón: alineación
 * con la firma genuinamente común de ambos branches (`<a>` y `<button>`).
 * Audit pre-RC1 verificó 0 consumers accediendo a `e.currentTarget.{href,
 * disabled,...}` desde callbacks de MenuItem. Si un consumer hipotético lo
 * necesita: narrowing manual con `instanceof`.
 */
export function MenuItem({ ref, ...props }: MenuItemProps) {
  const { setOpen, closeOnSelect, listRef, labelsRef, getItemProps } =
    useMenu();
  // slotRef guarda el índice que este MenuItem ocupa actualmente en
  // listRef. Necesario para limpiar el slot al unmount — sin esto,
  // listRef acumula nodes detached cuando MenuContent remontea entre
  // las ramas open?<FloatingFocusManager>:<div> (o en React StrictMode
  // ref cycles), y useListNavigation/useTypeahead leen índices stale.
  // (Codex P1 review sobre PR #63).
  const slotRef = useRef<number | null>(null);

  // Discriminator preservado tras destructure: `"href" in props` con
  // typeof string detecta la rama AnchorItemProps.
  const isAnchor = "href" in props && typeof props.href === "string";

  const registerItem = (node: HTMLElement | null) => {
    if (node === null) {
      // Unmount/detach: liberar el slot que ocupábamos para que
      // siguientes items puedan reciclarlo y FUI no lea node stale.
      if (slotRef.current !== null) {
        listRef.current[slotRef.current] = null;
        labelsRef.current[slotRef.current] = null;
        slotRef.current = null;
      }
      return;
    }
    // Mount o re-mount: ¿ya registrado en algún slot?
    let idx = listRef.current.indexOf(node);
    if (idx === -1) {
      // Buscar slot reciclado (null tras unmount previo) o append.
      idx = listRef.current.indexOf(null);
      if (idx === -1) {
        idx = listRef.current.length;
      }
      listRef.current[idx] = node;
      labelsRef.current[idx] = extractLabel(props.children).trim() || null;
    }
    slotRef.current = idx;
  };

  // useMergeRefs SIEMPRE al mismo orden (Rules of Hooks). El `ref` viene
  // del parameter destructure — el linter `react-hooks/refs` NO lo flagea
  // como leak porque no es acceso a `props.ref`.
  const refMerged = useMergeRefs([
    registerItem,
    (ref ?? null) as Ref<HTMLElement>,
  ]);

  const close = () => {
    if (!closeOnSelect) return;
    setOpen(false);
  };

  const ariaDisabled = props["aria-disabled"];
  const isAriaDisabled = ariaDisabled === true || ariaDisabled === "true";

  // tabIndex={-1} hardcoded — APG menu pattern: Tab NO navega items
  // del menu (solo arrows + typeahead). El foco entra al primer/último
  // item via `.focus()` programático invocado por useListNavigation con
  // focusItemOnOpen: 'auto'. `tabIndex={-1}` permite `.focus()`
  // programático sin participar del Tab order del documento.

  // Handlers internos con firma genérica Element (alineada con la firma
  // de getItemProps de FUI). Cero casts.
  const handleClick = (e: MouseEvent<HTMLElement>) => {
    if (isAriaDisabled) {
      e.preventDefault();
      return;
    }
    props.onClick?.(e);
    if (!e.defaultPrevented) close();
  };

  const handleKeyDownButton = (e: KeyboardEvent<HTMLElement>) => {
    props.onKeyDown?.(e);
  };

  const handleKeyDownAnchor = (e: KeyboardEvent<HTMLElement>) => {
    props.onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (isAriaDisabled && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      return;
    }
    // H-19: Space en <a> sintetiza click. e.repeat ignora keydown
    // repetidos. preventDefault siempre evita scroll. instanceof
    // HTMLElement es narrowing real (type guard), no afirmación —
    // garantiza que `.click()` existe en el target.
    if (e.key === " ") {
      e.preventDefault();
      if (e.repeat) return;
      if (e.currentTarget instanceof HTMLElement) {
        e.currentTarget.click();
      }
    }
  };

  if (isAnchor) {
    const anchorProps = props as Omit<AnchorItemProps, "ref">;
    const {
      onClick: _omitClick,
      onKeyDown: _omitKey,
      children,
      className,
      danger,
      active,
      ...anchorRest
    } = anchorProps;
    void _omitClick;
    void _omitKey;

    return (
      <a
        {...getItemProps({
          ...anchorRest,
          onClick: handleClick,
          onKeyDown: handleKeyDownAnchor,
        })}
        ref={refMerged}
        role="menuitem"
        tabIndex={-1}
        className={cn(
          "ig-menu-item",
          danger && "ig-menu-item-danger",
          active && "ig-menu-item-active",
          className,
        )}
      >
        {children}
      </a>
    );
  }

  const buttonProps = props as Omit<ButtonItemProps, "ref">;
  const {
    onClick: _omitClick,
    onKeyDown: _omitKey,
    children,
    className,
    danger,
    active,
    type = "button",
    ...buttonRest
  } = buttonProps;
  void _omitClick;
  void _omitKey;

  return (
    <button
      {...getItemProps({
        ...buttonRest,
        onClick: handleClick,
        onKeyDown: handleKeyDownButton,
      })}
      ref={refMerged}
      type={type}
      role="menuitem"
      tabIndex={-1}
      className={cn(
        "ig-menu-item",
        danger && "ig-menu-item-danger",
        active && "ig-menu-item-active",
        className,
      )}
    >
      {children}
    </button>
  );
}

// Re-exporta tipos individuales por si el consumer necesita tipar
// específicamente (poco común — usar MenuItemProps).
export type { ButtonItemProps, AnchorItemProps };
