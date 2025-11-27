/**
 * Shadows - Sistema de sombras Igoded
 *
 * Sombras de elevación y glows por color
 */

export default {
  title: 'Effects/Shadows',
  parameters: {
    layout: 'fullscreen',
  },
}

const ShadowBox = ({ name, variable, children }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-sm)',
  }}>
    <div style={{
      width: '150px',
      height: '150px',
      background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: `var(${variable})`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {children}
    </div>
    <code style={{
      color: 'var(--text-muted)',
      fontSize: 'var(--text-xs)',
    }}>
      {name}
    </code>
  </div>
)

export const SombrasDeElevacion = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-4xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Sombras de Elevación
      </h1>

      <p style={{
        color: 'var(--text-body)',
        marginBottom: 'var(--space-xl)',
        maxWidth: '600px',
      }}>
        Sombras para crear jerarquía visual mediante elevación.
        Mayor sombra = mayor elevación percibida.
      </p>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-xl)',
        justifyContent: 'center',
      }}>
        <ShadowBox name="--shadow-sm" variable="--shadow-sm">
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Small</span>
        </ShadowBox>
        <ShadowBox name="--shadow-md" variable="--shadow-md">
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Medium</span>
        </ShadowBox>
        <ShadowBox name="--shadow-lg" variable="--shadow-lg">
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Large</span>
        </ShadowBox>
        <ShadowBox name="--shadow-xl" variable="--shadow-xl">
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>X-Large</span>
        </ShadowBox>
      </div>
    </div>
  ),
}

export const GlowsDeColor = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Glows por Color Cardinal
      </h2>

      <h3 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-md)',
      }}>
        Intensidad Medium
      </h3>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-xl)',
        marginBottom: 'var(--space-2xl)',
      }}>
        {['tellus', 'liminal', 'senum', 'vesper'].map(color => (
          <div key={color} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-sm)',
          }}>
            <div style={{
              width: '120px',
              height: '120px',
              background: `var(--${color})`,
              borderRadius: 'var(--radius-lg)',
              boxShadow: `var(--glow-${color}-medium)`,
            }} />
            <code style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
              --glow-{color}-medium
            </code>
          </div>
        ))}
      </div>

      <h3 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-md)',
      }}>
        Intensidad Intense
      </h3>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-xl)',
      }}>
        {['tellus', 'liminal', 'senum', 'vesper'].map(color => (
          <div key={color} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-sm)',
          }}>
            <div style={{
              width: '120px',
              height: '120px',
              background: `var(--${color})`,
              borderRadius: 'var(--radius-lg)',
              boxShadow: `var(--glow-${color}-intense)`,
            }} />
            <code style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
              --glow-{color}-intense
            </code>
          </div>
        ))}
      </div>
    </div>
  ),
}

export const GlowsAdaptativos = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Glows Adaptativos
      </h2>

      <p style={{
        color: 'var(--text-body)',
        marginBottom: 'var(--space-lg)',
      }}>
        Estos glows cambian de color según el modo (dark/light).
      </p>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-2xl)',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-md)',
        }}>
          <h4 style={{ color: 'var(--text-heading)', margin: 0 }}>Primary Glow</h4>
          <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-sm)',
            }}>
              <div style={{
                width: '100px',
                height: '100px',
                background: 'var(--primary)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--glow-primary-medium)',
              }} />
              <code style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                medium
              </code>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-sm)',
            }}>
              <div style={{
                width: '100px',
                height: '100px',
                background: 'var(--primary)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--glow-primary-intense)',
              }} />
              <code style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                intense
              </code>
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-md)',
        }}>
          <h4 style={{ color: 'var(--text-heading)', margin: 0 }}>Accent Glow</h4>
          <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-sm)',
            }}>
              <div style={{
                width: '100px',
                height: '100px',
                background: 'var(--accent)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--glow-accent-medium)',
              }} />
              <code style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                medium
              </code>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-sm)',
            }}>
              <div style={{
                width: '100px',
                height: '100px',
                background: 'var(--accent)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--glow-accent-intense)',
              }} />
              <code style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                intense
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
}
