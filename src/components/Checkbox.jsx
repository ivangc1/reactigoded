import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Checkbox = forwardRef(function Checkbox(
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
    <label className={`ig-checkbox ${className}`.trim()}>
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        {...props}
      />
      <span className="ig-checkbox-mark"></span>
      {children}
    </label>
  );
});

Checkbox.propTypes = {
  checked: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};
