/**
 * Badge - Componente de insignia
 *
 * Variables CSS para crear badges: contadores, estados y puntos indicadores.
 */

import type { Meta, StoryObj } from '@storybook/react';

const BadgeDemo = () => <div />;

const meta: Meta<typeof BadgeDemo> = {
  title: 'Componentes/Badge',
  component: BadgeDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Sistema de badges para mostrar contadores, estados y notificaciones. Incluye variantes de color, puntos indicadores y posicionamiento en esquina.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof BadgeDemo>;

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
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
);

const CodeBlock = ({ code }: { code: string }) => (
  <pre style={{
    background: 'var(--bg-elevated)',
    padding: 'var(--space-sm)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-mono, monospace)',
    color: 'var(--text-body)',
    overflow: 'auto',
    marginTop: 'var(--space-sm)',
  }}>
    <code>{code}</code>
  </pre>
);

const VariableRow = ({ variable, value, description }: { variable: string; value: string; description: string }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: '200px 180px 1fr',
    gap: 'var(--space-md)',
    padding: 'var(--space-sm)',
    background: 'var(--bg-surface)',
    borderRadius: 'var(--radius-sm)',
    alignItems: 'center',
  }}>
    <code style={{ color: 'var(--accent)', fontSize: 'var(--text-sm)' }}>{variable}</code>
    <span style={{ color: 'var(--text-body)', fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--text-sm)' }}>{value}</span>
    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>{description}</span>
  </div>
);

// Badge component para demos
const Badge = ({
  children,
  variant = 'neutral',
  dot = false,
}: {
  children?: React.ReactNode;
  variant?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  dot?: boolean;
}) => {
  const variantStyles: Record<string, { bg: string; color: string }> = {
    neutral: { bg: 'var(--badge-bg)', color: 'var(--badge-text)' },
    primary: { bg: 'var(--primary)', color: 'var(--text-on-primary)' },
    success: { bg: 'var(--success)', color: 'var(--text-on-success)' },
    warning: { bg: 'var(--warning)', color: 'var(--text-on-warning)' },
    danger: { bg: 'var(--danger)', color: 'var(--text-on-danger)' },
    info: { bg: 'var(--info)', color: 'var(--text-on-info)' },
  };

  const { bg, color } = variantStyles[variant];

  if (dot) {
    return (
      <span
        style={{
          display: 'inline-block',
          minWidth: 'var(--badge-dot-size)',
          width: 'var(--badge-dot-size)',
          height: 'var(--badge-dot-size)',
          borderRadius: 'var(--badge-radius)',
          background: bg,
        }}
      />
    );
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 'var(--badge-size)',
        height: 'var(--badge-size)',
        padding: 'var(--badge-padding)',
        fontSize: 'var(--badge-font-size)',
        fontWeight: 'var(--fw-semibold)',
        borderRadius: 'var(--badge-radius)',
        background: bg,
        color: color,
      }}
    >
      {children}
    </span>
  );
};

export const TiposDeBadge: Story = {
  name: 'Tipos de badge',
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <Section title="Tipos de Badge">
        <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-lg)', maxWidth: '600px' }}>
          Los badges se usan para mostrar contadores, estados o categorías junto a otros elementos.
        </p>

        <div style={{
          display: 'flex',
          gap: 'var(--space-xl)',
          marginBottom: 'var(--space-xl)',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <div style={{ textAlign: 'center' }}>
            <Badge>5</Badge>
            <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              Contador
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Badge>Nuevo</Badge>
            <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              Estado
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Badge variant="danger" dot />
            <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              Punto indicador
            </div>
          </div>
        </div>

        <CodeBlock code={`/* Contador */
<span class="badge">5</span>

/* Estado */
<span class="badge">Nuevo</span>

/* Punto indicador */
<span class="badge badge-dot badge-danger"></span>`} />
      </Section>
    </div>
  ),
};

