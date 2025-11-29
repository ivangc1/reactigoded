import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Navbar = forwardRef(function Navbar(
  {
    sticky = false,
    fixed = false,
    glass = false,
    className = '',
    children,
    ...props
  },
  ref
) {
  const classes = [
    'ig-navbar',
    sticky && 'ig-navbar-sticky',
    fixed && 'ig-navbar-fixed',
    glass && 'ig-navbar-glass',
    className
  ].filter(Boolean).join(' ');

  return (
    <header ref={ref} className={classes} {...props}>
      {children}
    </header>
  );
});

Navbar.propTypes = {
  sticky: PropTypes.bool,
  fixed: PropTypes.bool,
  glass: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};

export const NavbarBrand = forwardRef(function NavbarBrand(
  { href, className = '', children, ...props },
  ref
) {
  const Tag = href ? 'a' : 'div';

  return (
    <Tag
      ref={ref}
      href={href}
      className={`ig-navbar-brand ${className}`.trim()}
      {...props}
    >
      {children}
    </Tag>
  );
});

NavbarBrand.propTypes = {
  href: PropTypes.string,
  className: PropTypes.string,
  children: PropTypes.node,
};

export const NavbarNav = forwardRef(function NavbarNav(
  { className = '', children, ...props },
  ref
) {
  return (
    <nav ref={ref} className={`ig-navbar-nav ${className}`.trim()} {...props}>
      {children}
    </nav>
  );
});

NavbarNav.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

export const NavbarLink = forwardRef(function NavbarLink(
  {
    href = '#',
    active = false,
    className = '',
    children,
    ...props
  },
  ref
) {
  const classes = [
    'ig-navbar-link',
    active && 'ig-navbar-link-active',
    className
  ].filter(Boolean).join(' ');

  return (
    <a ref={ref} href={href} className={classes} {...props}>
      {children}
    </a>
  );
});

NavbarLink.propTypes = {
  href: PropTypes.string,
  active: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};

export const NavbarActions = forwardRef(function NavbarActions(
  { className = '', children, ...props },
  ref
) {
  return (
    <div ref={ref} className={`ig-navbar-actions ${className}`.trim()} {...props}>
      {children}
    </div>
  );
});

NavbarActions.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};
