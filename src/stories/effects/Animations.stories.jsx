/**
 * Animations - Animaciones CSS Igoded
 *
 * Keyframes y animaciones predefinidas
 */

export default {
  title: 'Effects/Animations',
  parameters: {
    layout: 'fullscreen',
  },
}

const AnimBox = ({ className, label, style = {} }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    padding: 'var(--space-lg)',
    background: 'var(--bg-surface)',
    borderRadius: 'var(--radius-lg)',
    minWidth: '150px',
  }}>
    <div
      className={className}
      style={{
        width: '60px',
        height: '60px',
        background: 'var(--accent)',
        borderRadius: 'var(--radius-md)',
        ...style,
      }}
    />
    <code style={{
      color: 'var(--text-muted)',
      fontSize: 'var(--text-xs)',
    }}>
      {className}
    </code>
  </div>
)

export const AnimacionesBasicas = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-4xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Animaciones
      </h1>

      <p style={{
        color: 'var(--text-body)',
        marginBottom: 'var(--space-xl)',
        maxWidth: '600px',
      }}>
        Animaciones CSS predefinidas para dar vida a tus componentes.
        Aplica la clase correspondiente para activar la animación.
      </p>

      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-md)',
      }}>
        Animaciones Continuas
      </h2>

      <div style={{
        display: 'flex',
        gap: 'var(--space-lg)',
        flexWrap: 'wrap',
        marginBottom: 'var(--space-2xl)',
      }}>
        <AnimBox className="anim-spin" label="Spin" />
        <AnimBox className="anim-pulse" label="Pulse" />
        <AnimBox className="anim-pulse-scale" label="Pulse Scale" />
        <AnimBox className="anim-bounce" label="Bounce" />
        <AnimBox className="anim-ping" label="Ping" />
      </div>
    </div>
  ),
}

export const AnimacionesDeEntrada = {
  render: () => {
    // Componente que reinicia animación al hacer hover
    const AnimatedEntry = ({ className, label }) => {
      const handleMouseEnter = (e) => {
        const box = e.currentTarget.querySelector('.anim-box')
        box.style.animation = 'none'
        // Trigger reflow
        box.offsetHeight
        box.style.animation = ''
      }

      return (
        <div
          onMouseEnter={handleMouseEnter}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            padding: 'var(--space-lg)',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            minWidth: '150px',
            cursor: 'pointer',
          }}
        >
          <div
            className={`anim-box ${className}`}
            style={{
              width: '60px',
              height: '60px',
              background: 'var(--primary)',
              borderRadius: 'var(--radius-md)',
            }}
          />
          <code style={{
            color: 'var(--text-muted)',
            fontSize: 'var(--text-xs)',
          }}>
            {className}
          </code>
          <span style={{
            color: 'var(--text-muted)',
            fontSize: 'var(--text-xs)',
            opacity: 0.7,
          }}>
            (hover para repetir)
          </span>
        </div>
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
          Animaciones de Entrada
        </h2>

        <div style={{
          display: 'flex',
          gap: 'var(--space-lg)',
          flexWrap: 'wrap',
        }}>
          <AnimatedEntry className="anim-fade-in" label="Fade In" />
          <AnimatedEntry className="anim-scale-in" label="Scale In" />
          <AnimatedEntry className="anim-slide-down" label="Slide Down" />
          <AnimatedEntry className="anim-slide-up" label="Slide Up" />
          <AnimatedEntry className="anim-slide-left" label="Slide Left" />
          <AnimatedEntry className="anim-slide-right" label="Slide Right" />
        </div>
      </div>
    )
  },
}

export const AnimacionesDeFeedback = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Animaciones de Feedback
      </h2>

      <div style={{
        display: 'flex',
        gap: 'var(--space-lg)',
        flexWrap: 'wrap',
      }}>
        <AnimBox className="anim-shake" label="Shake" />
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          padding: 'var(--space-lg)',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          minWidth: '150px',
        }}>
          <div style={{
            width: '100%',
            height: '20px',
            background: 'var(--neutral-700)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}>
            <div
              className="anim-shimmer"
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, var(--neutral-500), transparent)',
              }}
            />
          </div>
          <code style={{
            color: 'var(--text-muted)',
            fontSize: 'var(--text-xs)',
          }}>
            anim-shimmer
          </code>
        </div>
      </div>
    </div>
  ),
}