export const VariantesDeColor: Story = {
  name: 'Variantes de color',
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <Section title="Variantes de color">
        <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-lg)', maxWidth: '600px' }}>
          Usa los colores semánticos del sistema para comunicar diferentes significados.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 'var(--space-lg)',
          marginBottom: 'var(--space-xl)',
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
          }}>
            <Badge variant="neutral">Neutro</Badge>
            <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              var(--badge-bg)
            </div>
          </div>

          <div style={{
            background: 'var(--bg-surface)',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
          }}>
            <Badge variant="primary">Primary</Badge>
            <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              var(--primary)
            </div>
          </div>

          <div style={{
            background: 'var(--bg-surface)',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
          }}>
            <Badge variant="success">Completado</Badge>
            <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              var(--success)
            </div>
          </div>

          <div style={{
            background: 'var(--bg-surface)',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
          }}>
            <Badge variant="warning">Pendiente</Badge>
            <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              var(--warning)
            </div>
          </div>

          <div style={{
            background: 'var(--bg-surface)',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
          }}>
            <Badge variant="danger">Urgente</Badge>
            <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              var(--danger)
            </div>
          </div>

          <div style={{
            background: 'var(--bg-surface)',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
          }}>
            <Badge variant="info">Info</Badge>
            <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              var(--info)
            </div>
          </div>
        </div>

        <CodeBlock code={`/* Badge neutro (defecto) */
<span class="badge">Nuevo</span>

/* Badge primario */
<span class="badge badge-primary">5</span>

/* Badge de éxito */
<span class="badge badge-success">Completado</span>

/* Badge de advertencia */
<span class="badge badge-warning">Pendiente</span>

/* Badge de peligro */
<span class="badge badge-danger">Urgente</span>

/* Badge informativo */
<span class="badge badge-info">Beta</span>`} />
      </Section>
    </div>
  ),
};

export const BadgeEnEsquina: Story = {
  name: 'Badge en esquina',
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <Section title="Badge en esquina (notificaciones)">
        <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-lg)', maxWidth: '600px' }}>
          Posiciona badges en la esquina de iconos o avatares para mostrar notificaciones.
        </p>

        <div style={{
          display: 'flex',
          gap: 'var(--space-2xl)',
          marginBottom: 'var(--space-xl)',
          flexWrap: 'wrap',
        }}>
          <div style={{
            position: 'relative',
            display: 'inline-flex',
            padding: 'var(--space-md)',
          }}>
            <span style={{ fontSize: '2rem' }}>🔔</span>
            <span
              style={{
                position: 'absolute',
                top: 'var(--badge-corner-offset)',
                right: 'var(--badge-corner-offset)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 'var(--badge-size)',
                height: 'var(--badge-size)',
                padding: 'var(--badge-padding)',
                fontSize: 'var(--badge-font-size)',
                fontWeight: 'var(--fw-semibold)',
                borderRadius: 'var(--badge-radius)',
                background: 'var(--danger)',
                color: 'var(--text-on-danger)',
              }}
            >
              3
            </span>
          </div>

          <div style={{
            position: 'relative',
            display: 'inline-flex',
            padding: 'var(--space-md)',
          }}>
            <span style={{ fontSize: '2rem' }}>✉️</span>
            <span
              style={{
                position: 'absolute',
                top: 'var(--badge-corner-offset)',
                right: 'var(--badge-corner-offset)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 'var(--badge-size)',
                height: 'var(--badge-size)',
                padding: 'var(--badge-padding)',
                fontSize: 'var(--badge-font-size)',
                fontWeight: 'var(--fw-semibold)',
                borderRadius: 'var(--badge-radius)',
                background: 'var(--primary)',
                color: 'var(--text-on-primary)',
              }}
            >
              99+
            </span>
          </div>

          <div style={{
            position: 'relative',
            display: 'inline-flex',
            padding: 'var(--space-md)',
          }}>
            <span style={{ fontSize: '2rem' }}>👤</span>
            <span
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                minWidth: 'var(--badge-dot-size)',
                width: 'var(--badge-dot-size)',
                height: 'var(--badge-dot-size)',
                borderRadius: 'var(--badge-radius)',
                background: 'var(--success)',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', marginBottom: 'var(--space-lg)' }}>
          <VariableRow variable="--badge-corner-offset" value="-0.25rem" description="Offset para posición en esquina" />
        </div>

        <CodeBlock code={`<div class="icon-wrapper">
  <span class="icon">🔔</span>
  <span class="badge badge-danger badge-corner">3</span>
</div>

.icon-wrapper {
  position: relative;
}

.badge-corner {
  position: absolute;
  top: var(--badge-corner-offset);
  right: var(--badge-corner-offset);
}`} />
      </Section>
    </div>
  ),
};

