import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size,
    loading = false,
    block = false,
    icon = false,
    disabled,
    className = '',
    children,
    ...props
  },
  ref
) {
  const classes = [
    'ig-btn',
    `ig-btn-${variant}`,
    size && `ig-btn-${size}`,
    loading && 'ig-btn-loading',
    block && 'ig-btn-block',
    icon && 'ig-btn-icon',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {children}
    </button>
  );
});

Button.propTypes = {
  variant: PropTypes.oneOf([
    'primary', 'accent', 'tellus', 'liminal', 'senum', 'vesper',
    'outline', 'ghost', 'link', 'success', 'warning', 'danger'
  ]),
  size: PropTypes.oneOf(['xs', 'sm', 'lg', 'xl']),
  loading: PropTypes.bool,
  block: PropTypes.bool,
  icon: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};
