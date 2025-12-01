import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Switch = forwardRef(function Switch(
  {
    checked,
    disabled = false,
    variant = 'brand',
    className = '',
    children,
    ...props
  },
  ref
) {
  const classes = [
    'ig-switch',
    `ig-switch-${variant}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <label className={classes}>
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        {...props}
      />
      <span className="ig-switch-track"></span>
      {children && <span>{children}</span>}
    </label>
  );
});

Switch.propTypes = {
  checked: PropTypes.bool,
  disabled: PropTypes.bool,
  variant: PropTypes.oneOf(['brand', 'secondary', 'success', 'warning', 'danger', 'info']),
  className: PropTypes.string,
  children: PropTypes.node,
};
