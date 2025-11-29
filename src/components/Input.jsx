import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Input = forwardRef(function Input(
  {
    size,
    error = false,
    success = false,
    className = '',
    ...props
  },
  ref
) {
  const classes = [
    'ig-input',
    size && `ig-input-${size}`,
    error && 'ig-input-error',
    success && 'ig-input-success',
    className
  ].filter(Boolean).join(' ');

  return (
    <input ref={ref} className={classes} {...props} />
  );
});

Input.propTypes = {
  size: PropTypes.oneOf(['sm', 'lg']),
  error: PropTypes.bool,
  success: PropTypes.bool,
  className: PropTypes.string,
};

export const Label = forwardRef(function Label(
  { required = false, className = '', children, ...props },
  ref
) {
  const classes = [
    'ig-label',
    required && 'ig-label-required',
    className
  ].filter(Boolean).join(' ');

  return (
    <label ref={ref} className={classes} {...props}>
      {children}
    </label>
  );
});

Label.propTypes = {
  required: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};

export const Helper = forwardRef(function Helper(
  { className = '', children, ...props },
  ref
) {
  return (
    <p ref={ref} className={`ig-helper ${className}`.trim()} {...props}>
      {children}
    </p>
  );
});

Helper.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

export const Error = forwardRef(function Error(
  { className = '', children, ...props },
  ref
) {
  return (
    <p ref={ref} className={`ig-error ${className}`.trim()} {...props}>
      {children}
    </p>
  );
});

Error.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

export const InputGroup = forwardRef(function InputGroup(
  { className = '', children, ...props },
  ref
) {
  return (
    <div ref={ref} className={`ig-input-group ${className}`.trim()} {...props}>
      {children}
    </div>
  );
});

InputGroup.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

export const InputAddon = forwardRef(function InputAddon(
  { className = '', children, ...props },
  ref
) {
  return (
    <span ref={ref} className={`ig-input-addon ${className}`.trim()} {...props}>
      {children}
    </span>
  );
});

InputAddon.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};
