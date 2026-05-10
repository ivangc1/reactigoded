import {
  cloneElement,
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLProps,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  FloatingNode,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useMergeRefs,
} from "@floating-ui/react";
import { cn } from "@/utils/cn";
import { useFloatingNode } from "../primitives/useFloatingNode";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

export type TooltipVariant =
  | "brand"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface TooltipProps {
  /**
   * Contenido del tooltip. Acepta `string` (recomendado para a11y) o
   * `ReactNode` para casos con formatting (negrita, links, fragmentos).
   *
   * **A11y — preferir string**: el SR-only `<span role="tooltip">` que
   * contiene este valor es el referente de `aria-describedby` del child.
   * Los SR (NVDA, VoiceOver, JAWS) leen el contenido del elemento. Con
   * `string` el comportamiento está garantizado. Con `ReactNode`
   * (`<strong>`, `<a>`, fragments) los SR pueden saltar nodos o leer
   * en orden inesperado dependiendo del rol semántico — el consumer
   * es responsable de que el contenido sea announce-friendly.
   *
   * Si necesitas formatting rich con interacción (links clickables,
   * botones), considera `Popover` (1.1.0+) en lugar de Tooltip.
   *
   * C-01 (gate review): pre-RC1 era `string` puro. Ampliado a
   * `string | ReactNode` para alinear con `Popover.content` y
   * `HoverCard.content` futuros (evitar dos APIs hermanas con tipos
   * incompatibles para conceptos similares).
   */
  text: string | ReactNode;
  /** Posición preferida relativa al child. Por defecto `"top"`. */
  placement?: TooltipPlacement;
  /** Color del tooltip. */
  variant?: TooltipVariant;
  /**
   * Elemento envuelto (típicamente un `<button>` o `<a>`). Debe ser
   * un único `ReactElement` HTML — no string, fragment, array ni
   * `ReactNode` arbitrario. El componente inyecta refs / handlers /
   * `aria-describedby` vía `cloneElement`, lo que requiere un nodo
   * elemento concreto.
   *
   * H-18 (gate review): el tipo previo `ReactNode` permitía
   * `<Tooltip text="x">texto</Tooltip>` o arrays/fragments en
   * tiempo de tipos, pero el control no quedaba asociado al SR.
   * `ReactElement<HTMLProps<HTMLElement>>` rechaza ese caso en
   * compile-time.
   *
   * D-01 / M-05 (gate review, RC1): el child se renderiza directo
   * (Slot pattern) — no envuelto en un `<span>`. Tooltip era pre-RC1
   * un wrapper `<span class="ig-tooltip-wrapper">` que rompía
   * block-level layouts y obligaba a CSS extra. La eliminación es
   * **breaking** (consumer con reglas dirigidas a `.ig-tooltip-wrapper`
   * pierden el target) y se refleja en CHANGELOG.
   */
  children: ReactElement<HTMLProps<HTMLElement>>;
  /** Delay en ms antes de mostrar al hover. Por defecto `0`. */
  openDelay?: number;
  /** Delay en ms antes de ocultar al desactivar. Por defecto `0`. */
  closeDelay?: number;
  /**
   * Contenedor donde se monta el portal del tooltip. Por defecto
   * `document.body`. También aplica para CSS containment / shadow roots.
   *
   * **Caso típico — Tooltip dentro de Modal**: `<Modal>` usa
   * `<dialog>.showModal()` que crea un top-layer del browser. Si el
   * portal del tooltip queda en `document.body`, aparece *detrás* del
   * backdrop del dialog (invisible al usuario). Pasar el ref del
   * dialog como container hace que el portal viva dentro del top-layer
   * y se renderice por encima del backdrop.
   *
   * Patrón canónico (decisión C-02 documentada en
   * `docs/decisions/C-02-modal-tooltip-portal.md`):
   *
   * ```tsx
   * function MiPantalla() {
   *   const dialogRef = useRef<HTMLDialogElement>(null);
   *   return (
   *     <Modal ref={dialogRef} open onClose={...}>
   *       <ModalBody>
   *         <Tooltip text="Eliminar" container={dialogRef}>
   *           <Button>×</Button>
   *         </Tooltip>
   *       </ModalBody>
   *     </Modal>
   *   );
   * }
   * ```
   *
   * Acepta `HTMLElement` directo o un `RefObject` (Floating UI
   * resuelve ambos).
   */
  container?: HTMLElement | React.RefObject<HTMLElement | null> | null;
}

