import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Sidebar = forwardRef(function Sidebar(
  {
    collapsed = false,
    className = '',
    children,
    ...props
  },
  ref
) {
  const classes = [
    'ig-sidebar',
    collapsed && 'ig-sidebar-collapsed',
    className
  ].filter(Boolean).join(' ');

  return (
    <aside ref={ref} className={classes} {...props}>
      {children}
    </aside>
  );
});

Sidebar.propTypes = {
  collapsed: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};

export const SidebarHeader = forwardRef(function SidebarHeader(
  { className = '', children, ...props },
  ref
) {
  return (
    <div ref={ref} className={`ig-sidebar-header ${className}`.trim()} {...props}>
      {children}
    </div>
  );
});

SidebarHeader.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

export const SidebarNav = forwardRef(function SidebarNav(
  { className = '', children, ...props },
  ref
) {
  return (
    <nav ref={ref} className={`ig-sidebar-nav ${className}`.trim()} {...props}>
      {children}
    </nav>
  );
});

SidebarNav.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

export const SidebarItem = forwardRef(function SidebarItem(
  {
    href,
    active = false,
    icon,
    className = '',
    children,
    ...props
  },
  ref
) {
  const classes = [
    'ig-sidebar-item',
    active && 'ig-sidebar-item-active',
    className
  ].filter(Boolean).join(' ');

  const Tag = href ? 'a' : 'button';

  return (
    <Tag
      ref={ref}
      href={href}
      type={href ? undefined : 'button'}
      className={classes}
      {...props}
    >
      {icon && <span className="ig-sidebar-icon">{icon}</span>}
      <span className="ig-sidebar-text">{children}</span>
    </Tag>
  );
});

SidebarItem.propTypes = {
  href: PropTypes.string,
  active: PropTypes.bool,
  icon: PropTypes.node,
  className: PropTypes.string,
  children: PropTypes.node,
};

export const SidebarFooter = forwardRef(function SidebarFooter(
  { className = '', children, ...props },
  ref
) {
  return (
    <div ref={ref} className={`ig-sidebar-footer ${className}`.trim()} {...props}>
      {children}
    </div>
  );
});

SidebarFooter.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

export const SidebarSection = forwardRef(function SidebarSection(
  { className = '', children, ...props },
  ref
) {
  return (
    <div ref={ref} className={`ig-sidebar-section ${className}`.trim()} {...props}>
      {children}
    </div>
  );
});

SidebarSection.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

export const SidebarDivider = forwardRef(function SidebarDivider(
  { className = '', ...props },
  ref
) {
  return (
    <div ref={ref} className={`ig-sidebar-divider ${className}`.trim()} {...props} />
  );
});

SidebarDivider.propTypes = {
  className: PropTypes.string,
};
