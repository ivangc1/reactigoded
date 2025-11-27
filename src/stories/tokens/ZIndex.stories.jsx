/**
 * ZIndex - Sistema de capas y profundidad Igoded
 */

export default {
  title: 'Tokens/ZIndex',
  parameters: {
    layout: 'fullscreen',
  },
}

const zIndexScale = [
  { name: 'z-behind', value: '-1', desc: 'Detrás del contenido' },
  { name: 'z-base', value: '0', desc: 'Nivel base' },
  { name: 'z-raised', value: '10', desc: 'Ligeramente elevado' },
  { name: 'z-dropdown', value: '100', desc: 'Dropdowns y popovers' },
  { name: 'z-sticky', value: '200', desc: 'Headers sticky' },
  { name: 'z-modal-backdrop', value: '300', desc: 'Fondo de modal' },
  { name: 'z-modal', value: '400', desc: 'Contenido de modal' },
  { name: 'z-toast', value: '500', desc: 'Notificaciones toast' },
  { name: 'z-tooltip', value: '600', desc: 'Tooltips' },
  { name: 'z-max', value: '9999', desc: 'Máxima prioridad' },
]

export const EscalaDeZIndex = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-4xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Z-Index
      </h1>

      <p style={{
        color: 'var(--text-body)',
        marginBottom: 'var(--space-xl)',
        maxWidth: '600px',
      }}>
        Sistema de capas para controlar la superposición de elementos.
        Usar estas variables garantiza consistencia en todo el proyecto.
      </p>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-sm)',
      }}>
        {zIndexScale.map(({ name, value, desc }) => (
          <div key={name} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            padding: 'var(--space-sm) var(--space-md)',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
          }}>
            <code style={{
              color: 'var(--accent)',
              fontSize: 'var(--text-sm)',
              minWidth: '180px',
            }}>
              --{name}
            </code>
            <span style={{
              color: 'var(--text-heading)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--fw-semibold)',
              minWidth: '60px',
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
        ))}
      </div>
    </div>
  ),
}

export const VisualizacionDePilas = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Visualización de Capas
      </h2>

      <div style={{
        position: 'relative',
        height: '400px',
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        {/* Base content */}
        <div style={{
          position: 'absolute',
          inset: 'var(--space-lg)',
          background: 'var(--neutral-800)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 'var(--z-base)',
        }}>
          <span style={{ color: 'var(--text-muted)' }}>z-base (0)</span>
        </div>

        {/* Raised element */}
        <div style={{
          position: 'absolute',
          top: '60px',
          left: '60px',
          width: '150px',
          height: '80px',
          background: 'var(--primary)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 'var(--z-raised)',
          boxShadow: 'var(--shadow-md)',
        }}>
          <span style={{ color: 'var(--text-on-primary)', fontSize: 'var(--text-sm)' }}>z-raised (10)</span>
        </div>

        {/* Dropdown */}
        <div style={{
          position: 'absolute',
          top: '100px',
          left: '100px',
          width: '180px',
          padding: 'var(--space-md)',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-md)',
          zIndex: 'var(--z-dropdown)',
          boxShadow: 'var(--shadow-lg)',
        }}>
          <span style={{ color: 'var(--text-body)', fontSize: 'var(--text-sm)' }}>z-dropdown (100)</span>
        </div>

        {/* Modal backdrop simulation */}
        <div style={{
          position: 'absolute',
          top: '150px',
          right: '40px',
          width: '200px',
          height: '150px',
          background: 'var(--overlay-medium)',
          borderRadius: 'var(--radius-md)',
          zIndex: 'var(--z-modal-backdrop)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ color: 'var(--text-heading)', fontSize: 'var(--text-sm)' }}>z-modal-backdrop</span>
        </div>

        {/* Modal */}
        <div style={{
          position: 'absolute',
          top: '180px',
          right: '60px',
          width: '160px',
          padding: 'var(--space-md)',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-md)',
          zIndex: 'var(--z-modal)',
          boxShadow: 'var(--shadow-xl)',
        }}>
          <span style={{ color: 'var(--text-body)', fontSize: 'var(--text-sm)' }}>z-modal (400)</span>
        </div>

        {/* Toast */}
        <div style={{
          position: 'absolute',
          bottom: 'var(--space-lg)',
          right: 'var(--space-lg)',
          padding: 'var(--space-sm) var(--space-md)',
          background: 'var(--success)',
          borderRadius: 'var(--radius-md)',
          zIndex: 'var(--z-toast)',
        }}>
          <span style={{ color: 'white', fontSize: 'var(--text-sm)' }}>z-toast (500)</span>
        </div>

        {/* Tooltip */}
        <div style={{
          position: 'absolute',
          top: 'var(--space-lg)',
          right: 'var(--space-lg)',
          padding: 'var(--space-xs) var(--space-sm)',
          background: 'var(--neutral-900)',
          borderRadius: 'var(--radius-sm)',
          zIndex: 'var(--z-tooltip)',
        }}>
          <span style={{ color: 'var(--text-heading)', fontSize: 'var(--text-xs)' }}>z-tooltip (600)</span>
        </div>
      </div>
    </div>
  ),
}
