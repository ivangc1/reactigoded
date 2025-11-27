/**
 * Typography - Sistema tipográfico Igoded
 *
 * Electrolize para títulos (estilo técnico/futurista)
 * Saira para texto (legible con personalidad)
 */

export default {
  title: 'Foundations/Typography',
  parameters: {
    layout: 'fullscreen',
  },
}

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

export const Fuentes = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-4xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Tipografía
      </h1>

      <Section title="Electrolize - Fuente de Títulos">
        <p style={{
          color: 'var(--text-muted)',
          marginBottom: 'var(--space-md)',
          fontSize: 'var(--text-sm)',
        }}>
          --font-heading: 'Electrolize', sans-serif
        </p>
        <div style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'var(--text-3xl)',
          color: 'var(--text-heading)',
          marginBottom: 'var(--space-md)',
        }}>
          ABCDEFGHIJKLMNOPQRSTUVWXYZ
        </div>
        <div style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'var(--text-3xl)',
          color: 'var(--text-heading)',
          marginBottom: 'var(--space-md)',
        }}>
          abcdefghijklmnopqrstuvwxyz
        </div>
        <div style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'var(--text-3xl)',
          color: 'var(--text-heading)',
        }}>
          0123456789 !@#$%^&*()
        </div>
      </Section>

      <Section title="Saira - Fuente Base">
        <p style={{
          color: 'var(--text-muted)',
          marginBottom: 'var(--space-md)',
          fontSize: 'var(--text-sm)',
        }}>
          --font-base: 'Saira', sans-serif
        </p>
        <div style={{
          fontFamily: 'var(--font-base)',
          fontSize: 'var(--text-2xl)',
          color: 'var(--text-body)',
          marginBottom: 'var(--space-md)',
        }}>
          ABCDEFGHIJKLMNOPQRSTUVWXYZ
        </div>
        <div style={{
          fontFamily: 'var(--font-base)',
          fontSize: 'var(--text-2xl)',
          color: 'var(--text-body)',
          marginBottom: 'var(--space-md)',
        }}>
          abcdefghijklmnopqrstuvwxyz
        </div>
        <div style={{
          fontFamily: 'var(--font-base)',
          fontSize: 'var(--text-2xl)',
          color: 'var(--text-body)',
        }}>
          0123456789 !@#$%^&*()
        </div>
      </Section>
    </div>
  ),
}

export const EscalaHeadings = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <Section title="Headings (H1-H6)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-5xl)',
              color: 'var(--text-heading)',
              margin: 0,
            }}>
              Heading 1 - Sistema Igoded
            </h1>
            <code style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
              --text-5xl (3rem / 48px)
            </code>
          </div>

          <div>
            <h2 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-4xl)',
              color: 'var(--text-heading)',
              margin: 0,
            }}>
              Heading 2 - Sistema Igoded
            </h2>
            <code style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
              --text-4xl (2.25rem / 36px)
            </code>
          </div>

          <div>
            <h3 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-3xl)',
              color: 'var(--text-heading)',
              margin: 0,
            }}>
              Heading 3 - Sistema Igoded
            </h3>
            <code style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
              --text-3xl (1.875rem / 30px)
            </code>
          </div>

          <div>
            <h4 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-2xl)',
              color: 'var(--text-heading)',
              margin: 0,
            }}>
              Heading 4 - Sistema Igoded
            </h4>
            <code style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
              --text-2xl (1.5rem / 24px)
            </code>
          </div>

          <div>
            <h5 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-xl)',
              color: 'var(--text-heading)',
              margin: 0,
            }}>
              Heading 5 - Sistema Igoded
            </h5>
            <code style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
              --text-xl (1.25rem / 20px)
            </code>
          </div>

          <div>
            <h6 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-lg)',
              color: 'var(--text-heading)',
              margin: 0,
            }}>
              Heading 6 - Sistema Igoded
            </h6>
            <code style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
              --text-lg (1.125rem / 18px)
            </code>
          </div>
        </div>
      </Section>
    </div>
  ),
}

export const EscalaCompleta = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <Section title="Escala Tipográfica Completa">
        {[
          { name: 'text-xs', size: '0.75rem', px: '12px' },
          { name: 'text-sm', size: '0.875rem', px: '14px' },
          { name: 'text-base', size: '1rem', px: '16px' },
          { name: 'text-lg', size: '1.125rem', px: '18px' },
          { name: 'text-xl', size: '1.25rem', px: '20px' },
          { name: 'text-2xl', size: '1.5rem', px: '24px' },
          { name: 'text-3xl', size: '1.875rem', px: '30px' },
          { name: 'text-4xl', size: '2.25rem', px: '36px' },
          { name: 'text-5xl', size: '3rem', px: '48px' },
        ].map(({ name, size, px }) => (
          <div key={name} style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-sm)',
            padding: 'var(--space-sm)',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
          }}>
            <span style={{
              fontSize: `var(--${name})`,
              color: 'var(--text-body)',
              fontFamily: 'var(--font-base)',
              minWidth: '300px',
            }}>
              El veloz murciélago
            </span>
            <code style={{
              color: 'var(--text-muted)',
              fontSize: 'var(--text-xs)',
              fontFamily: 'var(--font-mono, monospace)',
            }}>
              --{name} ({size} / {px})
            </code>
          </div>
        ))}
      </Section>
    </div>
  ),
}

export const PesosFuente = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <Section title="Pesos de Fuente (Saira)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            padding: 'var(--space-md)',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
          }}>
            <span style={{
              fontFamily: 'var(--font-base)',
              fontWeight: 'var(--fw-normal)',
              fontSize: 'var(--text-xl)',
              color: 'var(--text-body)',
              minWidth: '400px',
            }}>
              Regular (400) - El veloz murciélago hindú
            </span>
            <code style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              --fw-normal
            </code>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            padding: 'var(--space-md)',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
          }}>
            <span style={{
              fontFamily: 'var(--font-base)',
              fontWeight: 'var(--fw-semibold)',
              fontSize: 'var(--text-xl)',
              color: 'var(--text-body)',
              minWidth: '400px',
            }}>
              Semibold (600) - El veloz murciélago hindú
            </span>
            <code style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              --fw-semibold
            </code>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            padding: 'var(--space-md)',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
          }}>
            <span style={{
              fontFamily: 'var(--font-base)',
              fontWeight: 'var(--fw-bold)',
              fontSize: 'var(--text-xl)',
              color: 'var(--text-body)',
              minWidth: '400px',
            }}>
              Bold (700) - El veloz murciélago hindú
            </span>
            <code style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              --fw-bold
            </code>
          </div>
        </div>
      </Section>
    </div>
  ),
}

export const LineHeight = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <Section title="Line Height (Altura de línea)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {[
            { name: 'lh-tight', value: '1.25', desc: 'Compacto - para títulos cortos' },
            { name: 'lh-normal', value: '1.5', desc: 'Normal - uso general' },
            { name: 'lh-relaxed', value: '1.75', desc: 'Relajado - para lectura prolongada' },
          ].map(({ name, value, desc }) => (
            <div key={name} style={{
              padding: 'var(--space-md)',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-sm)',
              }}>
                <code style={{ color: 'var(--accent)', fontSize: 'var(--text-sm)' }}>
                  --{name}: {value}
                </code>
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                  — {desc}
                </span>
              </div>
              <p style={{
                fontFamily: 'var(--font-base)',
                fontSize: 'var(--text-base)',
                lineHeight: `var(--${name})`,
                color: 'var(--text-body)',
                margin: 0,
                maxWidth: '600px',
              }}>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  ),
}
