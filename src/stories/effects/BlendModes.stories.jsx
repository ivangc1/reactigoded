/**
 * BlendModes - Modos de fusión CSS Igoded
 *
 * 15 modos de mezcla para efectos visuales avanzados
 */

export default {
  title: 'Effects/BlendModes',
  parameters: {
    layout: 'fullscreen',
  },
}

const blendModes = [
  { name: 'multiply', desc: 'Oscurece mezclando colores' },
  { name: 'darken', desc: 'Mantiene el más oscuro' },
  { name: 'color-burn', desc: 'Quemado de color intenso' },
  { name: 'screen', desc: 'Aclara como proyección' },
  { name: 'lighten', desc: 'Mantiene el más claro' },
  { name: 'color-dodge', desc: 'Sobreexposición' },
  { name: 'overlay', desc: 'Combina multiply y screen' },
  { name: 'hard-light', desc: 'Luz dura dramática' },
  { name: 'soft-light', desc: 'Luz suave sutil' },
  { name: 'difference', desc: 'Invierte según brillo' },
  { name: 'exclusion', desc: 'Similar a difference, suave' },
  { name: 'hue', desc: 'Solo el tono' },
  { name: 'saturation', desc: 'Solo la saturación' },
  { name: 'color', desc: 'Tono + saturación' },
  { name: 'luminosity', desc: 'Solo luminosidad' },
]

const backgroundImage = 'linear-gradient(135deg, var(--tellus) 0%, var(--liminal) 50%, var(--senum) 100%)'

export const TodosLosModosBlend = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-4xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Blend Modes
      </h1>

      <p style={{
        color: 'var(--text-body)',
        marginBottom: 'var(--space-xl)',
        maxWidth: '600px',
      }}>
        Modos de mezcla para crear efectos visuales interesantes.
        Útiles para overlays, imágenes y efectos artísticos.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 'var(--space-lg)',
      }}>
        {blendModes.map(({ name, desc }) => (
          <div key={name} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-sm)',
          }}>
            <div style={{
              position: 'relative',
              width: '100%',
              height: '120px',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              background: backgroundImage,
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'var(--vesper)',
                mixBlendMode: name,
              }} />
            </div>
            <div>
              <code style={{
                color: 'var(--accent)',
                fontSize: 'var(--text-sm)',
                display: 'block',
              }}>
                {name}
              </code>
              <span style={{
                color: 'var(--text-muted)',
                fontSize: 'var(--text-xs)',
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

export const GruposDeBlend = {
  render: () => {
    const groups = [
      {
        title: 'Oscurecen',
        modes: ['multiply', 'darken', 'color-burn'],
        color: 'var(--danger)',
      },
      {
        title: 'Aclaran',
        modes: ['screen', 'lighten', 'color-dodge'],
        color: 'var(--warning)',
      },
      {
        title: 'Contraste',
        modes: ['overlay', 'hard-light', 'soft-light'],
        color: 'var(--success)',
      },
      {
        title: 'Inversión',
        modes: ['difference', 'exclusion'],
        color: 'var(--info)',
      },
      {
        title: 'Componente',
        modes: ['hue', 'saturation', 'color', 'luminosity'],
        color: 'var(--accent)',
      },
    ]

    return (
      <div style={{ padding: 'var(--space-lg)' }}>
        <h2 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'var(--text-2xl)',
          color: 'var(--text-heading)',
          marginBottom: 'var(--space-xl)',
        }}>
          Grupos de Blend Modes
        </h2>

        {groups.map(({ title, modes, color }) => (
          <div key={title} style={{ marginBottom: 'var(--space-2xl)' }}>
            <h3 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-xl)',
              color: 'var(--text-heading)',
              marginBottom: 'var(--space-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
            }}>
              <span style={{
                width: '12px',
                height: '12px',
                background: color,
                borderRadius: '50%',
              }} />
              {title}
            </h3>
            <div style={{
              display: 'flex',
              gap: 'var(--space-lg)',
              flexWrap: 'wrap',
            }}>
              {modes.map(mode => (
                <div key={mode} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--space-xs)',
                }}>
                  <div style={{
                    position: 'relative',
                    width: '100px',
                    height: '100px',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    background: backgroundImage,
                  }}>
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: color,
                      mixBlendMode: mode,
                    }} />
                  </div>
                  <code style={{
                    color: 'var(--text-muted)',
                    fontSize: 'var(--text-xs)',
                  }}>
                    {mode}
                  </code>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  },
}

export const EjemploConImagen = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Ejemplo: Overlay con Blend Mode
      </h2>

      <div style={{
        display: 'flex',
        gap: 'var(--space-lg)',
        flexWrap: 'wrap',
      }}>
        {['overlay', 'multiply', 'screen', 'color'].map(mode => (
          <div key={mode} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-sm)',
          }}>
            <div style={{
              position: 'relative',
              width: '200px',
              height: '200px',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              background: 'linear-gradient(45deg, #333 25%, #666 50%, #999 75%, #ccc 100%)',
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                mixBlendMode: mode,
              }} />
            </div>
            <code style={{
              color: 'var(--accent)',
              fontSize: 'var(--text-sm)',
            }}>
              mix-blend-mode: {mode}
            </code>
          </div>
        ))}
      </div>
    </div>
  ),
}