/**
 * Tooltip — wrapper que muestra un texto contextual al hacer hover/focus
 * sobre el child. Usa **Floating UI** (`@floating-ui/react`) para
 * positioning robusto:
 *
 * - **Portal-out**: el tooltip vive en un `<FloatingPortal>` al final
 *   de `<body>`, escapando overflow:hidden de cualquier ancestor.
 * - **`flip` + `shift`**: si no cabe en el placement preferido, salta
 *   al opuesto o se desplaza para mantenerse visible en el viewport.
 * - **`offset(8px)`**: separación entre el child y el tooltip.
 * - **`autoUpdate`**: reposicionamiento al scroll/resize/transform.
 *
 * **A11y**:
 * - El child recibe `aria-describedby` apuntando al span sr-only que
 *   contiene el `text`. Los lectores de pantalla siempre tienen
 *   acceso al texto (incluso cuando el portal no está montado).
 * - El portal flotante usa `role="tooltip"` (gestionado por `useRole`).
 * - `useDismiss` cierra con Escape. `outsidePress` desactivado: un
 *   tooltip hover/focus-only no puede dejarse "abierto" por error —
 *   sale del hover/focus ya cierra. Sin esto, FUI montaría un listener
 *   global de pointerdown sobre `document` mientras open, ruido sin
 *   beneficio. Si en el futuro hay un Tooltip click-trigger (poco
 *   probable; usa Popover para eso), reabrir como prop opt-in.
 *
 * **D-01 / M-05 / B-03 / H-01 (RC1)**: refactor a Slot pattern +
 * primitives layer. El Tooltip ya **no renderiza wrapper span**:
 * devuelve el child clonado + un sr-only span sibling + el portal.
 * Esto cierra:
 *   - **D-01 / M-05**: rompía block-level layouts del consumer porque
 *     todo se envolvía en `<span class="ig-tooltip-wrapper">`.
 *   - **H-01 / B-03**: cascade dismiss vía `<FloatingTreeRoot>` +
 *     `useFloatingNode()` + `<FloatingNode>`. Sin tree, sigue
 *     funcionando independiente.
 *
 * **Migración desde CSS-only (pre-1.0.0-rc.1)**: la API pública
 * (props text/placement/variant) NO cambia. Las clases
 * `ig-tooltip-place-*` y `ig-tooltip-color-*` ahora se aplican al
 * elemento del portal en lugar del wrapper. Si tenías reglas CSS
 * dirigidas al wrapper `.ig-tooltip-wrapper` o ref / className en el
 * `<Tooltip>`, ese wrapper ya no existe: aplica los estilos directo
 * al child o envuélvelo manualmente.
 *
 * **Caveat — Tooltip sobre `<button disabled>` en Firefox** (L-03
 * gate review): Firefox NO dispara `mouseenter` / `pointerenter` /
 * `focus` sobre `<button disabled>` (Chrome/Safari sí). El SR-only
 * span con `aria-describedby` sigue funcionando para lectores de
 * pantalla, pero el portal visual no aparece al hover. Workaround
 * canónico: envolver el botón en un `<span>` y aplicar
 * `pointer-events: none` al botón disabled (el span recibe los
 * eventos):
 *
 * ```tsx
 * <Tooltip text="Acción no disponible">
 *   <span style={{ display: "inline-block" }}>
 *     <Button disabled style={{ pointerEvents: "none" }}>X</Button>
 *   </span>
 * </Tooltip>
 * ```
 *
 * El DS no aplica este wrapper automáticamente (Slot pattern: cero
 * elementos extras silenciosos).
 *
 * @example
 * <Tooltip text="Eliminar" placement="top">
 *   <Button icon aria-label="Eliminar">×</Button>
 * </Tooltip>
 *
 * @example // overflow:hidden ya NO recorta el tooltip (portal-out)
 * <div style={{ overflow: "hidden", width: 100 }}>
 *   <Tooltip text="Texto largo que escapa">
 *     <Button>Hover</Button>
 *   </Tooltip>
 * </div>
 *
 * @example // cascade dismiss con FloatingTreeRoot
 * <FloatingTreeRoot>
 *   <Popover content={<Tooltip text="..."><Button>Y</Button></Tooltip>}>
 *     <Button>X</Button>
 *   </Popover>
 * </FloatingTreeRoot>
 */
