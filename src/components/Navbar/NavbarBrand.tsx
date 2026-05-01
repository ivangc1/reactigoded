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
    const { className, ref, ...rest } = props;
    return (
      // `children` viaja vía `...rest`. jsx-a11y no detecta JSX self-closing
      // con spread; el consumer SIEMPRE pasa contenido en este compound.
      // eslint-disable-next-line jsx-a11y/anchor-has-content
      <a
        ref={ref}
        className={cn("ig-navbar-brand", className)}
        {...rest}
      />
    );
  }
  const { className, ref, ...rest } = props;
  return (
    <div
      ref={ref}
      className={cn("ig-navbar-brand", className)}
      {...rest}
    />
  );
}
