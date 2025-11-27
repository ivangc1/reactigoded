/**
 * Breakpoints - Puntos de ruptura responsive Igoded
 *
 * Sistema de breakpoints para diseño responsive
 */

export default {
  title: 'Foundations/Breakpoints',
  parameters: {
    layout: 'fullscreen',
  },
}

const breakpoints = [
  { name: 'xs', value: '475px', desc: 'Móviles pequeños' },
  { name: 'sm', value: '640px', desc: 'Móviles grandes' },
  { name: 'md', value: '768px', desc: 'Tablets' },
  { name: 'lg', value: '1024px', desc: 'Laptops' },
  { name: 'xl', value: '1280px', desc: 'Desktops' },
  { name: '2xl', value: '1536px', desc: 'Pantallas grandes' },
]

export const PuntosDeRuptura = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-4xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Breakpoints
      </h1>

      <p style={{
        color: 'var(--text-body)',
        marginBottom: 'var(--space-xl)',
        maxWidth: '600px',
      }}>
        Puntos de ruptura para diseño responsive. Usar con media queries
        para adaptar el layout a diferentes tamaños de pantalla.
      </p>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-sm)',
        maxWidth: '800px',
      }}>
        {breakpoints.map(({ name, value, desc }, index) => (
          <div key={name} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            padding: 'var(--space-md)',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
          }}>
            <div style={{
              width: `${(index + 1) * 80}px`,
              maxWidth: '100%',
              height: '40px',
              background: `linear-gradient(90deg, var(--primary), var(--accent))`,
              borderRadius: 'var(--radius-sm)',
              opacity: 0.7 + (index * 0.05),
            }} />
            <div style={{ flex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 'var(--space-sm)',
              }}>
                <code style={{
                  color: 'var(--accent)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--fw-semibold)',
                }}>
                  --bp-{name}
                </code>
                <span style={{
                  color: 'var(--text-heading)',
                  fontSize: 'var(--text-sm)',
                }}>
                  {value}
                </span>
              </div>
              <span style={{
                color: 'var(--text-muted)',
                fontSize: 'var(--text-sm)',
              }}>
                {desc}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
}

export const MediaQueryEjemplos = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Ejemplos de Media Queries
      </h2>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-md)',
        maxWidth: '800px',
      }}>
        {breakpoints.map(({ name, value }) => (
          <div key={name} style={{
            padding: 'var(--space-md)',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
          }}>
            <code style={{
              color: 'var(--text-body)',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-mono, monospace)',
              display: 'block',
            }}>
              <span style={{ color: 'var(--accent)' }}>@media</span>
              {' '}(min-width: {value}) {'{'}
              <br />
              {'  '}/* Estilos para {name} y superior */
              <br />
              {'}'}
            </code>
          </div>
        ))}
      </div>
    </div>
  ),
}

export const ContainerWidths = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Container Widths
      </h2>

      <p style={{
        color: 'var(--text-body)',
        marginBottom: 'var(--space-lg)',
      }}>
        Anchos máximos predefinidos para contenedores.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {[
          { name: 'container-sm', value: '640px' },
          { name: 'container-md', value: '768px' },
          { name: 'container-lg', value: '1024px' },
          { name: 'container-xl', value: '1280px' },
          { name: 'container-2xl', value: '1536px' },
        ].map(({ name, value }) => (
          <div key={name} style={{
            padding: 'var(--space-md)',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
          }}>
            <code style={{
              color: 'var(--primary)',
              fontSize: 'var(--text-sm)',
              minWidth: '150px',
            }}>
              --{name}
            </code>
            <span style={{
              color: 'var(--text-body)',
              fontSize: 'var(--text-sm)',
            }}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  ),
}
