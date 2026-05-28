"use client";

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type HTMLProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { Slot } from "@/components/Slot";

/**
 * Extrae texto plano de un ReactNode arbitrario. Usado para el span
 * sr-only del Tooltip — garantiza que el referente de aria-describedby
 * contiene solo string (sin focusables que crearían un focus trap
 * invisible al estar dentro de un elemento sr-only fuera del viewport).
 *
 * Resuelve simultáneamente:
 * - Codex P1 sobre PR #52 (original): ReactNode interactivo en sr-only
 *   atrapaba focus al teclado de forma invisible.
 * - Codex P1 post-audit: `inert` en sr-only rompía aria-describedby
 *   al excluir el subárbol del a11y tree.
 *
 * Net result: el sr-only renderiza solo string puro, sin necesidad de
 * `inert`. aria-describedby resuelve correctamente. Cero focus traps.
 *
 * Mapping:
 * - `string` / `number` → `String(node)`
 * - `boolean` / `null` / `undefined` → `""`
 * - `Array` → concat recursivo (`join("")`)
 * - `ReactElement` → recursión sobre `props.children`
 * - Otros (Portal, función, símbolo) → `""`
 *
 * **Nota M-04 (codex P2 sobre PR #89 round 2)**: la concat con `""`
 * (sin separador) es correcta porque JSX ya preserva los espacios en
 * los strings literales adyacentes a elementos. `<>Hello <b>World</b>!</>`
 * serializa children como `["Hello ", <b>"World"</b>, "!"]` — el
 * espacio entre "Hello" y "World" vive al final de "Hello ", no debe
 * añadirse. Inyectar `" "` rompe casos legítimos de tokens contiguos
 * como `["v1", ".2"]` → "v1 .2" (debería ser "v1.2") o
 * `["foo", "@", "bar.com"]` → "foo @ bar.com". El consumer es dueño
 * de los espacios; el helper solo serializa lo que React entrega.
 */
function extractText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join("");
  }
  if (isValidElement(node)) {
    const children = (node.props as { children?: ReactNode }).children;
    return extractText(children);
  }
  return "";
}
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

// M-07.2 (RC1 gate review): detección de child que no forwardea ref.
//
// Capa 1 — static analysis O(1) del children.type:
//   - string ('button', 'a', ...): DOM intrinsic → guaranteed_ok.
//   - $$typeof === REACT_FORWARD_REF_TYPE: explicit forwardRef → guaranteed_ok.
//   - $$typeof === REACT_MEMO_TYPE: recurse en .type.
//   - function: React 19 puede aceptar ref como prop → ambiguous.
//
// Las ramas guaranteed_ok no entran al safety net ni al sentinel —
// cero coste runtime para casos comunes (botones nativos, components
// con forwardRef explícito).
const REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
const REACT_MEMO_TYPE = Symbol.for("react.memo");

type RefForwardingVerdict =
  | { kind: "guaranteed_ok"; reason: "dom_intrinsic" | "forward_ref" }
  | { kind: "ambiguous" };

function analyzeChildType(type: unknown): RefForwardingVerdict {
  if (typeof type === "string") {
    return { kind: "guaranteed_ok", reason: "dom_intrinsic" };
  }
  if (type != null && typeof type === "object") {
    const $$typeof = (type as { $$typeof?: symbol }).$$typeof;
    if ($$typeof === REACT_FORWARD_REF_TYPE) {
      return { kind: "guaranteed_ok", reason: "forward_ref" };
    }
    if ($$typeof === REACT_MEMO_TYPE) {
      const inner = (type as { type?: unknown }).type;
      return analyzeChildType(inner);
    }
  }
  return { kind: "ambiguous" };
}

function getChildTypeName(type: unknown): string {
  if (typeof type === "string") return type;
  if (typeof type === "function") {
    return (
      (type as { displayName?: string }).displayName ??
      (type as { name?: string }).name ??
      "custom component"
    );
  }
  if (type != null && typeof type === "object") {
    const $$typeof = (type as { $$typeof?: symbol }).$$typeof;
    if ($$typeof === REACT_FORWARD_REF_TYPE) {
      const render = (
        type as { render?: { displayName?: string; name?: string } }
      ).render;
      if (render) {
        return render.displayName ?? render.name ?? "ForwardRef";
      }
      return "ForwardRef";
    }
    if ($$typeof === REACT_MEMO_TYPE) {
      return getChildTypeName((type as { type?: unknown }).type);
    }
  }
  return "custom component";
}

