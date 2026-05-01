import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
export type AvatarStatus = "online" | "offline" | "busy" | "away";

const STATUS_LABEL_ES: Record<AvatarStatus, string> = {
  online: "en línea",
  offline: "sin conexión",
  busy: "ocupado",
  away: "ausente",
};

interface AvatarBase extends HTMLAttributes<HTMLDivElement> {
  size?: AvatarSize;
  /** Cuadrado (default) → con bordes ligeramente redondeados; `rounded` lo hace círculo. */
  rounded?: boolean;
  /** Punto de estado en la esquina inferior derecha. */
  status?: AvatarStatus;
  /** Texto accesible para el contenedor (lo marca como role="img"). */
  ariaLabel?: string;
  ref?: Ref<HTMLDivElement>;
}

interface AvatarImage extends AvatarBase {
  src: string;
  alt: string;
  initials?: never;
}

interface AvatarInitials extends AvatarBase {
  src?: never;
  alt?: never;
  initials: string;
}

export type AvatarProps = AvatarImage | AvatarInitials;

/**
 * Avatar — imagen de usuario o iniciales.
 *
 * Pasa `src` + `alt` para imagen, o `initials` para fallback de texto.
 * `status` añade un punto de estado (`online`, `offline`, `busy`, `away`).
 */
export function Avatar(props: AvatarProps) {
  const {
    size,
    rounded = false,
    status,
    className,
    ariaLabel,
    ref,
    src,
    alt,
    initials,
    ...divProps
  } = props as AvatarBase & {
    src?: string;
    alt?: string;
    initials?: string;
  };

  return (
    <div
      ref={ref}
      className={cn(
        "ig-avatar",
        size && `ig-avatar-${size}`,
        rounded && "ig-avatar-rounded",
        className,
      )}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      {...divProps}
    >
      {src ? (
        <img src={src} alt={alt} />
      ) : initials ? (
        <span aria-hidden="true">{initials}</span>
      ) : null}
      {status && (
        <span
          role="img"
          className={`ig-avatar-status ig-avatar-status-${status}`}
          aria-label={`Estado: ${STATUS_LABEL_ES[status]}`}
        />
      )}
    </div>
  );
}
