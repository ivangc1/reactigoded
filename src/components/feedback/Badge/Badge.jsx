import { forwardRef } from 'react'
import { cn } from '../../../utils/cn'

/**
 * Badge - Componente de etiqueta/distintivo
 *
 * @param {string} variant - 'solid' | 'outline' | 'glass' | 'dot'
 * @param {string} color - 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info'
 * @param {string} size - 'sm' | 'md'
 */
const Badge = forwardRef(({
  children,
  variant = 'solid',
  color = 'accent',
  size = 'md',
  className,
  ...props
}, ref) => {

  const colorMap = {
    primary: 'var(--primary)',
    accent: 'var(--accent)',
    success: 'var(--success)',
    warning: 'var(--warning)',
    danger: 'var(--danger)',
    info: 'var(--info)',
  }

  const sizes = {
    sm: {
      padding: 'var(--space-2xs) var(--space-xs)',
      fontSize: 'var(--text-xs)',
    },
    md: {
      padding: 'var(--space-2xs) var(--space-sm)',
      fontSize: 'var(--text-sm)',
    },
  }

  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2xs)',
    fontFamily: 'var(--font-base)',
    fontWeight: 'var(--fw-semibold)',
    borderRadius: 'var(--radius-full)',
    ...sizes[size],
  }

  const variants = {
    solid: {
      background: colorMap[color],
      color: 'white',
    },
    outline: {
      background: 'transparent',
      color: colorMap[color],
      border: `1px solid ${colorMap[color]}`,
    },
    glass: {
      background: `${colorMap[color]}33`,
      color: colorMap[color],
      backdropFilter: 'var(--blur-sm)',
    },
    dot: {
      background: 'var(--bg-surface)',
      color: 'var(--text-body)',
      border: '1px solid var(--border-default)',
    },
  }

  const style = {
    ...baseStyle,
    ...variants[variant],
  }

  return (
    <span ref={ref} style={style} className={cn(className)} {...props}>
      {variant === 'dot' && (
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: colorMap[color],
        }} />
      )}
      {children}
    </span>
  )
})

Badge.displayName = 'Badge'
export { Badge }