export const Spinner = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Spinner / Loading
      </h2>

      <div style={{
        display: 'flex',
        gap: 'var(--space-2xl)',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        {['24px', '40px', '60px', '80px'].map(size => (
          <div key={size} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-sm)',
          }}>
            <div
              className="anim-spin"
              style={{
                width: size,
                height: size,
                border: '3px solid var(--neutral-600)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
              }}
            />
            <span style={{
              color: 'var(--text-muted)',
              fontSize: 'var(--text-xs)',
            }}>
              {size}
            </span>
          </div>
        ))}
      </div>
    </div>
  ),
}

export const SkeletonLoading = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Skeleton Loading
      </h2>

      <div style={{
        background: 'var(--bg-surface)',
        padding: 'var(--space-lg)',
        borderRadius: 'var(--radius-lg)',
        maxWidth: '400px',
      }}>
        {/* Avatar skeleton */}
        <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: 'var(--neutral-700)',
            overflow: 'hidden',
          }}>
            <div
              className="anim-shimmer"
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, var(--neutral-600), transparent)',
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              height: '16px',
              background: 'var(--neutral-700)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 'var(--space-xs)',
              width: '60%',
              overflow: 'hidden',
            }}>
              <div className="anim-shimmer" style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, var(--neutral-600), transparent)',
              }} />
            </div>
            <div style={{
              height: '12px',
              background: 'var(--neutral-700)',
              borderRadius: 'var(--radius-sm)',
              width: '40%',
              overflow: 'hidden',
            }}>
              <div className="anim-shimmer" style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, var(--neutral-600), transparent)',
              }} />
            </div>
          </div>
        </div>

        {/* Text lines skeleton */}
        {[100, 90, 75].map((width, i) => (
          <div key={i} style={{
            height: '14px',
            background: 'var(--neutral-700)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 'var(--space-sm)',
            width: `${width}%`,
            overflow: 'hidden',
          }}>
            <div className="anim-shimmer" style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, var(--neutral-600), transparent)',
            }} />
          </div>
        ))}
      </div>
    </div>
  ),
}

export const VariablesDeAnimacion = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Variables de Animación
      </h2>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-md)',
      }}>
        {[
          { name: '--anim-spin', desc: 'Rotación 360° infinita' },
          { name: '--anim-pulse', desc: 'Pulso de opacidad' },
          { name: '--anim-pulse-scale', desc: 'Pulso con escala' },
          { name: '--anim-shimmer', desc: 'Efecto shimmer para skeletons' },
          { name: '--anim-fade-in', desc: 'Entrada con fade' },
          { name: '--anim-fade-out', desc: 'Salida con fade' },
          { name: '--anim-slide-down', desc: 'Entrada desde arriba' },
          { name: '--anim-slide-up', desc: 'Entrada desde abajo' },
          { name: '--anim-slide-left', desc: 'Entrada desde derecha' },
          { name: '--anim-slide-right', desc: 'Entrada desde izquierda' },
          { name: '--anim-shake', desc: 'Vibración de error' },
          { name: '--anim-bounce', desc: 'Rebote' },
          { name: '--anim-scale-in', desc: 'Entrada con escala' },
          { name: '--anim-ping', desc: 'Pulso expansivo' },
        ].map(({ name, desc }) => (
          <div key={name} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            padding: 'var(--space-sm)',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
          }}>
            <code style={{
              color: 'var(--accent)',
              fontSize: 'var(--text-sm)',
              minWidth: '180px',
            }}>
              {name}
            </code>
            <span style={{
              color: 'var(--text-muted)',
              fontSize: 'var(--text-sm)',
            }}>
              {desc}
            </span>
          </div>
        ))}
      </div>
    </div>
  ),
}
