import { forwardRef, useState, useEffect, useCallback, createContext, useContext } from 'react'
import { cn } from '../../../utils/cn'

/**
 * Toast - Componente de notificación temporal
 *
 * @param {string} variant - 'info' | 'success' | 'warning' | 'danger'
 * @param {string} title - Título del toast
 * @param {number} duration - Duración en ms (default 3000)
 * @param {function} onClose - Callback al cerrar
 * @param {boolean} dismissible - Permite cerrar manualmente
 */
const Toast = forwardRef(({
  children,
  variant = 'info',
  title,
  duration = 3000,
  onClose,
  dismissible = true,
  className,
  ...props
}, ref) => {
  const [visible, setVisible] = useState(true)
  const [exiting, setExiting] = useState(false)

  const handleClose = useCallback(() => {
    setExiting(true)
    setTimeout(() => {
      setVisible(false)
      onClose?.()
    }, 200)
  }, [onClose])

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(handleClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, handleClose])

  if (!visible) return null

  const colorMap = {
    info: { accent: 'var(--info)', light: 'rgba(59, 130, 246, 0.15)' },
    success: { accent: 'var(--success)', light: 'rgba(34, 197, 94, 0.15)' },
    warning: { accent: 'var(--warning)', light: 'rgba(245, 158, 11, 0.15)' },
    danger: { accent: 'var(--danger)', light: 'rgba(239, 68, 68, 0.15)' },
  }

  const iconMap = {
    info: 'ℹ',
    success: '✓',
    warning: '⚠',
    danger: '✕',
  }

  const colors = colorMap[variant]

  const toastStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--toast-gap)',
    padding: 'var(--toast-padding)',
    background: 'var(--toast-bg)',
    borderRadius: 'var(--toast-radius)',
    boxShadow: 'var(--toast-shadow)',
    borderLeft: `4px solid ${colors.accent}`,
    fontFamily: 'var(--font-base)',
    minWidth: '280px',
    maxWidth: '400px',
    opacity: exiting ? 0 : 1,
    transform: exiting ? 'translateX(100%)' : 'translateX(0)',
    transition: 'opacity 0.2s ease, transform 0.2s ease',
  }

  const iconStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    background: colors.light,
    color: colors.accent,
    borderRadius: '50%',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--fw-bold)',
    flexShrink: 0,
  }

  const contentStyle = {
    flex: 1,
    minWidth: 0,
  }

  const titleStyle = {
    fontWeight: 'var(--fw-semibold)',
    color: 'var(--text-heading)',
    marginBottom: children ? 'var(--space-2xs)' : 0,
    fontSize: 'var(--text-sm)',
  }

  const descStyle = {
    color: 'var(--toast-text)',
    fontSize: 'var(--text-sm)',
    lineHeight: 'var(--lh-normal)',
  }

  const dismissStyle = {
    background: 'none',
    border: 'none',
    padding: 'var(--space-2xs)',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    fontSize: 'var(--text-lg)',
    lineHeight: 1,
    opacity: 0.7,
    transition: 'var(--transition-fast)',
    marginLeft: 'auto',
  }

  return (
    <div ref={ref} style={toastStyle} className={cn(className)} role="alert" {...props}>
      <span style={iconStyle}>{iconMap[variant]}</span>
      <div style={contentStyle}>
        {title && <div style={titleStyle}>{title}</div>}
        {children && <div style={descStyle}>{children}</div>}
      </div>
      {dismissible && (
        <button
          style={dismissStyle}
          onClick={handleClose}
          aria-label="Close"
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
        >
          ×
        </button>
      )}
    </div>
  )
})

Toast.displayName = 'Toast'

// Toast Context for managing multiple toasts
const ToastContext = createContext(null)

let toastId = 0

/**
 * ToastContainer - Contenedor para múltiples toasts
 * Provee contexto para añadir/remover toasts
 */
const ToastContainer = ({ children, position = 'bottom-right' }) => {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((toast) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { ...toast, id }])
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const positionStyles = {
    'top-right': { top: 'var(--toast-offset)', right: 'var(--toast-offset)' },
    'top-left': { top: 'var(--toast-offset)', left: 'var(--toast-offset)' },
    'bottom-right': { bottom: 'var(--toast-offset)', right: 'var(--toast-offset)' },
    'bottom-left': { bottom: 'var(--toast-offset)', left: 'var(--toast-offset)' },
  }

  const containerStyle = {
    position: 'fixed',
    ...positionStyles[position],
    display: 'flex',
    flexDirection: position.startsWith('top') ? 'column' : 'column-reverse',
    gap: 'var(--space-sm)',
    zIndex: 9999,
    pointerEvents: 'none',
  }

  const toastWrapperStyle = {
    pointerEvents: 'auto',
  }

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div style={containerStyle}>
        {toasts.map((toast) => (
          <div key={toast.id} style={toastWrapperStyle}>
            <Toast
              variant={toast.variant}
              title={toast.title}
              duration={toast.duration}
              dismissible={toast.dismissible}
              onClose={() => removeToast(toast.id)}
            >
              {toast.message}
            </Toast>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

ToastContainer.displayName = 'ToastContainer'

/**
 * Hook para usar toasts
 */
const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastContainer')
  }
  return context
}

export { Toast, ToastContainer, useToast }
