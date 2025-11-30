import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Select = forwardRef(function Select(
  {
    error = false,
    success = false,
    className = '',
    children,
    ...props
  },
  ref
) {
  const classes = [
    'ig-select',
    error && 'ig-input-error',
    success && 'ig-input-success',
    className
  ].filter(Boolean).join(' ');

  return (
    <select ref={ref} className={classes} {...props}>
      {children}
    </select>
  );
});

Select.propTypes = {
  error: PropTypes.bool,
  success: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};
