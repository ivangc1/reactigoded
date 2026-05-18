import type { ImgHTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface CardImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Si la imagen va en la parte superior de la card (esquinas top redondeadas). */
  top?: boolean;
  /** Texto alternativo obligatorio para a11y. */
  alt: string;
  ref?: Ref<HTMLImageElement>;
}

/**
 * CardImage — imagen integrada en una `Card`. Con `top=true` se renderiza
 * pegada al borde superior con esquinas redondeadas a juego.
  *
 * @server-safe
 */
export function CardImage({
  top = false,
  alt,
  className,
  ref,
  ...rest
}: CardImageProps) {
  return (
    <img
      ref={ref}
      alt={alt}
      className={cn(top ? "ig-card-image-top" : "ig-card-image", className)}
      {...rest}
    />
  );
}
