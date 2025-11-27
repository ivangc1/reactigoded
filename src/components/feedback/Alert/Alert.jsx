import { forwardRef, useState } from 'react'
import { cn } from '../../../utils/cn'

/**
 * Alert - Componente de alerta/notificación
 *
 * @param {string} variant - 'info' | 'success' | 'warning' | 'danger'
 * @param {string} title - Título de la alerta
 * @param {boolean} dismissible - Permite cerrar la alerta
 * @param {function} onDismiss - Callback al cerrar
 * @param {ReactNode} icon - Icono personalizado
 */
const Alert = forwardRef(({
  children,
  variant = 'info',
  title,
  dismissible = false,
  onDismiss,
  icon,
  className,
  ...props
}, ref) => {

  const [visible, setVisible] = useState(true)

  if (!visible) return null

  const colorMap = {
    info: { bg: 'var(--info)', light: 'rgba(59, 130, 246, 0.1)' },
    success: { bg: 'var(--success)', light: 'rgba(34, 197, 94, 0.1)' },
    warning: { bg: 'var(--warning)', light: 'rgba(245, 158, 11, 0.1)' },
    danger: { bg: 'var(--danger)', light: 'rgba(239, 68, 68, 0.1)' },
  }

  const iconMap = {
    info: 'ℹ',
    success: '✓',
    warning: '⚠',
    danger: '✕',
  }

  const colors = colorMap[variant]

  const alertStyle = {
    display: 'flex',
    gap: 'var(--space-sm)',
    padding: 'var(--space-md)',
    background: colors.light,
    border: `1px solid ${colors.bg}`,
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-base)',
  }

  const iconStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    background: colors.bg,
    color: 'white',
    borderRadius: '50%',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--fw-bold)',
    flexShrink: 0,
  }

  const contentStyle = {
    flex: 1,
  }

  const titleStyle = {
    fontWeight: 'var(--fw-semibold)',
    color: 'var(--text-heading)',
    marginBottom: children ? 'var(--space-2xs)' : 0,
  }

  const descStyle = {
    color: 'var(--text-body)',
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
  }

  const handleDismiss = () => {
    setVisible(false)
    onDismiss?.()
  }

  return (
    <div ref={ref} style={alertStyle} className={cn(className)} role="alert" {...props}>
      <span style={iconStyle}>{icon || iconMap[variant]}</span>
      <div style={contentStyle}>
        {title && <div style={titleStyle}>{title}</div>}
        {children && <div style={descStyle}>{children}</div>}
      </div>
      {dismissible && (
        <button
          style={dismissStyle}
          onClick={handleDismiss}
          aria-label="Dismiss"
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
        >
          ×
        </button>
      )}
    </div>
  )
})

Alert.displayName = 'Alert'
export { Alert }
