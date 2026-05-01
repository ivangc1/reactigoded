import { useEffect, useId, type HTMLAttributes, type Ref } from "react";
import { cn } from "@/utils/cn";
import { useModalContextOptional } from "./ModalContext";

export interface ModalHeaderProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/**
 * ModalHeader — cabecera del modal. Suele contener título + `ModalClose`.
 *
 * Genera un `id` único y lo registra en el `Modal` padre, que lo aplica como
 * `aria-labelledby` para que los lectores de pantalla anuncien el título.
 * Si el consumer pasa `id` propio, ese tiene prioridad. Si pasa
 * `aria-labelledby` directamente al `Modal`, ese gana sobre el del header.
 */
export function ModalHeader({
  className,
  children,
  id: idProp,
  ref,
  ...rest
}: ModalHeaderProps) {
  const fallbackId = useId();
  const id = idProp ?? fallbackId;
  const ctx = useModalContextOptional();
  const setHeaderId = ctx?.setHeaderId;

  useEffect(() => {
    if (!setHeaderId) return;
    setHeaderId(id);
    return () => {
      setHeaderId(null);
    };
  }, [id, setHeaderId]);

  return (
    <div
      ref={ref}
      id={id}
      className={cn("ig-dialog-header", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
