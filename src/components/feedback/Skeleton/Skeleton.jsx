import { forwardRef } from 'react'
import { cn } from '../../../utils/cn'

/**
 * Skeleton - Componente placeholder de carga
 *
 * @param {string} variant - 'text' | 'circular' | 'rectangular'
 * @param {string|number} width - Ancho del skeleton
 * @param {string|number} height - Alto del skeleton
 * @param {boolean} animation - Activar animación shimmer (default true)
 */
const Skeleton = forwardRef(({
  variant = 'text',
  width,
  height,
  animation = true,
  className,
  style,
  ...props
}, ref) => {

  const getVariantStyles = () => {
    switch (variant) {
      case 'circular':
        return {
          width: width || '40px',
          height: height || width || '40px',
          borderRadius: '50%',
        }
      case 'rectangular':
        return {
          width: width || '100%',
          height: height || '100px',
          borderRadius: 'var(--skeleton-radius)',
        }
      case 'text':
      default:
        return {
          width: width || '100%',
          height: height || '1em',
          borderRadius: 'var(--skeleton-radius)',
        }
    }
  }

  const baseStyle = {
    display: 'block',
    background: animation ? 'var(--skeleton-gradient)' : 'var(--skeleton-base)',
    backgroundSize: animation ? '200% 100%' : 'auto',
    animation: animation ? 'var(--anim-shimmer)' : 'none',
    ...getVariantStyles(),
    ...style,
  }

  // Handle numeric values by converting to pixels
  if (typeof baseStyle.width === 'number') {
    baseStyle.width = `${baseStyle.width}px`
  }
  if (typeof baseStyle.height === 'number') {
    baseStyle.height = `${baseStyle.height}px`
  }

  return (
    <span
      ref={ref}
      style={baseStyle}
      className={cn(className)}
      aria-hidden="true"
      {...props}
    />
  )
})

Skeleton.displayName = 'Skeleton'
export { Skeleton }
