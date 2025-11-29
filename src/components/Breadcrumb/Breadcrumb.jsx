import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Breadcrumb = forwardRef(function Breadcrumb(
  { separator = '/', className = '', children, ...props },
  ref
) {
  const items = Array.isArray(children) ? children : [children];

  return (
    <nav ref={ref} className={`ig-breadcrumb ${className}`.trim()} aria-label="Breadcrumb" {...props}>
      {items.map((child, index) => (
        <span key={index}>
          {child}
          {index < items.length - 1 && (
            <span className="ig-breadcrumb-separator">{separator}</span>
          )}
        </span>
      ))}
    </nav>
  );
});

Breadcrumb.propTypes = {
  separator: PropTypes.node,
  className: PropTypes.string,
  children: PropTypes.node,
};

export const BreadcrumbItem = forwardRef(function BreadcrumbItem(
  {
    href,
    current = false,
    className = '',
    children,
    ...props
  },
  ref
) {
  const classes = [
    'ig-breadcrumb-item',
    current && 'ig-breadcrumb-current',
    className
  ].filter(Boolean).join(' ');

  if (current || !href) {
    return (
      <span ref={ref} className={classes} aria-current={current ? 'page' : undefined} {...props}>
        {children}
      </span>
    );
  }

  return (
    <a ref={ref} href={href} className={classes} {...props}>
      {children}
    </a>
  );
});

BreadcrumbItem.propTypes = {
  href: PropTypes.string,
  current: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};
