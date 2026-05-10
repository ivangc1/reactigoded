import type { HTMLAttributes, Ref } from "react";
import { useState } from "react";
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
  /**
   * Override del `aria-label` del punto de estado, para i18n. Si no se
   * pasa, se usa "Estado: {label en español}". Pasa la traducción
   * completa, no solo la palabra de estado.
   */
  statusLabel?: string;
  ref?: Ref<HTMLDivElement>;
}

interface AvatarImage extends AvatarBase {
  src: string;
  alt: string;
  /**
   * Fallback opcional de iniciales si la imagen falla al cargar
   * (M-10 gate review). Si la `<img>` dispara `error`, se renderizan
   * estas iniciales en su lugar y se preserva la a11y. Sin `initials`
   * el avatar queda vacío al fallar — el consumer es responsable de
   * dar fallback explícito.
   */
  initials?: string;
  /**
   * Estrategia de carga del `<img>`. Por defecto `"lazy"` para no
   * bloquear el LCP cuando el avatar está fuera del viewport (M-10).
   * Pasa `"eager"` si el avatar es above-the-fold y crítico para LCP.
   */
  loading?: "lazy" | "eager";
}

interface AvatarInitials extends AvatarBase {
  src?: never;
  alt?: never;
  initials: string;
  loading?: never;
}

export type AvatarProps = AvatarImage | AvatarInitials;

/**
 * Avatar — imagen de usuario o iniciales.
 *
 * Pasa `src` + `alt` para imagen, o `initials` para fallback de texto.
 * `status` añade un punto de estado (`online`, `offline`, `busy`, `away`).
 *
 * **M-10 (gate review)**: si pasas `src` Y `initials`, las iniciales
 * actúan como fallback automático cuando la imagen falla a cargar
 * (`onError` del `<img>`). Por defecto las imágenes cargan con
 * `loading="lazy"`; pasa `loading="eager"` para avatares
 * above-the-fold críticos para LCP.
 *
 * @example // imagen con fallback automático a iniciales
 * <Avatar src="/avatar.jpg" alt="Iván" initials="IV" />
 *
 * @example // solo iniciales
 * <Avatar initials="IV" />
 */
export function Avatar(props: AvatarProps) {
  const {
    size,
    rounded = false,
    status,
    statusLabel,
    className,
    ref,
    src,
    alt,
    initials,
    loading = "lazy",
    "aria-label": ariaLabel,
    ...divProps
  } = props as AvatarBase & {
    src?: string;
    alt?: string;
    initials?: string;
    loading?: "lazy" | "eager";
    "aria-label"?: string;
  };

  // M-10: track del estado de carga de la <img>. Si dispara `error` y
  // hay `initials`, mostramos las iniciales en lugar de un avatar
  // roto (icon de imagen rota del browser). Sin `initials` no hay
  // nada que mostrar — la <img> queda desmontada, decisión del
  // consumer.
  //
  // Codex P1 sobre PR #36: el flag `imgFailed` debe resetearse
  // cuando cambia `src` (regresión para avatars dinámicos: TableRow
  // reusada con distintos usuarios, retry tras network fail). Patrón
  // canónico React docs "Resetting all state when a prop changes":
  // tracking del prop previo en state + reset durante render. NO
  // useEffect (regla `react-hooks/set-state-in-effect` lo prohíbe).
  // https://react.dev/learn/you-might-not-need-an-effect#resetting-all-state-when-a-prop-changes
  const [imgFailed, setImgFailed] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setImgFailed(false);
  }
  const showInitials =
    !src || imgFailed
      ? Boolean(initials)
      : false;
  const showImg = src && !imgFailed;

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
      {showImg && (
        <img
          src={src}
          alt={alt}
          loading={loading}
          onError={() => {
            setImgFailed(true);
          }}
        />
      )}
      {showInitials && <span aria-hidden="true">{initials}</span>}
      {status && (
        <span
          role="img"
          className={`ig-avatar-status ig-avatar-status-${status}`}
          aria-label={statusLabel ?? `Estado: ${STATUS_LABEL_ES[status]}`}
        />
      )}
    </div>
  );
}
