"use client";

import {
  useCallback,
  useId,
  useMemo,
  type HTMLAttributes,
  type Ref,
} from "react";
import { cn } from "@/utils/cn";
import { useControllableState } from "@/hooks/useControllableState";
import { AccordionContext } from "./AccordionContext";

type SingleProps = {
  /** Modo: solo un item abierto a la vez. */
  type?: "single";
  /** Item abierto (modo controlado). */
  value?: string | null;
  /** Item inicial abierto (modo no controlado). */
  defaultValue?: string | null;
  /** Callback al cambiar el item abierto. */
  onValueChange?: (value: string | null) => void;
  /**
   * Si `true`, permite cerrar el único item abierto pulsándolo de nuevo.
   * En `false` (por defecto en single) siempre hay un item abierto.
   */
  collapsible?: boolean;
};

type MultipleProps = {
  /** Modo: cualquier número de items abiertos. */
  type: "multiple";
  /** Items abiertos (modo controlado). */
  value?: string[];
  /** Items iniciales abiertos (modo no controlado). */
  defaultValue?: string[];
  /** Callback al cambiar la lista de items abiertos. */
  onValueChange?: (value: string[]) => void;
  collapsible?: never;
};

export type AccordionProps = (SingleProps | MultipleProps) &
  Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> & {
    ref?: Ref<HTMLDivElement>;
  };

/**
 * Accordion — secciones colapsables.
 *
 * Compón con `AccordionItem` (envuelve `AccordionHeader` y `AccordionContent`).
 * Modo `"single"` (default): un único item abierto a la vez; `collapsible`
 * permite cerrarlo. Modo `"multiple"`: cualquier número.
 *
 * Soporta controlled (`value`+`onValueChange`) y uncontrolled (`defaultValue`).
 *
 * @example
 * <Accordion type="single" defaultValue="a" collapsible>
 *   <AccordionItem value="a">
 *     <AccordionHeader>Pregunta 1</AccordionHeader>
 *     <AccordionContent>Respuesta 1</AccordionContent>
 *   </AccordionItem>
 * </Accordion>
 */
export function Accordion(props: AccordionProps) {
  const baseId = useId();
  if (props.type === "multiple") {
    const { type: _t, ...rest } = props;
    void _t;
    return <AccordionMultiple {...rest} baseId={baseId} />;
  }
  const { type: _t, ...rest } = props;
  void _t;
  return <AccordionSingle {...rest} baseId={baseId} />;
}

type BaseProps = Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> & {
  ref?: Ref<HTMLDivElement>;
};

function AccordionSingle({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  collapsible = false,
  className,
  children,
  baseId,
  ref,
  ...rest
}: Omit<SingleProps, "type"> & BaseProps & { baseId: string }) {
  const { value: open, setValue: setOpen } = useControllableState<string | null>({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });

  const isOpen = useCallback((v: string) => open === v, [open]);
  const toggle = useCallback(
    (v: string) => {
      if (open === v) {
        if (collapsible) setOpen(null);
        return;
      }
      setOpen(v);
    },
    [open, collapsible, setOpen],
  );

  const ctx = useMemo(() => ({ isOpen, toggle, baseId }), [isOpen, toggle, baseId]);

  return (
    <AccordionContext.Provider value={ctx}>
      <div ref={ref} className={cn("ig-accordion", className)} {...rest}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

function AccordionMultiple({
  value: valueProp,
  defaultValue = [],
  onValueChange,
  className,
  children,
  baseId,
  ref,
  ...rest
}: Omit<MultipleProps, "type"> & BaseProps & { baseId: string }) {
  const { value: open, setValue: setOpen } = useControllableState<string[]>({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });

  const isOpen = useCallback((v: string) => open.includes(v), [open]);
  const toggle = useCallback(
    (v: string) => {
      if (open.includes(v)) {
        setOpen(open.filter((x) => x !== v));
      } else {
        setOpen([...open, v]);
      }
    },
    [open, setOpen],
  );

  const ctx = useMemo(() => ({ isOpen, toggle, baseId }), [isOpen, toggle, baseId]);

  return (
    <AccordionContext.Provider value={ctx}>
      <div ref={ref} className={cn("ig-accordion", className)} {...rest}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}
