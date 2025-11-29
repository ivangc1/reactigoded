import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Alert = forwardRef(function Alert(
  {
    variant = 'info',
    icon,
    title,
    description,
    onClose,
    className = '',
    children,
    ...props
  },
  ref
) {
  const classes = [
    'ig-alert',
    `ig-alert-${variant}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div ref={ref} className={classes} role="alert" {...props}>
      {icon && <span className="ig-alert-icon">{icon}</span>}
      <div>
        {title && <div className="ig-alert-title">{title}</div>}
        {description && <div className="ig-alert-description">{description}</div>}
        {children}
      </div>
      {onClose && (
        <button
          type="button"
          className="ig-alert-close"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
      )}
    </div>
  );
});

Alert.propTypes = {
  variant: PropTypes.oneOf(['success', 'warning', 'danger', 'info', 'primary', 'accent', 'neutral']),
  icon: PropTypes.node,
  title: PropTypes.node,
  description: PropTypes.node,
  onClose: PropTypes.func,
  className: PropTypes.string,
  children: PropTypes.node,
};
