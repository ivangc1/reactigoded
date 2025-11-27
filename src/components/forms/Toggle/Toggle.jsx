import { forwardRef } from 'react'
import { cn } from '../../../utils/cn'

/**
 * Toggle / Switch - Componente de interruptor
 *
 * @param {string} label - Texto de la etiqueta
 * @param {boolean} checked - Estado activo
 * @param {function} onChange - Callback al cambiar
 * @param {boolean} disabled - Estado deshabilitado
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {string} color - 'primary' | 'accent' | 'success'
 */
const Toggle = forwardRef(({
  label,
  checked = false,
  onChange,
  disabled = false,
  size = 'md',
  color = 'accent',
  className,
  ...props
}, ref) => {

  const sizes = {
    sm: { width: '36px', height: '20px', thumb: '16px' },
    md: { width: '44px', height: '24px', thumb: '20px' },
    lg: { width: '56px', height: '30px', thumb: '26px' },
  }

  const currentSize = sizes[size]

  const wrapperStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  }

  const trackStyle = {
    position: 'relative',
    width: currentSize.width,
    height: currentSize.height,
    background: checked ? `var(--${color})` : 'var(--neutral-600)',
    borderRadius: 'var(--radius-full)',
    transition: 'var(--transition-fast)',
  }

  const thumbStyle = {
    position: 'absolute',
    top: '50%',
    left: checked ? `calc(100% - ${currentSize.thumb} - 2px)` : '2px',
    transform: 'translateY(-50%)',
    width: currentSize.thumb,
    height: currentSize.thumb,
    background: 'white',
    borderRadius: '50%',
    boxShadow: 'var(--shadow-sm)',
    transition: 'var(--transition-fast)',
  }

  const inputStyle = {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: '100%',
    cursor: disabled ? 'not-allowed' : 'pointer',
    margin: 0,
  }

  const labelStyle = {
    fontFamily: 'var(--font-base)',
    fontSize: 'var(--text-base)',
    color: 'var(--text-body)',
    userSelect: 'none',
  }

  return (
    <label style={wrapperStyle} className={cn(className)}>
      <span style={trackStyle}>
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          style={inputStyle}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          {...props}
        />
        <span style={thumbStyle} />
      </span>
      {label && <span style={labelStyle}>{label}</span>}
    </label>
  )
})

Toggle.displayName = 'Toggle'
export { Toggle }
