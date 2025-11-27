import { forwardRef } from 'react'
import { cn } from '../../../utils/cn'

/**
 * Checkbox - Componente de casilla de verificación
 *
 * @param {string} label - Texto de la etiqueta
 * @param {boolean} checked - Estado marcado
 * @param {function} onChange - Callback al cambiar
 * @param {boolean} disabled - Estado deshabilitado
 * @param {boolean} indeterminate - Estado indeterminado
 * @param {string} color - 'primary' | 'accent'
 */
const Checkbox = forwardRef(({
  label,
  checked = false,
  onChange,
  disabled = false,
  indeterminate = false,
  color = 'accent',
  className,
  ...props
}, ref) => {

  const wrapperStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  }

  const checkboxContainerStyle = {
    position: 'relative',
    width: '20px',
    height: '20px',
  }

  const inputStyle = {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: '100%',
    cursor: disabled ? 'not-allowed' : 'pointer',
    margin: 0,
  }

  const checkmarkStyle = {
    position: 'absolute',
    inset: 0,
    background: checked || indeterminate ? `var(--${color})` : 'var(--input-bg)',
    border: `2px solid ${checked || indeterminate ? `var(--${color})` : 'var(--input-border)'}`,
    borderRadius: 'var(--radius-sm)',
    transition: 'var(--transition-fast)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const iconStyle = {
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
  }

  const labelStyle = {
    fontFamily: 'var(--font-base)',
    fontSize: 'var(--text-base)',
    color: 'var(--text-body)',
    userSelect: 'none',
  }

  return (
    <label style={wrapperStyle} className={cn(className)}>
      <span style={checkboxContainerStyle}>
        <input
          ref={ref}
          type="checkbox"
          style={inputStyle}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          {...props}
        />
        <span style={checkmarkStyle}>
          {checked && !indeterminate && <span style={iconStyle}>✓</span>}
          {indeterminate && <span style={iconStyle}>−</span>}
        </span>
      </span>
      {label && <span style={labelStyle}>{label}</span>}
    </label>
  )
})

Checkbox.displayName = 'Checkbox'
export { Checkbox }
