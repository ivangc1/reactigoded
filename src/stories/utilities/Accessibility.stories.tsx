/**
 * Accessibility Utilities - Utilidades de accesibilidad
 *
 * Clases CSS para mejorar la accesibilidad: contenido solo para lectores de pantalla.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

const AccessibilityDemo = () => <div />;

const meta: Meta<typeof AccessibilityDemo> = {
  title: 'Utilidades/Accesibilidad',
  component: AccessibilityDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Utilidades CSS para accesibilidad: ocultar contenido visualmente mientras se mantiene accesible para tecnología asistiva.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AccessibilityDemo>;

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

const InfoBox = ({ type, children }: { type: 'info' | 'warning' | 'success'; children: React.ReactNode }) => {
  const colors = {
    info: { bg: 'var(--info)', text: 'var(--text-on-info)' },
    warning: { bg: 'var(--warning)', text: 'var(--text-on-warning)' },
    success: { bg: 'var(--success)', text: 'var(--text-on-success)' },
  };

  return (
    <div style={{
      background: colors[type].bg,
      color: colors[type].text,
      padding: 'var(--space-md)',
      borderRadius: 'var(--radius-md)',
      marginBottom: 'var(--space-md)',
    }}>
      {children}
    </div>
  );
};

export const SrOnly: Story = {
  name: 'SR-Only (Solo lectores de pantalla)',
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <Section title=".sr-only - Contenido oculto visualmente">
        <InfoBox type="info">
          <strong>Importante:</strong> El contenido con <code>.sr-only</code> es invisible en pantalla pero
          los lectores de pantalla (VoiceOver, NVDA, JAWS) lo leen normalmente.
        </InfoBox>

        <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-lg)', maxWidth: '600px' }}>
          Usa <code style={{ color: 'var(--accent)' }}>.sr-only</code> para proporcionar contexto adicional
          a usuarios de tecnología asistiva sin afectar el diseño visual.
        </p>

        <div style={{
          background: 'var(--bg-surface)',
          padding: 'var(--space-lg)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--space-lg)',
        }}>
          <h3 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-lg)',
            color: 'var(--text-heading)',
            marginBottom: 'var(--space-md)',
          }}>
            Ejemplo: Botón con icono
          </h3>

          <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
            <button style={{
              background: 'var(--primary)',
              color: 'var(--text-on-primary)',
              border: 'none',
              padding: 'var(--space-sm) var(--space-md)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: 'var(--text-lg)',
            }}>
              <span className="sr-only">Abrir menú de navegación</span>
              ☰
            </button>
            <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              ← El lector de pantalla lee: "Abrir menú de navegación"
            </span>
          </div>

          <div style={{ marginTop: 'var(--space-lg)' }}>
            <h4 style={{ color: 'var(--text-heading)', marginBottom: 'var(--space-sm)' }}>
              Más ejemplos:
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <button style={{
                  background: 'var(--danger)',
                  color: 'var(--text-on-danger)',
                  border: 'none',
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-full)',
                  cursor: 'pointer',
                  fontSize: 'var(--text-lg)',
                }}>
                  <span className="sr-only">Eliminar elemento</span>
                  ✕
                </button>
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                  Botón de cerrar con texto accesible
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <a href="#" style={{ color: 'var(--accent)', fontSize: 'var(--text-lg)' }}>
                  <span className="sr-only">Ir a Twitter</span>
                  🐦
                </a>
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                  Enlace de red social con descripción
                </span>
              </div>
            </div>
          </div>
        </div>

        <CodeBlock code={`.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Uso */
<button aria-label="Menú">
  <span class="sr-only">Abrir menú de navegación</span>
  ☰
</button>`} />

        <InfoBox type="warning">
          <strong>¿Por qué no usar display: none?</strong><br />
          <code>display: none</code> oculta el contenido TAMBIÉN para lectores de pantalla.
          <code>.sr-only</code> lo mantiene en el DOM y legible para tecnología asistiva.
        </InfoBox>
      </Section>
    </div>
  ),
};

export const SrOnlyFocusable: Story = {
  name: 'SR-Only Focusable (Visible con foco)',
  render: () => {
    const [focused, setFocused] = useState(false);

    return (
      <div style={{ padding: 'var(--space-lg)' }}>
        <Section title=".sr-only-focusable - Visible al recibir foco">
          <InfoBox type="success">
            Combina <code>.sr-only</code> con <code>.sr-only-focusable</code> para crear enlaces
            de "saltar al contenido" que aparecen solo cuando el usuario navega con teclado.
          </InfoBox>

          <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-lg)', maxWidth: '600px' }}>
            Estos enlaces mejoran la navegación con teclado permitiendo saltar secciones repetitivas
            como menús de navegación.
          </p>

          <div style={{
            background: 'var(--bg-surface)',
            padding: 'var(--space-lg)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--space-lg)',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-lg)',
              color: 'var(--text-heading)',
              marginBottom: 'var(--space-md)',
            }}>
              Demo interactiva
            </h3>

            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
              Haz clic en el área de abajo y presiona <kbd style={{
                background: 'var(--bg-elevated)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-default)',
              }}>Tab</kbd> para ver el enlace:
            </p>

            <div style={{
              border: '2px dashed var(--border-default)',
              padding: 'var(--space-lg)',
              borderRadius: 'var(--radius-md)',
              position: 'relative',
            }}>
              <a
                href="#main-content"
                className="sr-only sr-only-focusable"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={{
                  background: 'var(--primary)',
                  color: 'var(--text-on-primary)',
                  padding: 'var(--space-sm) var(--space-md)',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontWeight: 'var(--fw-semibold)',
                }}
              >
                Saltar al contenido principal
              </a>

              <nav style={{ marginBottom: 'var(--space-md)' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  [Menú de navegación simulado]
                </span>
              </nav>

              <main id="main-content">
                <p style={{ color: 'var(--text-body)' }}>
                  Contenido principal de la página
                </p>
              </main>

              {focused && (
                <div style={{
                  position: 'absolute',
                  top: 'var(--space-sm)',
                  right: 'var(--space-sm)',
                  background: 'var(--success)',
                  color: 'var(--text-on-success)',
                  padding: 'var(--space-xs) var(--space-sm)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-xs)',
                }}>
                  ¡Enlace visible!
                </div>
              )}
            </div>
          </div>

          <CodeBlock code={`.sr-only-focusable:focus,
