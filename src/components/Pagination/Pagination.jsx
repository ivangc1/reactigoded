import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Pagination = forwardRef(function Pagination(
  { className = '', children, ...props },
  ref
) {
  return (
    <nav ref={ref} className={`ig-pagination ${className}`.trim()} aria-label="Pagination" {...props}>
      {children}
    </nav>
  );
});

Pagination.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

export const PaginationItem = forwardRef(function PaginationItem(
  {
    active = false,
    disabled = false,
    prev = false,
    next = false,
    className = '',
    children,
    ...props
  },
  ref
) {
  const classes = [
    'ig-pagination-item',
    active && 'ig-pagination-active',
    disabled && 'disabled',
    prev && 'ig-pagination-prev',
    next && 'ig-pagination-next',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      type="button"
      className={classes}
      disabled={disabled}
      aria-current={active ? 'page' : undefined}
      {...props}
    >
      {children}
    </button>
  );
});

PaginationItem.propTypes = {
  active: PropTypes.bool,
  disabled: PropTypes.bool,
  prev: PropTypes.bool,
  next: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};

export const PaginationEllipsis = forwardRef(function PaginationEllipsis(
  { className = '', ...props },
  ref
) {
  return (
    <span ref={ref} className={`ig-pagination-ellipsis ${className}`.trim()} {...props}>
      ...
    </span>
  );
});

PaginationEllipsis.propTypes = {
  className: PropTypes.string,
};
