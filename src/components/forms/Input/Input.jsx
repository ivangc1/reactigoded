import { forwardRef } from 'react'
import { cn } from '../../../utils/cn'

/**
 * Input - Componente de campo de texto
 *
 * @param {string} label - Etiqueta del campo
 * @param {string} error - Mensaje de error
 * @param {string} hint - Texto de ayuda
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {ReactNode} leftIcon - Icono izquierdo
 * @param {ReactNode} rightIcon - Icono derecho
 */
const Input = forwardRef(({
  label,
  error,
  hint,
  size = 'md',
  disabled = false,
  leftIcon,
  rightIcon,
  className,
  ...props
}, ref) => {

  const sizes = {
    sm: {
      padding: 'var(--space-xs) var(--space-sm)',
      fontSize: 'var(--text-sm)',
      height: '32px',
    },
    md: {
      padding: 'var(--space-sm) var(--space-md)',
      fontSize: 'var(--text-base)',
      height: '40px',
    },
    lg: {
      padding: 'var(--space-md) var(--space-lg)',
      fontSize: 'var(--text-lg)',
      height: '48px',
    },
  }

  const wrapperStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2xs)',
  }

  const labelStyle = {
    fontFamily: 'var(--font-base)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--fw-semibold)',
    color: 'var(--text-heading)',
  }

  const inputContainerStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  }

  const inputStyle = {
    width: '100%',
    fontFamily: 'var(--font-base)',
    background: 'var(--input-bg)',
    border: `1px solid ${error ? 'var(--danger)' : 'var(--input-border)'}`,
    borderRadius: 'var(--radius-md)',
    color: 'var(--input-text)',
    outline: 'none',
    transition: 'var(--transition-fast)',
    ...sizes[size],
    paddingLeft: leftIcon ? 'calc(var(--space-lg) + var(--space-sm))' : sizes[size].padding.split(' ')[1],
    paddingRight: rightIcon ? 'calc(var(--space-lg) + var(--space-sm))' : sizes[size].padding.split(' ')[1],
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'text',
  }

  const iconStyle = (position) => ({
    position: 'absolute',
    [position]: 'var(--space-sm)',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
  })

  const hintStyle = {
    fontSize: 'var(--text-xs)',
    color: error ? 'var(--danger)' : 'var(--text-muted)',
  }

  return (
    <div style={wrapperStyle} className={cn(className)}>
      {label && <label style={labelStyle}>{label}</label>}
      <div style={inputContainerStyle}>
        {leftIcon && <span style={iconStyle('left')}>{leftIcon}</span>}
        <input
          ref={ref}
          style={inputStyle}
          disabled={disabled}
          onFocus={(e) => {
            if (!error) {
              e.target.style.borderColor = 'var(--input-border-focus)'
              e.target.style.boxShadow = 'var(--focus-ring)'
            }
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? 'var(--danger)' : 'var(--input-border)'
            e.target.style.boxShadow = 'none'
          }}
          {...props}
        />
        {rightIcon && <span style={iconStyle('right')}>{rightIcon}</span>}
      </div>
      {(error || hint) && <span style={hintStyle}>{error || hint}</span>}
    </div>
  )
})

Input.displayName = 'Input'
export { Input }
