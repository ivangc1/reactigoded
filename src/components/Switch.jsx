import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Switch = forwardRef(function Switch(
  {
    checked,
    disabled = false,
    className = '',
    children,
    ...props
  },
  ref
) {
  return (
    <label className={`ig-switch ${className}`.trim()}>
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
  className: PropTypes.string,
  children: PropTypes.node,
};
