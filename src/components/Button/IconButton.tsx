import type { ReactNode, Ref } from "react";
import { Button, type ButtonProps } from "./Button";

/**
 * Props del IconButton: hereda todo de `Button` excepto `icon`
 * (forzado a `true` por el componente) y exige `aria-label` como
 * required vía TS.
 */
export interface IconButtonProps
  extends Omit<ButtonProps, "icon" | "aria-label"> {
  /**
   * Etiqueta accesible obligatoria. Como el botón solo contiene un
   * icono, los lectores de pantalla necesitan este texto para
   * anunciar la acción.
   *
   * El typing es intencionalmente required: TS impide montar un
   * `<IconButton>` sin `aria-label` en compile-time, sin necesidad
   * de un dev warn runtime.
   */
  "aria-label": string;
  /** Icono visual (svg, span con emoji, glyph, etc.). */
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * IconButton — botón solo-icono accesible. Sub-componente de Button
 * con `icon=true` enforced y `aria-label` como prop required vía TS.
 *
 * Cuando un Button contiene solo un icono (sin texto visible para
 * lectores de pantalla), el `aria-label` es obligatorio por
 * accesibilidad. Olvidarlo es un error frecuente que axe captura solo
 * en runtime; este sub-componente lo eleva a error de compilación.
 *
 * Hereda todo el resto de `ButtonProps` (variant, appearance, size,
 * loading, block, disabled). El consumer no puede pasar `icon={false}`
 * por la firma `Omit<ButtonProps, "icon">`.
 *
 * @example
 * <IconButton aria-label="Favorito" variant="brand">★</IconButton>
 * <IconButton aria-label="Cerrar" appearance="ghost" size="sm">×</IconButton>
 * <IconButton aria-label="Editar" variant="info" loading>
 *   <PencilIcon />
 * </IconButton>
 *
 * @example // ✗ TS error: aria-label is required
 * <IconButton variant="brand">★</IconButton>
  *
 * @server-safe
 */
export function IconButton({ children, ref, ...rest }: IconButtonProps) {
  // exactOptionalPropertyTypes: pasar `ref` solo si está definido
  // para evitar `Ref<HTMLButtonElement> | undefined` ↛ `Ref<HTMLButtonElement>`.
  return ref !== undefined ? (
    <Button icon {...rest} ref={ref}>
      {children}
    </Button>
  ) : (
    <Button icon {...rest}>
      {children}
    </Button>
  );
}