export const PuntoIndicador: Story = {
  name: 'Punto indicador',
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <Section title="Badge como punto (sin texto)">
        <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-lg)', maxWidth: '600px' }}>
          Un pequeño punto para indicar "hay algo nuevo" sin mostrar una cantidad específica.
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-xl)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            background: 'var(--bg-surface)',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
          }}>
            <span style={{ color: 'var(--text-body)' }}>Mensajes</span>
            <Badge variant="primary" dot />
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            background: 'var(--bg-surface)',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
          }}>
            <span style={{ color: 'var(--text-body)' }}>Notificaciones</span>
            <Badge variant="danger" dot />
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            background: 'var(--bg-surface)',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
          }}>
            <span style={{ color: 'var(--text-body)' }}>Actualizaciones</span>
            <Badge variant="success" dot />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', marginBottom: 'var(--space-lg)' }}>
          <VariableRow variable="--badge-dot-size" value="0.5rem" description="8px - Tamaño del punto" />
        </div>

        <CodeBlock code={`<div class="menu-item">
  Mensajes
  <span class="badge badge-dot badge-danger"></span>
</div>

.badge-dot {
  min-width: var(--badge-dot-size);
  width: var(--badge-dot-size);
  height: var(--badge-dot-size);
  padding: 0;
}`} />
      </Section>
    </div>
  ),
};

export const BadgeConAnimacion: Story = {
  name: 'Badge con animación',
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <Section title="Badge con animación">
        <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-lg)', maxWidth: '600px' }}>
          Añade animaciones para llamar la atención sobre notificaciones importantes.
        </p>

        <div style={{
          display: 'flex',
          gap: 'var(--space-2xl)',
          marginBottom: 'var(--space-xl)',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <div style={{ textAlign: 'center' }}>
            <span
              className="anim-pulse"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 'var(--badge-size)',
                height: 'var(--badge-size)',
                padding: 'var(--badge-padding)',
                fontSize: 'var(--badge-font-size)',
                fontWeight: 'var(--fw-semibold)',
                borderRadius: 'var(--badge-radius)',
                background: 'var(--danger)',
                color: 'var(--text-on-danger)',
              }}
            >
              99+
            </span>
            <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              .anim-pulse
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <span
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 'var(--badge-size)',
                height: 'var(--badge-size)',
                padding: 'var(--badge-padding)',
                fontSize: 'var(--badge-font-size)',
                fontWeight: 'var(--fw-semibold)',
                borderRadius: 'var(--badge-radius)',
                background: 'var(--danger)',
                color: 'var(--text-on-danger)',
              }}
            >
              3
              <span
                className="anim-ping"
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 'inherit',
                  background: 'inherit',
                  opacity: 0.75,
                }}
              />
            </span>
            <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              .badge-ping (efecto ping)
            </div>
          </div>
        </div>

        <CodeBlock code={`/* Badge con pulso */
<span class="badge badge-danger anim-pulse">99+</span>

/* Badge con efecto ping */
<span class="badge badge-danger badge-ping">3</span>

.badge-ping::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: inherit;
  animation: var(--anim-ping);
}`} />
      </Section>
    </div>
  ),
};

export const TodasLasVariables: Story = {
  name: 'Todas las variables',
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-3xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Variables CSS de Badge
      </h1>

      <Section title="Dimensiones">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          <VariableRow variable="--badge-size" value="1.25rem" description="Altura y ancho mínimo (20px)" />
          <VariableRow variable="--badge-padding" value="0 var(--space-xs)" description="Padding horizontal" />
          <VariableRow variable="--badge-dot-size" value="0.5rem" description="Tamaño del punto indicador (8px)" />
          <VariableRow variable="--badge-corner-offset" value="-0.25rem" description="Offset para posición esquina" />
        </div>
      </Section>

      <Section title="Tipografía">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          <VariableRow variable="--badge-font-size" value="var(--text-xs)" description="Tamaño de texto pequeño" />
        </div>
      </Section>

      <Section title="Apariencia">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          <VariableRow variable="--badge-radius" value="var(--radius-full)" description="Forma de píldora" />
          <VariableRow variable="--badge-bg" value="var(--bg-elevated)" description="Fondo neutro por defecto" />
          <VariableRow variable="--badge-text" value="var(--text-body)" description="Color de texto por defecto" />
        </div>
      </Section>

      <Section title="Resumen visual">
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-lg)',
          alignItems: 'center',
          background: 'var(--bg-surface)',
          padding: 'var(--space-lg)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <Badge>Neutro</Badge>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="danger">99+</Badge>
          <Badge variant="primary" dot />
          <Badge variant="danger" dot />
          <Badge variant="success" dot />
        </div>
      </Section>
    </div>
  ),
};
