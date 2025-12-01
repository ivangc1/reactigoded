import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Progress = forwardRef(function Progress(
  {
    value = 0,
    variant,
    size,
    indeterminate = false,
    className = '',
    ...props
  },
  ref
) {
  const classes = [
    'ig-progress',
    variant && `ig-progress-${variant}`,
    size && `ig-progress-${size}`,
    indeterminate && 'ig-progress-indeterminate',
    className
  ].filter(Boolean).join(' ');

  const barStyle = indeterminate ? {} : { width: `${Math.min(100, Math.max(0, value))}%` };

  return (
    <div
      ref={ref}
      className={classes}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : value}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div className="ig-progress-bar" style={barStyle} />
    </div>
  );
});

Progress.propTypes = {
  value: PropTypes.number,
  variant: PropTypes.oneOf(['brand', 'secondary', 'success', 'warning', 'danger', 'info']),
  size: PropTypes.oneOf(['sm', 'lg']),
  indeterminate: PropTypes.bool,
  className: PropTypes.string,
};
