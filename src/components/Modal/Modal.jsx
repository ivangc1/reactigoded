import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Modal = forwardRef(function Modal(
  {
    open = false,
    size,
    title,
    onClose,
    footer,
    className = '',
    children,
    ...props
  },
  ref
) {
  if (!open) return null;

  const modalClasses = [
    'ig-modal',
    size && `ig-modal-${size}`,
    className
  ].filter(Boolean).join(' ');

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  return (
    <div
      className="ig-modal-backdrop"
      onClick={handleBackdropClick}
      {...props}
    >
      <div ref={ref} className={modalClasses} role="dialog" aria-modal="true">
        {(title || onClose) && (
          <div className="ig-modal-header">
            {title && <h2>{title}</h2>}
            {onClose && (
              <button
                type="button"
                className="ig-modal-close"
                onClick={onClose}
                aria-label="Close"
              >
                &times;
              </button>
            )}
          </div>
        )}
        <div className="ig-modal-body">{children}</div>
        {footer && <div className="ig-modal-footer">{footer}</div>}
      </div>
    </div>
  );
});

Modal.propTypes = {
  open: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', 'full']),
  title: PropTypes.node,
  onClose: PropTypes.func,
  footer: PropTypes.node,
  className: PropTypes.string,
  children: PropTypes.node,
};
