import type {
  AnchorHTMLAttributes,
  HTMLAttributes,
  Ref,
} from "react";
import { cn } from "@/utils/cn";

type BreadcrumbItemAsCurrent = HTMLAttributes<HTMLSpanElement> & {
  /** Marca este item como la página actual (renderiza `<span aria-current="page">`). */
  current: true;
  href?: never;
  ref?: Ref<HTMLSpanElement>;
};

type BreadcrumbItemAsLink = AnchorHTMLAttributes<HTMLAnchorElement> & {
  current?: false;
  ref?: Ref<HTMLAnchorElement>;
};

export type BreadcrumbItemProps = BreadcrumbItemAsCurrent | BreadcrumbItemAsLink;

/**
 * BreadcrumbItem — un item de un `Breadcrumb`. Si `current=true`, se
 * renderiza como `<span>` con `aria-current="page"` (no clickable). En caso
 * contrario es un `<a>` con todos los atributos de anchor.
  *
 * @server-safe
 */
export function BreadcrumbItem(props: BreadcrumbItemProps) {
  if (props.current) {
    const { current: _c, className, children, ref, ...rest } = props;
    void _c;
    return (
      <span
        {...rest}
        ref={ref}
        aria-current="page"
        className={cn("ig-breadcrumb-current", className)}
      >
        {children}
      </span>
    );
  }

  const { current: _c, className, children, ref, ...rest } = props;
  void _c;
  return (
    <a
      {...rest}
      ref={ref}
      className={cn("ig-breadcrumb-item", className)}
    >
      {children}
    </a>
  );
}
