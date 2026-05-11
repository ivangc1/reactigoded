import { useEffect, useId, type HTMLAttributes, type Ref } from "react";
import { cn } from "@/utils/cn";
import { useDialogContextOptional } from "./DialogContext";

export interface DialogHeaderProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/**
 * DialogHeader — cabecera del modal. Suele contener título + `DialogClose`.
 *
 * Genera un `id` único y lo registra en el `Dialog` padre, que lo aplica como
 * `aria-labelledby` para que los lectores de pantalla anuncien el título.
 * Si el consumer pasa `id` propio, ese tiene prioridad. Si pasa
 * `aria-labelledby` directamente al `Dialog`, ese gana sobre el del header.
 */
export function DialogHeader({
  className,
  children,
  id: idProp,
  ref,
  ...rest
}: DialogHeaderProps) {
  const fallbackId = useId();
  const id = idProp ?? fallbackId;
  const ctx = useDialogContextOptional();
  const setHeaderId = ctx?.setHeaderId;
  const currentHeaderId = ctx?.headerId;

  useEffect(() => {
    if (!setHeaderId) return;
    if (
      import.meta.env.DEV &&
      currentHeaderId &&
      currentHeaderId !== id
    ) {
      console.warn(
        "[reactigoded] <Dialog> tiene más de un <DialogHeader>. Solo uno puede registrar aria-labelledby a la vez; el último monta gana y los anteriores quedan huérfanos. Asegúrate de tener un único header por Dialog.",
      );
    }
    setHeaderId(id);
    return () => {
      setHeaderId(null);
    };
    // currentHeaderId se lee solo en mount para detectar duplicados;
    // re-correr el effect en cada cambio de headerId provocaría
    // bucles cuando hay un único header (el setHeaderId de este
    // mismo header lo cambia).
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