.sr-only-focusable:active {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}

/* Uso - Enlace de saltar navegación */
<a href="#main" class="sr-only sr-only-focusable">
  Saltar al contenido principal
</a>

<nav>
  <!-- Menú largo -->
</nav>

<main id="main">
  <!-- Contenido -->
</main>`} />
        </Section>
      </div>
    );
  },
};

export const CasosDeUso: Story = {
  name: 'Casos de uso comunes',
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <Section title="Casos de uso recomendados">
        <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
          <div style={{
            background: 'var(--bg-surface)',
            padding: 'var(--space-lg)',
            borderRadius: 'var(--radius-lg)',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-lg)',
              color: 'var(--text-heading)',
              marginBottom: 'var(--space-md)',
            }}>
              1. Botones con solo icono
            </h3>
            <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-md)' }}>
              Proporciona texto descriptivo para iconos sin etiqueta visible.
            </p>
            <CodeBlock code={`<button>
  <span class="sr-only">Buscar</span>
  🔍
</button>`} />
          </div>

          <div style={{
            background: 'var(--bg-surface)',
            padding: 'var(--space-lg)',
            borderRadius: 'var(--radius-lg)',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-lg)',
              color: 'var(--text-heading)',
              marginBottom: 'var(--space-md)',
            }}>
              2. Enlaces de "Saltar al contenido"
            </h3>
            <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-md)' }}>
              Permite a usuarios de teclado saltar secciones repetitivas.
            </p>
            <CodeBlock code={`<a href="#main" class="sr-only sr-only-focusable">
  Saltar al contenido principal
</a>`} />
          </div>

          <div style={{
            background: 'var(--bg-surface)',
            padding: 'var(--space-lg)',
            borderRadius: 'var(--radius-lg)',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-lg)',
              color: 'var(--text-heading)',
              marginBottom: 'var(--space-md)',
            }}>
              3. Contexto adicional en tablas
            </h3>
            <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-md)' }}>
              Proporciona contexto cuando los datos visuales no son suficientes.
            </p>
            <CodeBlock code={`<td>
  <span class="sr-only">Estado:</span>
  ✅
</td>`} />
          </div>

          <div style={{
            background: 'var(--bg-surface)',
            padding: 'var(--space-lg)',
            borderRadius: 'var(--radius-lg)',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-lg)',
              color: 'var(--text-heading)',
              marginBottom: 'var(--space-md)',
            }}>
              4. Descripciones de gráficos
            </h3>
            <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-md)' }}>
              Proporciona descripción textual de contenido visual.
            </p>
            <CodeBlock code={`<figure>
  <div class="chart"><!-- Gráfico visual --></div>
  <figcaption class="sr-only">
    Gráfico de barras mostrando ventas mensuales:
    Enero 1200, Febrero 1500, Marzo 1800...
  </figcaption>
</figure>`} />
          </div>
        </div>
      </Section>

      <Section title="Resumen de clases">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 'var(--space-md)',
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}>
            <code style={{
              color: 'var(--accent)',
              fontSize: 'var(--text-lg)',
              display: 'block',
              marginBottom: 'var(--space-sm)',
            }}>
              .sr-only
            </code>
            <p style={{ color: 'var(--text-body)', margin: 0, fontSize: 'var(--text-sm)' }}>
              Oculta visualmente pero mantiene accesible para lectores de pantalla.
            </p>
          </div>

          <div style={{
            background: 'var(--bg-surface)',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}>
            <code style={{
              color: 'var(--accent)',
              fontSize: 'var(--text-lg)',
              display: 'block',
              marginBottom: 'var(--space-sm)',
            }}>
              .sr-only-focusable
            </code>
            <p style={{ color: 'var(--text-body)', margin: 0, fontSize: 'var(--text-sm)' }}>
              Combinado con .sr-only, se vuelve visible cuando recibe foco del teclado.
            </p>
          </div>
        </div>
      </Section>
    </div>
  ),
};
