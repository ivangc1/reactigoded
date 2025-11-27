/**
 * Glassmorphism - Efectos de cristal Igoded
 *
 * Fondos translúcidos con blur para efecto de cristal
 */

export default {
  title: 'Effects/Glassmorphism',
  parameters: {
    layout: 'fullscreen',
  },
}

const backgroundImage = 'linear-gradient(135deg, var(--tellus) 0%, var(--liminal) 25%, var(--senum) 50%, var(--vesper) 75%, var(--tellus) 100%)'

export const IntensidadesDeGlass = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-4xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Glassmorphism
      </h1>

      <p style={{
        color: 'var(--text-body)',
        marginBottom: 'var(--space-xl)',
        maxWidth: '600px',
      }}>
        Efecto de cristal con diferentes niveles de transparencia y blur.
        Ideal para overlays, modales y elementos flotantes.
      </p>

      <div style={{
        background: backgroundImage,
        padding: 'var(--space-2xl)',
        borderRadius: 'var(--radius-xl)',
        display: 'flex',
        gap: 'var(--space-xl)',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        {[
          { name: 'light', label: 'Light' },
          { name: 'medium', label: 'Medium' },
          { name: 'heavy', label: 'Heavy' },
        ].map(({ name, label }) => (
          <div key={name} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-sm)',
          }}>
            <div style={{
              width: '180px',
              height: '180px',
              background: `var(--glass-${name})`,
              backdropFilter: 'var(--blur-md)',
              WebkitBackdropFilter: 'var(--blur-md)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-heading)',
              fontWeight: 'var(--fw-semibold)',
            }}>
              {label}
            </div>
            <code style={{
              color: 'var(--text-heading)',
              fontSize: 'var(--text-xs)',
              background: 'var(--glass-medium)',
              padding: 'var(--space-2xs) var(--space-xs)',
              borderRadius: 'var(--radius-sm)',
            }}>
              --glass-{name}
            </code>
          </div>
        ))}
      </div>
    </div>
  ),
}

export const GlassPorColor = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Glass Tintado por Color Cardinal
      </h2>

      <div style={{
        background: backgroundImage,
        padding: 'var(--space-2xl)',
        borderRadius: 'var(--radius-xl)',
        display: 'flex',
        gap: 'var(--space-xl)',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        {['tellus', 'liminal', 'senum', 'vesper'].map(color => (
          <div key={color} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-sm)',
          }}>
            <div style={{
              width: '150px',
              height: '150px',
              background: `var(--glass-${color})`,
              backdropFilter: 'var(--blur-md)',
              WebkitBackdropFilter: 'var(--blur-md)',
              borderRadius: 'var(--radius-lg)',
              border: `1px solid var(--${color})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-heading)',
              fontWeight: 'var(--fw-semibold)',
              textTransform: 'capitalize',
            }}>
              {color}
            </div>
            <code style={{
              color: 'var(--text-heading)',
              fontSize: 'var(--text-xs)',
              background: 'var(--glass-medium)',
              padding: 'var(--space-2xs) var(--space-xs)',
              borderRadius: 'var(--radius-sm)',
            }}>
              --glass-{color}
            </code>
          </div>
        ))}
      </div>
    </div>
  ),
}

export const NivelesDeBlur = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Niveles de Blur
      </h2>

      <div style={{
        background: backgroundImage,
        padding: 'var(--space-2xl)',
        borderRadius: 'var(--radius-xl)',
        display: 'flex',
        gap: 'var(--space-xl)',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        {[
          { name: 'blur-sm', label: 'Small', value: 'blur(4px)' },
          { name: 'blur-md', label: 'Medium', value: 'blur(8px)' },
          { name: 'blur-lg', label: 'Large', value: 'blur(16px)' },
          { name: 'blur-xl', label: 'X-Large', value: 'blur(24px)' },
        ].map(({ name, label, value }) => (
          <div key={name} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-sm)',
          }}>
            <div style={{
              width: '140px',
              height: '140px',
              background: 'var(--glass-medium)',
              backdropFilter: `var(--${name})`,
              WebkitBackdropFilter: `var(--${name})`,
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-heading)',
            }}>
              <span style={{ fontWeight: 'var(--fw-semibold)' }}>{label}</span>
              <span style={{ fontSize: 'var(--text-xs)', opacity: 0.8 }}>{value}</span>
            </div>
            <code style={{
              color: 'var(--text-heading)',
              fontSize: 'var(--text-xs)',
              background: 'var(--glass-medium)',
              padding: 'var(--space-2xs) var(--space-xs)',
              borderRadius: 'var(--radius-sm)',
            }}>
              --{name}
            </code>
          </div>
        ))}
      </div>
    </div>
  ),
}

export const EjemploModal = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Ejemplo: Modal con Glassmorphism
      </h2>

      <div style={{
        background: backgroundImage,
        padding: 'var(--space-3xl)',
        borderRadius: 'var(--radius-xl)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
      }}>
        <div style={{
          background: 'var(--glass-heavy)',
          backdropFilter: 'var(--blur-lg)',
          WebkitBackdropFilter: 'var(--blur-lg)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--glass-border)',
          padding: 'var(--space-xl)',
          maxWidth: '400px',
          boxShadow: 'var(--shadow-xl)',
        }}>
          <h3 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-xl)',
            color: 'var(--text-heading)',
            marginBottom: 'var(--space-md)',
          }}>
            Modal Glass
          </h3>
          <p style={{
            color: 'var(--text-body)',
            marginBottom: 'var(--space-lg)',
            lineHeight: 'var(--lh-relaxed)',
          }}>
            Este es un ejemplo de modal usando el efecto glassmorphism.
            El contenido detrás se ve difuminado, creando profundidad visual.
          </p>
          <div style={{
            display: 'flex',
            gap: 'var(--space-sm)',
            justifyContent: 'flex-end',
          }}>
            <button style={{
              padding: 'var(--space-sm) var(--space-md)',
              background: 'transparent',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-body)',
              cursor: 'pointer',
            }}>
              Cancelar
            </button>
            <button style={{
              padding: 'var(--space-sm) var(--space-md)',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-on-accent)',
              cursor: 'pointer',
              fontWeight: 'var(--fw-semibold)',
            }}>
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  ),
}
