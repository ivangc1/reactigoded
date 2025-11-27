/**
 * Neumorphism - Efectos neumórficos Igoded
 *
 * Sombras suaves que simulan elementos elevados o hundidos
 */

export default {
  title: 'Effects/Neumorphism',
  parameters: {
    layout: 'fullscreen',
  },
}

export const EstadosNeumorfiicos = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-4xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Neumorphism
      </h1>

      <p style={{
        color: 'var(--text-body)',
        marginBottom: 'var(--space-xl)',
        maxWidth: '600px',
      }}>
        Efectos de sombra suave que crean la ilusión de elementos que sobresalen
        o se hunden en la superficie. Ideal para botones y controles interactivos.
      </p>

      <div style={{
        background: 'var(--bg-surface)',
        padding: 'var(--space-2xl)',
        borderRadius: 'var(--radius-xl)',
        display: 'flex',
        gap: 'var(--space-2xl)',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-md)',
        }}>
          <div style={{
            width: '150px',
            height: '150px',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--neuo-raised)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-heading)',
            fontWeight: 'var(--fw-semibold)',
          }}>
            Raised
          </div>
          <code style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
            --neuo-raised
          </code>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            Estado normal
          </span>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-md)',
        }}>
          <div style={{
            width: '150px',
            height: '150px',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--neuo-raised-hover)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-heading)',
            fontWeight: 'var(--fw-semibold)',
          }}>
            Raised Hover
          </div>
          <code style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
            --neuo-raised-hover
          </code>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            Hover elevado
          </span>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-md)',
        }}>
          <div style={{
            width: '150px',
            height: '150px',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--neuo-pressed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-heading)',
            fontWeight: 'var(--fw-semibold)',
          }}>
            Pressed
          </div>
          <code style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
            --neuo-pressed
          </code>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            Estado presionado
          </span>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-md)',
        }}>
          <div style={{
            width: '150px',
            height: '150px',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--neuo-flat)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-heading)',
            fontWeight: 'var(--fw-semibold)',
          }}>
            Flat
          </div>
          <code style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
            --neuo-flat
          </code>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            Estado plano
          </span>
        </div>
      </div>
    </div>
  ),
}

export const BotonNeumórfico = {
  render: () => {
    const NeuButton = ({ children }) => {
      return (
        <button
          style={{
            width: '200px',
            height: '60px',
            background: 'var(--bg-surface)',
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--neuo-raised)',
            color: 'var(--text-heading)',
            fontFamily: 'var(--font-base)',
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--fw-semibold)',
            cursor: 'pointer',
            transition: 'var(--transition-normal)',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.boxShadow = 'var(--neuo-pressed)'
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.boxShadow = 'var(--neuo-raised-hover)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = 'var(--neuo-raised-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'var(--neuo-raised)'
          }}
        >
          {children}
        </button>
      )
    }

    return (
      <div style={{ padding: 'var(--space-lg)' }}>
        <h2 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'var(--text-2xl)',
          color: 'var(--text-heading)',
          marginBottom: 'var(--space-lg)',
        }}>
          Botón Neumórfico Interactivo
        </h2>

        <p style={{
          color: 'var(--text-body)',
          marginBottom: 'var(--space-lg)',
        }}>
          Haz clic en el botón para ver la transición entre estados.
        </p>

        <div style={{
          background: 'var(--bg-surface)',
          padding: 'var(--space-2xl)',
          borderRadius: 'var(--radius-xl)',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <NeuButton>Click me</NeuButton>
        </div>
      </div>
    )
  },
}

export const ControlesNeumorficos = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Controles Neumórficos
      </h2>

      <div style={{
        background: 'var(--bg-surface)',
        padding: 'var(--space-2xl)',
        borderRadius: 'var(--radius-xl)',
        display: 'flex',
        gap: 'var(--space-xl)',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        {/* Toggle neumórfico */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-sm)',
        }}>
          <div style={{
            width: '80px',
            height: '40px',
            background: 'var(--bg-surface)',
            borderRadius: '20px',
            boxShadow: 'var(--neuo-pressed)',
            display: 'flex',
            alignItems: 'center',
            padding: '4px',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'var(--accent)',
              borderRadius: '50%',
              boxShadow: 'var(--neuo-raised)',
            }} />
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            Toggle
          </span>
        </div>

        {/* Slider neumórfico */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-sm)',
        }}>
          <div style={{
            width: '200px',
            height: '12px',
            background: 'var(--bg-surface)',
            borderRadius: '6px',
            boxShadow: 'var(--neuo-pressed)',
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
          }}>
            <div style={{
              width: '60%',
              height: '100%',
              background: 'var(--accent)',
              borderRadius: '6px 0 0 6px',
            }} />
            <div style={{
              width: '24px',
              height: '24px',
              background: 'var(--bg-surface)',
              borderRadius: '50%',
              boxShadow: 'var(--neuo-raised)',
              position: 'absolute',
              left: 'calc(60% - 12px)',
            }} />
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            Slider
          </span>
        </div>

        {/* Input circular neumórfico */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-sm)',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'var(--bg-surface)',
            borderRadius: '50%',
            boxShadow: 'var(--neuo-raised)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              background: 'var(--bg-surface)',
              borderRadius: '50%',
              boxShadow: 'var(--neuo-pressed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              fontSize: 'var(--text-lg)',
              fontWeight: 'var(--fw-bold)',
            }}>
              75
            </div>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            Dial
          </span>
        </div>
      </div>
    </div>
  ),
}
