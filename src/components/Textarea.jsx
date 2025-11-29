import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Textarea = forwardRef(function Textarea(
  {
    auto = false,
    error = false,
    success = false,
    className = '',
    ...props
  },
  ref
) {
  const baseClass = auto ? 'ig-textarea-auto' : 'ig-textarea';
  const classes = [
    baseClass,
    error && 'ig-input-error',
    success && 'ig-input-success',
    className
  ].filter(Boolean).join(' ');

  return (
    <textarea ref={ref} className={classes} {...props} />
  );
});

Textarea.propTypes = {
  auto: PropTypes.bool,
  error: PropTypes.bool,
  success: PropTypes.bool,
  className: PropTypes.string,
};
