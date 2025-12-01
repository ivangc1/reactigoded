import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Toast = forwardRef(function Toast(
  {
    variant,
    icon,
    title,
    message,
    onClose,
    className = '',
    children,
    ...props
  },
  ref
) {
  const classes = [
    'ig-toast',
    variant && `ig-toast-${variant}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div ref={ref} className={classes} role="alert" {...props}>
      {icon && <span className="ig-toast-icon">{icon}</span>}
      <div className="ig-toast-content">
        {title && <div className="ig-toast-title">{title}</div>}
        {message && <div className="ig-toast-message">{message}</div>}
        {children}
      </div>
      {onClose && (
        <button
          type="button"
          className="ig-toast-close"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
      )}
    </div>
  );
});

Toast.propTypes = {
  variant: PropTypes.oneOf(['success', 'warning', 'danger', 'info', 'brand', 'secondary']),
  icon: PropTypes.node,
  title: PropTypes.node,
  message: PropTypes.node,
  onClose: PropTypes.func,
  className: PropTypes.string,
  children: PropTypes.node,
};

export const ToastContainer = forwardRef(function ToastContainer(
  {
    position = 'top-right',
    className = '',
    children,
    ...props
  },
  ref
) {
  const classes = [
    'ig-toast-container',
    `ig-toast-${position}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div ref={ref} className={classes} {...props}>
      {children}
    </div>
  );
});

ToastContainer.propTypes = {
  position: PropTypes.oneOf([
    'top-right', 'top-left', 'bottom-right', 'bottom-left',
    'top-center', 'bottom-center'
  ]),
  className: PropTypes.string,
  children: PropTypes.node,
};