export function Tooltip({
  text,
  placement = "top",
  variant,
  children,
  openDelay = 0,
  closeDelay = 0,
  container,
}: TooltipProps) {
  const tooltipId = useId();
  const { nodeId } = useFloatingNode();

  // L-02 (gate review): dev warn cuando `text` es empty / solo
  // whitespace. Es prop requerida (TS no permite undefined) pero el
  // consumer puede pasar "" o " " accidentalmente — el SR no lee
  // nada y el portal visual queda vacío. El warn explícito ayuda a
  // detectarlo antes de QA.
  //
  // C-01: text amplió a `string | ReactNode`. El warn solo aplica al
  // caso string (ReactNode arbitrario puede ser un fragmento
  // condicional legítimamente vacío en algún branch — no warneamos
  // false positives para ese caso).
  const warnedTextRef = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (warnedTextRef.current) return;
    if (typeof text === "string" && text.trim() === "") {
      warnedTextRef.current = true;
      console.warn(
        `[reactigoded] <Tooltip text=${JSON.stringify(text)}> está vacío o es solo whitespace; el SR no anuncia nada y el tooltip visual queda vacío.`,
      );
    }
  }, [text]);

  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    // Spread condicional: `useFloatingNodeId` devuelve `string | undefined`
    // y `exactOptionalPropertyTypes: true` prohíbe pasar `undefined`
    // explícito a un `nodeId?: string`. Si no hay tree, omitimos la prop.
    ...(nodeId !== undefined ? { nodeId } : {}),
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, {
    move: false,
    delay: { open: openDelay, close: closeDelay },
  });
  const focus = useFocus(context);
  // L-01: Tooltip es hover/focus-only. `outsidePress: false` evita
  // que FUI monte un listener global de pointerdown en document
  // mientras open — sin beneficio porque el cierre ya lo manejan
  // useHover/useFocus al perder hover o blur. Escape sí queda
  // habilitado (estándar APG: `Escape` cierra cualquier popup).
  //
  // H-01 (RC1): con FloatingTreeRoot, `Escape` se propaga en cascada
  // por el árbol — cierra el tooltip y también ancestros (Popover,
  // Modal) que estén registrados como nodos. `bubbles.escapeKey: true`
  // es REQUERIDO para activar la propagación — sin él, `useDismiss`
  // no emite el evento `dismiss` al tree y el cascade efectivamente
  // no funciona (el tooltip se cierra pero los ancestros NO se
  // enteran). Codex P1 review sobre PR #62 detectó el bug en revisión.
  // `bubbles.outsidePress` es irrelevante aquí porque outsidePress
  // está deshabilitado entero.
  const dismiss = useDismiss(context, {
    outsidePress: false,
    bubbles: { escapeKey: true },
  });
  // No usamos `useRole` porque añade un `aria-describedby` dinámico al
  // referencia (apuntando al floating element) que se sobreescribiría
  // con el nuestro al `cloneElement`. Nuestra estrategia a11y es:
  // mantener un `<span role="tooltip">` SR-only PERMANENTE como el
  // referente estable de aria-describedby. El portal flotante es
  // decoración visual.
  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
  ]);

  // Preservar el `ref` del child (consumer puede tener uno para foco
  // programático, mediciones, analytics, etc.) mergeándolo con
  // `refs.setReference` de Floating UI vía `useMergeRefs`. Si el
  // child no tiene ref, el merge funciona igual (Floating UI tolera
  // null en el array).
  //
  // H-18 (gate review): `children` ahora es `ReactElement<HTMLProps<
  // HTMLElement>>` por contrato de tipos, así que el cast a-mano y el
  // guard runtime `isValidElement` desaparecen — TS los garantiza
  // en compile-time. Consumer JS sin TS verá un crash inmediato si
  // pasa string/array/fragment al cloneElement, lo cual es señal
  // clara mejor que el warn silencioso anterior.
  const childRef = children.props.ref ?? null;
  const referenceRef = useMergeRefs([refs.setReference, childRef]);

  // Inyectar handlers/refs de Floating UI MERGEADOS con los del child:
  // - `getReferenceProps(children.props)` pasa los props existentes,
  //   así Floating UI fusiona `onMouseEnter`/`onFocus`/`onBlur`/etc.
  //   del consumer con sus propios listeners en lugar de pisarlos.
  // - `referenceRef` (mergeado arriba) preserva cualquier ref del
  //   consumer en lugar de sobreescribirlo.
  // - `aria-describedby` al final para que NO sea pisado (apunta al
  //   sr-only span persistente, no al portal).
  const existing = children.props["aria-describedby"];
  const combined = existing ? `${existing} ${tooltipId}` : tooltipId;
  const referenceProps = getReferenceProps(children.props);
  const child = cloneElement(children, {
    ...referenceProps,
    ref: referenceRef,
    "aria-describedby": combined,
  });

  // D-01 / M-05 (RC1): Slot pattern. Devolvemos un Fragment con:
  //   1. El child clonado (anchor del tooltip).
  //   2. SR-only span sibling con id estable y `inert` — referente
  //      permanente de aria-describedby. SSR-friendly (no portal).
  //   3. Portal flotante condicional (solo cuando isOpen).
  //
  // Sin `<span ig-tooltip-wrapper>` envolviendo: el child mantiene su
  // contexto de layout original (block/inline/grid/etc) sin que el
  // DS introduzca un inline-element silencioso.
  //
  // H-01 / B-03 (RC1): `<FloatingNode id={nodeId}>` envuelve el portal
  // para registrar este float en el FloatingTree (cascade dismiss).
  // Si no hay FloatingTreeRoot ancestor, `nodeId` es `undefined` y
  // omitimos `<FloatingNode>` — el portal funciona igual independiente.
  //
  // H-04 (gate review): `container` permite anclar el portal a otro
  // contenedor que no sea `document.body`. Caso típico: Tooltip
  // dentro de un Modal (<dialog>.showModal() crea top-layer); sin
  // root, el portal va a body y queda detrás del backdrop. Spread
  // condicional (NO `root={container ?? null}`): exactOptionalPropertyTypes
  // prohíbe `undefined` explícito y `root={null}` FUI lo trata como
  // "no montar el portal" (verificado: 15 tests rotos con esa firma).
  // Solo OMITIR la prop activa el default (body).
  //
  // C-01 extendido (codex P1 follow-up): `inert` en el portal flotante
  // neutraliza interactividad si `text` es ReactNode con `<button>`/`<a>`.
  // Tooltip es decoración visual; nunca debe ser tab target. Para
  // contenido interactivo usar Popover.
  //
  // C-01: `data-tooltip-content` solo se setea cuando text es string
  // (serializable como atributo HTML). Para ReactNode el atributo
  // sería '[object Object]', inútil. Spread condicional respeta
  // exactOptionalPropertyTypes.
  const portal = isOpen && (
    <FloatingPortal {...(container ? { root: container } : {})}>
      <span
        ref={refs.setFloating}
        style={floatingStyles}
        className={cn(
          "ig-tooltip",
          `ig-tooltip-place-${placement}`,
          variant && `ig-tooltip-color-${variant}`,
        )}
        inert
        {...(typeof text === "string"
          ? { "data-tooltip-content": text }
          : {})}
        {...getFloatingProps()}
      >
        {text}
      </span>
    </FloatingPortal>
  );

  return (
    <>
      {child}
      <span id={tooltipId} role="tooltip" className="ig-sr-only" inert>
        {text}
      </span>
      {nodeId === undefined ? (
        portal
      ) : (
        <FloatingNode id={nodeId}>{portal}</FloatingNode>
      )}
    </>
  );
}
