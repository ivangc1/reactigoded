import { forwardRef } from 'react'
import { cn } from '../../../utils/cn'

/**
 * Spinner - Indicador de carga
 *
 * @param {string} size - 'sm' | 'md' | 'lg' | 'xl'
 * @param {string} color - 'primary' | 'accent' | 'current'
 */
const Spinner = forwardRef(({
  size = 'md',
  color = 'accent',
  className,
  ...props
}, ref) => {

  const sizes = {
    sm: '16px',
    md: '24px',
    lg: '40px',
    xl: '60px',
  }

  const colorMap = {
    primary: 'var(--primary)',
    accent: 'var(--accent)',
    current: 'currentColor',
  }

  const spinnerStyle = {
    width: sizes[size],
    height: sizes[size],
    border: '3px solid var(--neutral-700)',
    borderTopColor: colorMap[color],
    borderRadius: '50%',
    animation: 'var(--anim-spin)',
  }

  return (
    <div
      ref={ref}
      style={spinnerStyle}
      className={cn('anim-spin', className)}
      role="status"
      aria-label="Loading"
      {...props}
    />
  )
})

Spinner.displayName = 'Spinner'
export { Spinner }