// Sentinel dev-only con display:contents para detectar intent del
// usuario (hover/focus) sin depender de que el child propague handlers.
// `display:contents` hace que el span no tenga caja propia — el child
// se comporta como si el span no estuviera para layout.
const DEV_SENTINEL_STYLE: CSSProperties = { display: "contents" };

// M-04 (RC1): los 12 placements de Floating UI. 4 sides × 3 alignments
// (base, -start, -end). Floating UI ya posiciona vía inline styles —
// la clase `ig-tooltip-place-${placement}` queda como hook informativo
// para consumers que quieran reglas CSS dirigidas (no añadimos reglas
// concretas en el DS porque rompería el contrato "vacías en CSS").
export type TooltipPlacement =
  | "top"
  | "top-start"
  | "top-end"
  | "right"
  | "right-start"
  | "right-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "left-start"
  | "left-end";

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
   * **Caso típico — Tooltip dentro de Dialog**: `<Dialog>` usa
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
   *     <Dialog ref={dialogRef} open onClose={...}>
   *       <DialogBody>
   *         <Tooltip text="Eliminar" container={dialogRef}>
   *           <Button>×</Button>
   *         </Tooltip>
   *       </DialogBody>
   *     </Dialog>
   *   );
   * }
   * ```
   *
   * Acepta `HTMLElement` directo o un `RefObject` (Floating UI
   * resuelve ambos).
   */
  container?: HTMLElement | React.RefObject<HTMLElement | null> | null;
  /**
   * Cualquier prop adicional (event handlers, `ref`, aria-*, data-*,
   * etc.) que el consumer pase a Tooltip se forwardea al elemento child
   * final via el `<Slot>` primitive (D14 Bloque C beta.27).
   *
   * Habilita el patrón **nested asChild** crítico para el refactor Slot
   * DS-wide:
   *
   * ```tsx
   * <DialogClose asChild>
   *   <Tooltip text="Cancela y cierra">
   *     <Button variant="danger">×</Button>
   *   </Tooltip>
   * </DialogClose>
   * ```
   *
   * El outer Slot de DialogClose pasa props al `<Tooltip>` (close
   * onClick, ref); Tooltip los recibe en este index signature y los
   * forwardea al `<Button>` final via su Slot interno. Resultado: el
   * click en el botón cierra el dialog Y el botón sigue siendo el
   * anchor del tooltip. Pre-D14 Bloque C: Tooltip dropeaba props del
   * outer Slot (codex P2 round 2 sobre #109).
   */
  [key: string]: unknown;
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
  ...outerSlotProps
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
  // Dialog) que estén registrados como nodos. `bubbles.escapeKey: true`
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
  // M-07.2 (RC1 gate review): detección de child que no forwardea ref
  // con un approach de 4 capas (ver `analyzeChildType` arriba).
  //
  // Capa 1: static analysis ya hecha — `verdict` decide si entramos al
  //         runtime del warn o nos saltamos todo (guaranteed_ok).
  // Capa 2: probe sticky — la pregunta no es "¿está conectado ahora?"
  //         sino "¿se ha conectado alguna vez?". Una vez true, no se
  //         resetea → cero false positives en lazy mounting.
  // Capa 3: sentinel dev-only con capture-phase handlers — disparar
  //         `evaluate()` en el momento exacto en que el dev intenta
  //         usar el tooltip (hover/focus sobre el área del child).
  // Capa 4: setTimeout 2000ms como safety net solo para el caso edge
  //         de "dev observa pero no interactúa". Honestamente generoso
  //         (cubre React.lazy + Suspense + fetch + idleCallback) y
  //         dev-only — sin coste real en consumers.
  const verdict = analyzeChildType(children.type);

  // Capa 2a — probe sticky del ref. Codex P2 follow-up: aceptar
  // solo Element DOM o el virtual element contract de FUI
  // (`getBoundingClientRect`). Rechaza imperative handles
  // (`useImperativeHandle` con objeto custom) — FUI no puede medirlos
  // y el tooltip queda igualmente roto.
  const refEverConnectedRef = useRef(false);
  const probeRef = useCallback((node: Element | null) => {
    if (node == null) return;
    const raw = node as unknown;
    if (raw instanceof Element) {
      refEverConnectedRef.current = true;
      return;
    }
    if (
      typeof raw === "object" &&
      raw !== null &&
      "getBoundingClientRect" in raw &&
      typeof (raw as { getBoundingClientRect?: unknown })
        .getBoundingClientRect === "function"
    ) {
      refEverConnectedRef.current = true;
    }
  }, []);

  // Capa 2b — handler probe. Codex P2 follow-up: child que forwardea
  // ref pero hace drop de `...rest` deja FUI sin sus handlers
  // (`onMouseEnter`/`onFocus`/etc.) — el tooltip nunca abre aunque
  // el ref esté conectado. El probe es independiente: si el sentinel
  // detecta intent del usuario pero ninguno de los handlers FUI se
  // invocó, sabemos que el child los dropeó.
  const handlersInvokedRef = useRef(false);

  const childRef = children.props.ref ?? null;
  const referenceRef = useMergeRefs([refs.setReference, probeRef, childRef]);

  const warnedNoForwardRefRef = useRef(false);
  // Source diferenciado: `"intent"` (sentinel disparó tras hover/focus,
  // los dos probes son significativos) vs `"timeout"` (safety net,
  // solo el ref probe es significativo porque no hubo events).
  const evaluateForwardRef = useCallback(
    (source: "intent" | "timeout") => {
      if (!import.meta.env.DEV) return;
      if (warnedNoForwardRefRef.current) return;
      const refConnected = refEverConnectedRef.current;
      if (source === "timeout") {
        // Sin events no podemos diagnosticar el handler-drop.
        if (refConnected) return;
        warnedNoForwardRefRef.current = true;
        console.warn(
          `[reactigoded] <Tooltip>: el child <${getChildTypeName(children.type)}> no expone su nodo DOM via ref. ` +
            `El tooltip no puede medir el trigger ni abrirse al hover/focus. ` +
            `Usa React.forwardRef (React <19) o acepta \`ref\` como prop normal (React 19+) y pásalo al elemento DOM root del componente. ` +
            `aria-describedby sigue funcionando — el SR anuncia el texto del tooltip pero el portal visual no aparece.`,
        );
        return;
      }
      // source === "intent": hover/focus capturado por sentinel → los
      // dos diagnósticos son significativos. Mensajes diferenciados.
      const handlersInvoked = handlersInvokedRef.current;
      if (refConnected && handlersInvoked) return;
      warnedNoForwardRefRef.current = true;
      const childName = getChildTypeName(children.type);
      let detail: string;
      if (!refConnected && !handlersInvoked) {
        detail =
          "no expone su nodo DOM via ref NI propaga handlers (`...rest` se ignora)";
      } else if (!refConnected) {
        detail =
          "no expone su nodo DOM via ref (handlers sí llegan al DOM, pero sin anchor el portal no puede posicionar)";
      } else {
        detail =
          "forwardea ref pero NO propaga handlers (drop de `...rest` — onMouseEnter/onFocus no llegan al DOM)";
      }
      console.warn(
        `[reactigoded] <Tooltip>: el child <${childName}> ${detail}. ` +
          `El tooltip queda inerte al hover/focus. ` +
          `Usa React.forwardRef (React <19) o acepta \`ref\` como prop normal (React 19+), y propaga \`...rest\` al elemento DOM root. ` +
          `aria-describedby sigue funcionando — el SR anuncia el texto del tooltip pero el portal visual no aparece.`,
      );
    },
    [children.type],
  );

  // Safety net 2000ms — solo se monta para casos ambiguous (function
  // components donde no podemos decidir estáticamente). El sentinel
  // capture-phase suele disparar evaluate() mucho antes (en el primer
  // hover/focus); el timer es respaldo para "dev observa pasivamente".
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (verdict.kind === "guaranteed_ok") return;
    const t = setTimeout(() => {
      evaluateForwardRef("timeout");
    }, 2000);
    return () => {
      clearTimeout(t);
    };
  }, [verdict.kind, evaluateForwardRef]);

  const shouldWrapInDevSentinel =
    import.meta.env.DEV && verdict.kind === "ambiguous";

  // Sentinel ref + listeners nativos con capture-phase real. React no
  // expone onMouseEnterCapture (mouseenter no bubblea nativamente y el
  // polyfill sintético no garantiza capture). Pasar por addEventListener
  // directo da semántica exacta: 1 fire al entrar al sentinel (no N
  // como onMouseOverCapture sintético) y captura focus también en
  // phase capture real.
  //
  // `queueMicrotask` defer: capture-phase corre ANTES que el bubble
  // donde React dispara los synthetic handlers. Si evaluáramos al
  // toque, `handlersInvokedRef` siempre estaría false (los handlers
  // FUI aún no han firado). El microtask espera al fin del tick del
  // event handling — para entonces, si el child propagó los handlers,
  // ya se invocaron y `handlersInvokedRef` es true.
  const sentinelRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (!shouldWrapInDevSentinel) return;
    const node = sentinelRef.current;
    if (!node) return;
    const handler = () => {
      queueMicrotask(() => {
        evaluateForwardRef("intent");
      });
    };
    node.addEventListener("mouseenter", handler, { capture: true });
    node.addEventListener("focus", handler, { capture: true });
    return () => {
      node.removeEventListener("mouseenter", handler, { capture: true });
      node.removeEventListener("focus", handler, { capture: true });
    };
  }, [shouldWrapInDevSentinel, evaluateForwardRef]);

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

  // Capa 2b — wrap dev-only de onMouseEnter/onFocus para detectar si
  // el child propagó los handlers FUI al DOM. Si el child hace drop
  // de `...rest` (modo 2 de fallo), estos wraps no se llaman y
  // `handlersInvokedRef` queda false → warn diferenciado.
  let cloneProps: Record<string, unknown> = {
    ...referenceProps,
    ref: referenceRef,
    "aria-describedby": combined,
  };
  if (import.meta.env.DEV && verdict.kind === "ambiguous") {
    const origMouseEnter = referenceProps.onMouseEnter as
      | ((e: unknown) => void)
      | undefined;
    const origFocus = referenceProps.onFocus as
      | ((e: unknown) => void)
      | undefined;
    cloneProps = {
      ...cloneProps,
      onMouseEnter: (e: unknown) => {
        handlersInvokedRef.current = true;
        origMouseEnter?.(e);
      },
      onFocus: (e: unknown) => {
        handlersInvokedRef.current = true;
        origFocus?.(e);
      },
    };
  }
  const child = cloneElement(children, cloneProps);

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
  // dentro de un Dialog (<dialog>.showModal() crea top-layer); sin
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

  // D14 Bloque C beta.27: forward outer Slot props al child final via
  // Slot primitive. Habilita el patrón nested asChild (edge case #6
  // de D14):
  //   <DialogClose asChild>
  //     <Tooltip text="...">
  //       <Button>X</Button>
  //     </Tooltip>
  //   </DialogClose>
  //
  // DialogClose's outer Slot clona Tooltip pasando close-onClick + ref.
  // Tooltip recibe esos props en `outerSlotProps` (...rest del
  // destructure) y los forwardea al child clonado via Slot interno.
  // Resultado: el click en Button cierra el dialog Y el Button es el
  // anchor del tooltip.
  //
  // Si `outerSlotProps` está vacío (uso normal de Tooltip sin outer
  // wrapper), evitamos el Slot wrapper para no añadir trabajo
  // redundante — el cloned `child` ya tiene todos los props mergeados
  // por la propia cloneElement de Tooltip.
  const hasOuterProps = Object.keys(outerSlotProps).length > 0;
  const slottedChild = hasOuterProps ? (
    <Slot {...outerSlotProps}>{child}</Slot>
  ) : (
    child
  );

  // M-07.2 Capa 3: sentinel dev-only para casos ambiguous. Wrappea el
  // child con un <span style="display:contents"> que escucha hover y
  // focus en CAPTURE phase. Capture corre top-down (window → ancestros
  // → target), por lo que el sentinel recibe el evento ANTES que el
  // child — funciona incluso si el child no propaga handlers (modo 2
  // de fallo: ignora ...rest props). `display:contents` hace que el
  // span no tenga caja propia — cero impacto en layout. Sólo se monta
  // en dev y solo para function components (children de DOM intrinsic
  // y forwardRef no entran aquí, cero coste runtime).
  //
  // El sentinel siempre vive POR FUERA del Slot (decoración dev, no
  // afecta props del child final). Slot ya hizo su trabajo mergeando
  // outerSlotProps con child.props.
  const childOrSentinel = shouldWrapInDevSentinel ? (
    <span ref={sentinelRef} style={DEV_SENTINEL_STYLE}>
      {slottedChild}
    </span>
  ) : (
    slottedChild
  );

  return (
    <>
      {childOrSentinel}
      {/* Codex P1 post-audit sobre PR #52: el sr-only contiene SOLO
          string plano extraído del ReactNode `text`. Esta solución
          resuelve simultáneamente:
            (a) el codex P1 original sobre #52 — ReactNode interactivo
                aquí atrapaba focus invisible al teclado, y
            (b) el codex P1 post-audit — `inert` en sr-only rompía
                aria-describedby al excluir del a11y tree.
          Net: sin focusables posibles → no se necesita `inert`. El
          aria-describedby resuelve a string puro (lo que el SR debe
          anunciar). El portal flotante sí renderiza el ReactNode
          completo y mantiene `inert` por separado (decoración visual). */}
      <span id={tooltipId} role="tooltip" className="ig-sr-only">
        {extractText(text)}
      </span>
      {nodeId === undefined ? (
        portal
      ) : (
        <FloatingNode id={nodeId}>{portal}</FloatingNode>
      )}
    </>
  );
}
