import { forwardRef } from 'react'
import { cn } from '../../../utils/cn'

/**
 * Progress - Componente de barra de progreso
 *
 * @param {number} value - Valor de progreso (0-100)
 * @param {string} variant - 'default' | 'success' | 'warning' | 'danger'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} showLabel - Mostrar porcentaje
 */
const Progress = forwardRef(({
  value = 0,
  variant = 'default',
  size = 'md',
  showLabel = false,
  className,
  style,
  ...props
}, ref) => {

  // Clamp value between 0 and 100
  const clampedValue = Math.min(100, Math.max(0, value))

  const sizeMap = {
    sm: 'var(--progress-height-sm)',
    md: 'var(--progress-height-md)',
    lg: 'var(--progress-height-lg)',
  }

  const fillColorMap = {
    default: 'var(--progress-fill)',
    success: 'var(--progress-fill-success)',
    warning: 'var(--progress-fill-warning)',
    danger: 'var(--progress-fill-danger)',
  }

  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    width: '100%',
    ...style,
  }

  const trackStyle = {
    flex: 1,
    height: sizeMap[size],
    background: 'var(--progress-track)',
    borderRadius: 'var(--progress-radius)',
    overflow: 'hidden',
  }

  const fillStyle = {
    height: '100%',
    width: `${clampedValue}%`,
    background: fillColorMap[variant],
    borderRadius: 'var(--progress-radius)',
    transition: 'width 0.3s ease',
  }

  const labelStyle = {
    fontSize: size === 'sm' ? 'var(--text-xs)' : 'var(--text-sm)',
    fontWeight: 'var(--fw-medium)',
    color: 'var(--text-muted)',
    minWidth: '3ch',
    textAlign: 'right',
    fontFamily: 'var(--font-base)',
  }

  return (
    <div
      ref={ref}
      style={containerStyle}
      className={cn(className)}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div style={trackStyle}>
        <div style={fillStyle} />
      </div>
      {showLabel && (
        <span style={labelStyle}>{Math.round(clampedValue)}%</span>
      )}
    </div>
  )
})

Progress.displayName = 'Progress'
export { Progress }
