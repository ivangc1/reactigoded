import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Radio = forwardRef(function Radio(
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
    <label className={`ig-radio ${className}`.trim()}>
      <input
        ref={ref}
        type="radio"
        checked={checked}
        disabled={disabled}
        {...props}
      />
      <span className="ig-radio-mark"></span>
      {children}
    </label>
  );
});

Radio.propTypes = {
  checked: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};
