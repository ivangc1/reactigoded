import {
  type AnchorHTMLAttributes,
  type HTMLAttributes,
  type Ref,
} from "react";
import { cn } from "@/utils/cn";

type CommonProps = {
  className?: string;
};

type AsAnchor = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    /** Si se proporciona `href`, se renderiza como `<a>`. */
    href: string;
    ref?: Ref<HTMLAnchorElement>;
  };

type AsDiv = CommonProps &
  HTMLAttributes<HTMLDivElement> & {
    href?: undefined;
    ref?: Ref<HTMLDivElement>;
  };

export type NavbarBrandProps = AsAnchor | AsDiv;

/**
 * NavbarBrand — área del logo y nombre. Por defecto es `<div>`; si se pasa
 * `href` se renderiza como `<a>` (clicable).
 */
export function NavbarBrand(props: NavbarBrandProps) {
  if (props.href !== undefined) {
    const { className, ref, children, ...rest } = props;
    return (
      <a ref={ref} className={cn("ig-navbar-brand", className)} {...rest}>
        {children}
      </a>
    );
  }
  const { className, ref, children, ...rest } = props;
  return (
    <div ref={ref} className={cn("ig-navbar-brand", className)} {...rest}>
      {children}
    </div>
  );
}
