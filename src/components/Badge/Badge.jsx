import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Badge = forwardRef(function Badge(
  {
    variant,
    size,
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
    'primary', 'accent', 'tellus', 'liminal', 'senum', 'vesper',
    'success', 'warning', 'danger', 'info'
  ]),
  size: PropTypes.oneOf(['sm', 'lg']),
  dot: PropTypes.bool,
  outline: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};
