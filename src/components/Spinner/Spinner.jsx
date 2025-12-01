import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Spinner = forwardRef(function Spinner(
  { size, variant, className = '', ...props },
  ref
) {
  const classes = [
    'ig-spinner',
    size && `ig-spinner-${size}`,
    variant && `ig-spinner-${variant}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={ref}
      className={classes}
      role="status"
      aria-label="Loading"
      {...props}
    />
  );
});

Spinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'lg', 'xl']),
  variant: PropTypes.oneOf(['brand', 'secondary', 'success', 'warning', 'danger', 'info']),
  className: PropTypes.string,
};
