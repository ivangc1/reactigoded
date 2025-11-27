/**
 * Colors - Sistema cromático Igoded
 *
 * Basado en 4 colores cardinales con armonía perfecta en OKLCH
 * (L=0.565, C=0.102 para todos)
 */

export default {
  title: 'Foundations/Colors',
  parameters: {
    layout: 'fullscreen',
  },
}

const ColorSwatch = ({ name, variable, hex, description }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
    padding: 'var(--space-sm)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-surface)',
  }}>
    <div style={{
      width: '80px',
      height: '80px',
      borderRadius: 'var(--radius-md)',
      background: `var(${variable})`,
      boxShadow: 'var(--shadow-md)',
    }} />
    <div>
      <div style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-lg)',
        color: 'var(--text-heading)',
      }}>
        {name}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: 'var(--text-sm)',
        color: 'var(--text-muted)',
      }}>
        {variable} → {hex}
      </div>
      {description && (
        <div style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--text-body)',
          marginTop: 'var(--space-2xs)',
          maxWidth: '300px',
        }}>
          {description}
        </div>
      )}
    </div>
  </div>
)

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 'var(--space-xl)' }}>
    <h2 style={{
      fontFamily: 'var(--font-heading)',
      fontSize: 'var(--text-2xl)',
      color: 'var(--text-heading)',
      marginBottom: 'var(--space-md)',
      paddingBottom: 'var(--space-xs)',
      borderBottom: '1px solid var(--border-default)',
    }}>
      {title}
    </h2>
    {children}
  </div>
)

export const ColoresCardinales = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-4xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Colores Cardinales Igoded
      </h1>

      <p style={{
        color: 'var(--text-body)',
        marginBottom: 'var(--space-xl)',
        maxWidth: '700px',
        lineHeight: 'var(--lh-relaxed)',
      }}>
        4 colores cardinales con la misma luminosidad y saturación en OKLCH (L=0.565, C=0.102)
        para armonía perfecta. Cada color tiene un significado y un rol específico.
      </p>

      <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
        <ColorSwatch
          name="Tellus"
          variable="--tellus"
          hex="#6E7E34"
          description="Verde oliva. Estabilidad, lo tangible. PRIMARY en modo oscuro."
        />
        <ColorSwatch
          name="Liminal"
          variable="--liminal"
          hex="#038978"
          description="Teal/cian. Fluidez, transición. ACCENT en modo oscuro."
        />
        <ColorSwatch
          name="Senum"
          variable="--senum"
          hex="#5276B2"
          description="Azul sereno. Pensamiento, claridad. PRIMARY en modo claro."
        />
        <ColorSwatch
          name="Vesper"
          variable="--vesper"
          hex="#7A5DAD"
          description="Violeta crepuscular. Pasión, transformación. ACCENT en modo claro."
        />
      </div>
    </div>
  ),
}

export const ColoresAdaptativos = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <Section title="Colores Adaptativos">
        <p style={{
          color: 'var(--text-body)',
          marginBottom: 'var(--space-lg)',
        }}>
          Estos colores cambian automáticamente según el modo (dark/light).
          Usa el selector de tema en la toolbar para ver el cambio.
        </p>

        <div style={{ display: 'grid', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
          <ColorSwatch
            name="Primary"
            variable="--primary"
            hex="Tellus (dark) / Senum (light)"
            description="Color principal del modo actual. Usar para botones, headers, elementos de marca."
          />
          <ColorSwatch
            name="Accent"
            variable="--accent"
            hex="Liminal (dark) / Vesper (light)"
            description="Color de énfasis. Usar para links, CTAs, estados activos."
          />
        </div>
      </Section>
    </div>
  ),
}

export const Fondos = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <Section title="Colores de Fondo">
        <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
          <ColorSwatch
            name="Base"
            variable="--bg-base"
            hex="#0c1515 (dark)"
            description="Fondo principal de la página. Tintado con el accent del modo."
          />
          <ColorSwatch
            name="Surface"
            variable="--bg-surface"
            hex="#101b1b (dark)"
            description="Fondo de tarjetas y contenedores."
          />
          <ColorSwatch
            name="Elevated"
            variable="--bg-elevated"
            hex="#1a2828 (dark)"
            description="Fondo de elementos elevados (modales, dropdowns)."
          />
          <ColorSwatch
            name="Muted"
            variable="--bg-muted"
            hex="#152020 (dark)"
            description="Fondo sutil para destacar zonas."
          />
        </div>
      </Section>
    </div>
  ),
}

