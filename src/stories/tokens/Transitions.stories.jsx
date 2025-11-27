/**
 * Transitions - Sistema de transiciones Igoded
 */

export default {
  title: 'Tokens/Transitions',
  parameters: {
    layout: 'fullscreen',
  },
}

const transitions = [
  { name: 'transition-fast', value: '0.15s ease', desc: 'Cambios rápidos (hover states)' },
  { name: 'transition-normal', value: '0.3s ease', desc: 'Transiciones estándar' },
  { name: 'transition-slow', value: '0.5s ease', desc: 'Animaciones lentas' },
]

export const TiposDeTransicion = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-4xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Transiciones
      </h1>

      <p style={{
        color: 'var(--text-body)',
        marginBottom: 'var(--space-xl)',
        maxWidth: '600px',
      }}>
        Variables de transición para animaciones suaves.
        Pasa el cursor sobre los elementos para ver el efecto.
      </p>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-xl)',
      }}>
        {transitions.map(({ name, value, desc }) => (
          <div key={name} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-xl)',
          }}>
            <div
              style={{
                width: '120px',
                height: '120px',
                background: 'var(--accent)',
                borderRadius: 'var(--radius-md)',
                transition: `var(--${name})`,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)'
                e.currentTarget.style.background = 'var(--primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.background = 'var(--accent)'
              }}
            />
            <div>
              <code style={{
                color: 'var(--accent)',
                fontSize: 'var(--text-base)',
                display: 'block',
                marginBottom: 'var(--space-2xs)',
              }}>
                --{name}
              </code>
              <span style={{
                color: 'var(--text-heading)',
                fontSize: 'var(--text-sm)',
                display: 'block',
              }}>
                {value}
              </span>
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

export const ComparacionDeVelocidades = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Comparación de Velocidades
      </h2>

      <p style={{
        color: 'var(--text-body)',
        marginBottom: 'var(--space-lg)',
      }}>
        Haz hover sobre la fila para ver las tres velocidades simultáneamente.
      </p>

      <div
        style={{
          display: 'flex',
          gap: 'var(--space-xl)',
          padding: 'var(--space-xl)',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.querySelectorAll('.trans-box').forEach((box, i) => {
            box.style.transform = 'translateY(-20px)'
            box.style.background = 'var(--primary)'
          })
        }}
        onMouseLeave={(e) => {
          e.currentTarget.querySelectorAll('.trans-box').forEach((box) => {
            box.style.transform = 'translateY(0)'
            box.style.background = 'var(--accent)'
          })
        }}
      >
        {transitions.map(({ name }) => (
          <div key={name} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-sm)',
          }}>
            <div
              className="trans-box"
              style={{
                width: '80px',
                height: '80px',
                background: 'var(--accent)',
                borderRadius: 'var(--radius-md)',
                transition: `var(--${name})`,
              }}
            />
            <code style={{
              color: 'var(--text-muted)',
              fontSize: 'var(--text-xs)',
            }}>
              {name.replace('transition-', '')}
            </code>
          </div>
        ))}
      </div>
    </div>
  ),
}

export const EjemplosDeUso = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Ejemplos de Uso
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-lg)',
      }}>
        {/* Button hover */}
        <div style={{
          padding: 'var(--space-lg)',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          textAlign: 'center',
        }}>
          <button
            style={{
              padding: 'var(--space-sm) var(--space-lg)',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-on-accent)',
              fontWeight: 'var(--fw-semibold)',
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--primary)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Hover me
          </button>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-sm)' }}>
            transition-fast
          </p>
        </div>

        {/* Card hover */}
        <div
          style={{
            padding: 'var(--space-lg)',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            cursor: 'pointer',
            transition: 'var(--transition-normal)',
            boxShadow: 'var(--shadow-md)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = 'var(--shadow-xl)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'var(--shadow-md)'
          }}
        >
          <h4 style={{ color: 'var(--text-heading)', marginBottom: 'var(--space-xs)' }}>Card Hover</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            transition-normal
          </p>
        </div>

        {/* Expand animation */}
        <div
          style={{
            padding: 'var(--space-lg)',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            cursor: 'pointer',
            transition: 'var(--transition-slow)',
            overflow: 'hidden',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.maxHeight = '200px'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.maxHeight = '100px'
          }}
        >
          <h4 style={{ color: 'var(--text-heading)', marginBottom: 'var(--space-xs)' }}>Expand</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            transition-slow
          </p>
        </div>
      </div>
    </div>
  ),
}
