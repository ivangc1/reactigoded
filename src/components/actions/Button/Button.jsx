import { forwardRef } from 'react'
import { cn } from '../../../utils/cn'

/**
 * Button - Componente de botón con múltiples variantes
 *
 * @param {string} variant - 'primary' | 'accent' | 'ghost' | 'outline' | 'danger'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} glow - Añade efecto de resplandor
 * @param {boolean} disabled - Estado deshabilitado
 * @param {boolean} loading - Estado de carga
 * @param {boolean} fullWidth - Ocupa todo el ancho
 */
const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  glow = false,
  disabled = false,
  loading = false,
  fullWidth = false,
  className,
  ...props
}, ref) => {

  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-xs)',
    fontFamily: 'var(--font-base)',
    fontWeight: 'var(--fw-semibold)',
    borderRadius: 'var(--radius-md)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'var(--transition-normal)',
    border: 'none',
    outline: 'none',
    width: fullWidth ? '100%' : 'auto',
  }

  const sizes = {
    sm: { padding: 'var(--space-xs) var(--space-sm)', fontSize: 'var(--text-sm)' },
    md: { padding: 'var(--space-sm) var(--space-md)', fontSize: 'var(--text-base)' },
    lg: { padding: 'var(--space-md) var(--space-lg)', fontSize: 'var(--text-lg)' },
  }

  const variants = {
    primary: {
      background: 'var(--primary)',
      color: 'var(--text-on-primary)',
    },
    accent: {
      background: 'var(--accent)',
      color: 'var(--text-on-accent)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-body)',
    },
    outline: {
      background: 'transparent',
      color: 'var(--accent)',
      border: '1px solid var(--accent)',
    },
    danger: {
      background: 'var(--danger)',
      color: 'white',
    },
  }

  const glowStyles = {
    primary: 'var(--glow-primary-medium)',
    accent: 'var(--glow-accent-medium)',
    danger: '0 0 20px rgba(220, 38, 38, 0.4)',
    ghost: 'none',
    outline: 'var(--glow-accent-medium)',
  }

  const style = {
    ...baseStyles,
    ...sizes[size],
    ...variants[variant],
    opacity: disabled ? 0.5 : 1,
    ...(glow && !disabled && { boxShadow: glowStyles[variant] }),
  }

  return (
    <button
      ref={ref}
      className={cn(className)}
      style={style}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span
          className="anim-spin"
          style={{
            display: 'inline-block',
            width: '1em',
            height: '1em',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
          }}
        />
      )}
      {children}
    </button>
  )
})

Button.displayName = 'Button'
export { Button }
