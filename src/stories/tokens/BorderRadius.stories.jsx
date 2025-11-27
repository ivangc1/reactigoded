/**
 * BorderRadius - Sistema de bordes redondeados Igoded
 */

export default {
  title: 'Tokens/BorderRadius',
  parameters: {
    layout: 'fullscreen',
  },
}

const radiusScale = [
  { name: 'radius-none', value: '0', desc: 'Sin redondeo' },
  { name: 'radius-sm', value: '0.25rem', desc: 'Sutil' },
  { name: 'radius-md', value: '0.5rem', desc: 'Estándar' },
  { name: 'radius-lg', value: '0.75rem', desc: 'Pronunciado' },
  { name: 'radius-xl', value: '1rem', desc: 'Grande' },
  { name: 'radius-2xl', value: '1.5rem', desc: 'Muy grande' },
  { name: 'radius-full', value: '9999px', desc: 'Circular' },
]

export const EscalaDeRadius = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-4xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Border Radius
      </h1>

      <div style={{
        display: 'flex',
        gap: 'var(--space-xl)',
        flexWrap: 'wrap',
      }}>
        {radiusScale.map(({ name, value, desc }) => (
          <div key={name} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-sm)',
          }}>
            <div style={{
              width: '100px',
              height: '100px',
              background: 'var(--accent)',
              borderRadius: `var(--${name})`,
            }} />
            <code style={{
              color: 'var(--text-muted)',
              fontSize: 'var(--text-xs)',
            }}>
              --{name}
            </code>
            <span style={{
              color: 'var(--text-muted)',
              fontSize: 'var(--text-xs)',
            }}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  ),
}

export const AplicadoARectangulos = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Aplicado a Rectángulos
      </h2>

      <div style={{
        display: 'flex',
        gap: 'var(--space-lg)',
        flexWrap: 'wrap',
      }}>
        {radiusScale.slice(0, -1).map(({ name }) => (
          <div key={name} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-sm)',
          }}>
            <div style={{
              width: '160px',
              height: '80px',
              background: 'var(--primary)',
              borderRadius: `var(--${name})`,
            }} />
            <code style={{
              color: 'var(--text-muted)',
              fontSize: 'var(--text-xs)',
            }}>
              --{name}
            </code>
          </div>
        ))}
      </div>
    </div>
  ),
}