export const NeutrosTintados = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <Section title="Neutros Tintados (15% saturación)">
        <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-md)' }}>
          Grises con un toque del accent del modo para mayor armonía.
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: 'var(--space-sm)',
        }}>
          {['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'].map(shade => (
            <div key={shade} style={{
              background: `var(--neutral-${shade})`,
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
            }}>
              <span style={{
                color: parseInt(shade) < 500 ? 'var(--neutral-900)' : 'var(--neutral-50)',
                fontSize: 'var(--text-sm)',
                fontFamily: 'var(--font-mono, monospace)',
              }}>
                {shade}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Neutros Intensos (30% saturación)">
        <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-md)' }}>
          Más color, más personalidad. Notable tinte del accent.
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: 'var(--space-sm)',
        }}>
          {['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'].map(shade => (
            <div key={shade} style={{
              background: `var(--neutral-intense-${shade})`,
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
            }}>
              <span style={{
                color: parseInt(shade) < 500 ? 'var(--neutral-900)' : 'var(--neutral-50)',
                fontSize: 'var(--text-sm)',
                fontFamily: 'var(--font-mono, monospace)',
              }}>
                {shade}
              </span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  ),
}

export const EstadosSemanticos = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <Section title="Estados Semánticos">
        <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
          <ColorSwatch
            name="Success"
            variable="--success"
            hex="Verde éxito"
            description="Confirmaciones, operaciones exitosas, estados positivos."
          />
          <ColorSwatch
            name="Warning"
            variable="--warning"
            hex="Amarillo/naranja advertencia"
            description="Advertencias, acciones que requieren atención."
          />
          <ColorSwatch
            name="Danger"
            variable="--danger"
            hex="Rojo peligro"
            description="Errores, acciones destructivas, estados críticos."
          />
          <ColorSwatch
            name="Info"
            variable="--info"
            hex="Azul informativo"
            description="Información neutral, ayuda, tips."
          />
        </div>
      </Section>
    </div>
  ),
}

export const ColoresDeTexto = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <Section title="Colores de Texto">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <span style={{
              color: 'var(--text-heading)',
              fontSize: 'var(--text-xl)',
              fontFamily: 'var(--font-heading)',
              minWidth: '200px',
            }}>
              Heading Text
            </span>
            <code style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              --text-heading
            </code>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <span style={{
              color: 'var(--text-body)',
              fontSize: 'var(--text-base)',
              minWidth: '200px',
            }}>
              Body Text
            </span>
            <code style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              --text-body
            </code>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <span style={{
              color: 'var(--text-muted)',
              fontSize: 'var(--text-base)',
              minWidth: '200px',
            }}>
              Muted Text
            </span>
            <code style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              --text-muted
            </code>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            background: 'var(--primary)',
            padding: 'var(--space-sm)',
            borderRadius: 'var(--radius-md)',
            width: 'fit-content',
          }}>
            <span style={{
              color: 'var(--text-on-primary)',
              fontSize: 'var(--text-base)',
              minWidth: '200px',
            }}>
              Text on Primary
            </span>
            <code style={{ color: 'var(--text-on-primary)', fontSize: 'var(--text-sm)', opacity: 0.8 }}>
              --text-on-primary
            </code>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            background: 'var(--accent)',
            padding: 'var(--space-sm)',
            borderRadius: 'var(--radius-md)',
            width: 'fit-content',
          }}>
            <span style={{
              color: 'var(--text-on-accent)',
              fontSize: 'var(--text-base)',
              minWidth: '200px',
            }}>
              Text on Accent
            </span>
            <code style={{ color: 'var(--text-on-accent)', fontSize: 'var(--text-sm)', opacity: 0.8 }}>
              --text-on-accent
            </code>
          </div>
        </div>
      </Section>
    </div>
  ),
}
