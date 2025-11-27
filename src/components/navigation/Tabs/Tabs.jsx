import { forwardRef, useState } from 'react'
import { cn } from '../../../utils/cn'

/**
 * Tabs - Componente de pestañas
 *
 * @param {Array} items - Array de { key, label, content, icon?, disabled? }
 * @param {string} activeKey - Key de la pestaña activa
 * @param {function} onChange - Callback al cambiar de pestaña
 * @param {string} variant - 'line' | 'enclosed' | 'pills'
 */
const Tabs = forwardRef(({
  items = [],
  activeKey,
  onChange,
  variant = 'line',
  className,
  ...props
}, ref) => {

  const [internalActive, setInternalActive] = useState(items[0]?.key)
  const currentKey = activeKey ?? internalActive

  const handleChange = (key) => {
    if (!activeKey) setInternalActive(key)
    onChange?.(key)
  }

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'var(--font-base)',
  }

  const tabListStyle = {
    display: 'flex',
    gap: variant === 'pills' ? 'var(--space-xs)' : 0,
    borderBottom: variant === 'line' ? '1px solid var(--border-default)' : 'none',
  }

  const getTabStyle = (isActive, isDisabled) => {
    const base = {
      padding: 'var(--space-sm) var(--space-md)',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      opacity: isDisabled ? 0.5 : 1,
      transition: 'var(--transition-fast)',
      border: 'none',
      background: 'transparent',
      fontFamily: 'var(--font-base)',
      fontSize: 'var(--text-base)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-xs)',
    }

    const variants = {
      line: {
        color: isActive ? 'var(--accent)' : 'var(--text-muted)',
        borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
        marginBottom: '-1px',
      },
      enclosed: {
        color: isActive ? 'var(--text-heading)' : 'var(--text-muted)',
        background: isActive ? 'var(--bg-elevated)' : 'transparent',
        borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
        border: isActive ? '1px solid var(--border-default)' : '1px solid transparent',
        borderBottom: isActive ? '1px solid var(--bg-elevated)' : '1px solid transparent',
        marginBottom: '-1px',
      },
      pills: {
        color: isActive ? 'var(--text-on-accent)' : 'var(--text-body)',
        background: isActive ? 'var(--accent)' : 'var(--bg-muted)',
        borderRadius: 'var(--radius-full)',
      },
    }

    return { ...base, ...variants[variant] }
  }

  const panelStyle = {
    padding: 'var(--space-lg) 0',
  }

  const activeItem = items.find(item => item.key === currentKey)

  return (
    <div ref={ref} style={containerStyle} className={cn(className)} {...props}>
      <div role="tablist" style={tabListStyle}>
        {items.map(item => (
          <button
            key={item.key}
            role="tab"
            aria-selected={currentKey === item.key}
            disabled={item.disabled}
            style={getTabStyle(currentKey === item.key, item.disabled)}
            onClick={() => !item.disabled && handleChange(item.key)}
          >
            {item.icon && <span>{item.icon}</span>}
            {item.label}
          </button>
        ))}
      </div>
      {variant === 'enclosed' && (
        <div style={{ borderTop: '1px solid var(--border-default)', marginTop: '-1px' }} />
      )}
      <div role="tabpanel" style={panelStyle}>
        {activeItem?.content}
      </div>
    </div>
  )
})

Tabs.displayName = 'Tabs'
export { Tabs }
