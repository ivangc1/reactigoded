import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Badge = forwardRef(function Badge(
  {
    variant,
    size,
    pill = false,
    dot = false,
    outline = false,
    className = '',
    children,
    ...props
  },
  ref
) {
  const classes = [
    'ig-badge',
    variant && `ig-badge-${variant}`,
    size && `ig-badge-${size}`,
    pill && 'ig-badge-pill',
    dot && 'ig-badge-dot',
    outline && 'ig-badge-outline',
    className
  ].filter(Boolean).join(' ');

  return (
    <span ref={ref} className={classes} {...props}>
      {!dot && children}
    </span>
  );
});

Badge.propTypes = {
  variant: PropTypes.oneOf([
    'brand', 'secondary', 'success', 'warning', 'danger', 'info'
  ]),
  size: PropTypes.oneOf(['sm', 'lg']),
  pill: PropTypes.bool,
  dot: PropTypes.bool,
  outline: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};
