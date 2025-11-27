/**
 * Spacing - Sistema de espaciado Igoded
 *
 * Escala de espaciado consistente desde 2xs hasta 3xl
 */

export default {
  title: 'Foundations/Spacing',
  parameters: {
    layout: 'fullscreen',
  },
}

const spacingScale = [
  { name: 'space-2xs', value: '0.25rem', px: '4px' },
  { name: 'space-xs', value: '0.5rem', px: '8px' },
  { name: 'space-sm', value: '0.75rem', px: '12px' },
  { name: 'space-md', value: '1rem', px: '16px' },
  { name: 'space-lg', value: '1.5rem', px: '24px' },
  { name: 'space-xl', value: '2rem', px: '32px' },
  { name: 'space-2xl', value: '3rem', px: '48px' },
  { name: 'space-3xl', value: '4rem', px: '64px' },
]

export const EscalaDeEspaciado = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-4xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Espaciado
      </h1>

      <p style={{
        color: 'var(--text-body)',
        marginBottom: 'var(--space-xl)',
        maxWidth: '600px',
      }}>
        Sistema de espaciado consistente para margins, paddings y gaps.
        Basado en múltiplos de 4px para alineación perfecta.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {spacingScale.map(({ name, value, px }) => (
          <div key={name} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            padding: 'var(--space-sm)',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
          }}>
            <div style={{
              width: `var(--${name})`,
              height: 'var(--space-lg)',
              background: 'var(--accent)',
              borderRadius: 'var(--radius-sm)',
              flexShrink: 0,
            }} />
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 'var(--space-sm)',
              minWidth: '200px',
            }}>
              <code style={{
                color: 'var(--primary)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--fw-semibold)',
              }}>
                --{name}
              </code>
              <span style={{
                color: 'var(--text-muted)',
                fontSize: 'var(--text-xs)',
              }}>
                {value} ({px})
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
}

export const ComparacionVisual = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Comparación Visual de Espaciados
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: 'var(--space-lg)',
      }}>
        {spacingScale.map(({ name, px }) => (
          <div key={name} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-xs)',
          }}>
            <div style={{
              width: `var(--${name})`,
              height: `var(--${name})`,
              background: 'var(--accent)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-md)',
            }} />
            <code style={{
              color: 'var(--text-muted)',
              fontSize: 'var(--text-xs)',
            }}>
              {name.replace('space-', '')} ({px})
            </code>
          </div>
        ))}
      </div>
    </div>
  ),
}

export const EjemplosDePadding = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Ejemplos de Padding
      </h2>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-lg)',
      }}>
        {spacingScale.slice(0, 6).map(({ name }) => (
          <div key={name} style={{
            background: 'var(--bg-elevated)',
            border: '2px dashed var(--border-default)',
            borderRadius: 'var(--radius-md)',
          }}>
            <div style={{
              padding: `var(--${name})`,
              background: 'var(--accent)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-on-accent)',
              fontSize: 'var(--text-sm)',
              textAlign: 'center',
            }}>
              {name.replace('space-', '')}
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
}

export const EjemplosDeGap = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Ejemplos de Gap
      </h2>

      {['space-xs', 'space-sm', 'space-md', 'space-lg'].map(name => (
        <div key={name} style={{ marginBottom: 'var(--space-xl)' }}>
          <code style={{
            color: 'var(--text-muted)',
            fontSize: 'var(--text-sm)',
            marginBottom: 'var(--space-xs)',
            display: 'block',
          }}>
            gap: var(--{name})
          </code>
          <div style={{
            display: 'flex',
            gap: `var(--${name})`,
            padding: 'var(--space-md)',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
          }}>
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} style={{
                width: '50px',
                height: '50px',
                background: 'var(--primary)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-on-primary)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--fw-semibold)',
              }}>
                {n}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
}
