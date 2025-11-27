import { forwardRef, useState } from 'react'
import { cn } from '../../../utils/cn'

/**
 * Avatar - Componente de avatar/foto de perfil
 *
 * @param {string} src - URL de la imagen
 * @param {string} alt - Texto alternativo
 * @param {string} size - 'xs' | 'sm' | 'md' | 'lg' | 'xl'
 * @param {string} shape - 'circle' | 'rounded' | 'square'
 * @param {string} fallback - Iniciales para mostrar si no hay imagen
 * @param {string} status - 'online' | 'offline' | 'away' | 'busy'
 */
const Avatar = forwardRef(({
  src,
  alt = '',
  size = 'md',
  shape = 'circle',
  fallback,
  status,
  className,
  ...props
}, ref) => {

  const [imgError, setImgError] = useState(false)

  const sizes = {
    xs: '24px',
    sm: '32px',
    md: '40px',
    lg: '56px',
    xl: '80px',
  }

  const fontSizes = {
    xs: 'var(--text-xs)',
    sm: 'var(--text-sm)',
    md: 'var(--text-base)',
    lg: 'var(--text-xl)',
    xl: 'var(--text-2xl)',
  }

  const shapes = {
    circle: '50%',
    rounded: 'var(--radius-lg)',
    square: 'var(--radius-sm)',
  }

  const statusColors = {
    online: 'var(--success)',
    offline: 'var(--neutral-500)',
    away: 'var(--warning)',
    busy: 'var(--danger)',
  }

  const containerStyle = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: sizes[size],
    height: sizes[size],
    borderRadius: shapes[shape],
    background: 'var(--neutral-700)',
    overflow: 'hidden',
    flexShrink: 0,
  }

  const imgStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  }

  const fallbackStyle = {
    fontFamily: 'var(--font-base)',
    fontSize: fontSizes[size],
    fontWeight: 'var(--fw-semibold)',
    color: 'var(--text-heading)',
    textTransform: 'uppercase',
  }

  const statusStyle = {
    position: 'absolute',
    bottom: '0',
    right: '0',
    width: size === 'xs' ? '8px' : size === 'sm' ? '10px' : '12px',
    height: size === 'xs' ? '8px' : size === 'sm' ? '10px' : '12px',
    borderRadius: '50%',
    background: statusColors[status],
    border: '2px solid var(--bg-surface)',
  }

  const showFallback = !src || imgError

  return (
    <div ref={ref} style={containerStyle} className={cn(className)} {...props}>
      {showFallback ? (
        <span style={fallbackStyle}>{fallback || '?'}</span>
      ) : (
        <img
          src={src}
          alt={alt}
          style={imgStyle}
          onError={() => setImgError(true)}
        />
      )}
      {status && <span style={statusStyle} />}
    </div>
  )
})

Avatar.displayName = 'Avatar'
export { Avatar }
