import { forwardRef } from 'react'
import { cn } from '../../../utils/cn'

/**
 * Card - Componente contenedor con múltiples variantes visuales
 *
 * @param {string} variant - 'elevated' | 'glass' | 'neumorphic' | 'outline'
 * @param {string} color - 'default' | 'tellus' | 'liminal' | 'senum' | 'vesper'
 * @param {string} padding - 'none' | 'sm' | 'md' | 'lg'
 * @param {boolean} hoverable - Efecto hover
 */
const Card = forwardRef(({
  children,
  variant = 'elevated',
  color = 'default',
  padding = 'md',
  hoverable = false,
  className,
  ...props
}, ref) => {

  const paddingMap = {
    none: '0',
    sm: 'var(--space-sm)',
    md: 'var(--space-md)',
    lg: 'var(--space-lg)',
  }

  const baseStyles = {
    borderRadius: 'var(--radius-lg)',
    padding: paddingMap[padding],
    transition: 'var(--transition-normal)',
  }

  const variants = {
    elevated: {
      background: 'var(--bg-elevated)',
      boxShadow: 'var(--shadow-md)',
    },
    glass: {
      background: color === 'default' ? 'var(--glass-medium)' : `var(--glass-${color})`,
      backdropFilter: 'var(--blur-md)',
      WebkitBackdropFilter: 'var(--blur-md)',
      border: '1px solid var(--glass-border)',
    },
    neumorphic: {
      background: 'var(--bg-surface)',
      boxShadow: 'var(--neuo-raised)',
    },
    outline: {
      background: 'transparent',
      border: '1px solid var(--border-default)',
    },
  }

  const colorAccents = {
    default: {},
    tellus: { borderLeft: '4px solid var(--tellus)' },
    liminal: { borderLeft: '4px solid var(--liminal)' },
    senum: { borderLeft: '4px solid var(--senum)' },
    vesper: { borderLeft: '4px solid var(--vesper)' },
  }

  const hoverStyles = hoverable ? {
    cursor: 'pointer',
  } : {}

  const style = {
    ...baseStyles,
    ...variants[variant],
    ...(variant !== 'glass' && colorAccents[color]),
    ...hoverStyles,
  }

  const handleMouseEnter = hoverable ? (e) => {
    if (variant === 'elevated') {
      e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
      e.currentTarget.style.transform = 'translateY(-2px)'
    } else if (variant === 'neumorphic') {
      e.currentTarget.style.boxShadow = 'var(--neuo-raised-hover)'
    }
  } : undefined

  const handleMouseLeave = hoverable ? (e) => {
    if (variant === 'elevated') {
      e.currentTarget.style.boxShadow = 'var(--shadow-md)'
      e.currentTarget.style.transform = 'translateY(0)'
    } else if (variant === 'neumorphic') {
      e.currentTarget.style.boxShadow = 'var(--neuo-raised)'
    }
  } : undefined

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </div>
  )
})

Card.displayName = 'Card'
export { Card }
