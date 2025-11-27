/**
 * Text Utilities - Utilidades de texto
 *
 * Clases CSS para controlar truncado, line-clamp, espacios en blanco y saltos de línea.
 */

import type { Meta, StoryObj } from '@storybook/react';

const TextDemo = () => <div />;

const meta: Meta<typeof TextDemo> = {
  title: 'Utilidades/Texto',
  component: TextDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Utilidades CSS para controlar el comportamiento del texto: truncado, límite de líneas, espacios en blanco y saltos de palabra.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TextDemo>;

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

const DemoBox = ({ title, className, children, width = '250px' }: {
  title: string;
  className: string;
  children: React.ReactNode;
  width?: string;
}) => (
  <div style={{
    background: 'var(--bg-surface)',
    padding: 'var(--space-md)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-subtle)',
  }}>
    <div style={{
      fontFamily: 'var(--font-mono, monospace)',
      fontSize: 'var(--text-sm)',
      color: 'var(--accent)',
      marginBottom: 'var(--space-sm)',
    }}>
      .{className}
    </div>
    <div style={{ width, background: 'var(--bg-muted)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)' }}>
      {children}
    </div>
    <div style={{
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)',
      marginTop: 'var(--space-xs)',
    }}>
      {title}
    </div>
  </div>
);

const loremText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.";

export const Truncate: Story = {
  name: 'Truncate (Elipsis)',
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <Section title="Truncate - Cortar con elipsis">
        <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-lg)', maxWidth: '600px' }}>
          La clase <code style={{ color: 'var(--accent)' }}>.truncate</code> corta el texto con puntos suspensivos (...)
          cuando excede el ancho del contenedor. Solo funciona con texto de <strong>una línea</strong>.
        </p>

        <div style={{ display: 'grid', gap: 'var(--space-md)', maxWidth: '400px' }}>
          <DemoBox title="Texto cortado con elipsis" className="truncate" width="100%">
            <p className="truncate" style={{ margin: 0, color: 'var(--text-body)' }}>
              {loremText}
            </p>
          </DemoBox>

          <DemoBox title="Sin truncate (overflow)" className="sin-truncate" width="100%">
            <p style={{ margin: 0, color: 'var(--text-body)' }}>
              {loremText}
            </p>
          </DemoBox>
        </div>

        <CodeBlock code={`.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Uso */
<p class="truncate" style="width: 200px;">
  Texto muy largo que se cortará...
</p>`} />
      </Section>
    </div>
  ),
};

export const LineClamp: Story = {
  name: 'Line Clamp (Límite de líneas)',
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <Section title="Line Clamp - Limitar número de líneas">
        <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-lg)', maxWidth: '600px' }}>
          Las clases <code style={{ color: 'var(--accent)' }}>.line-clamp-N</code> muestran solo N líneas
          de texto y cortan el resto con elipsis. Útil para cards y previews.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-md)' }}>
          <DemoBox title="Máximo 1 línea" className="line-clamp-1" width="100%">
            <p className="line-clamp-1" style={{ margin: 0, color: 'var(--text-body)' }}>
              {loremText}
            </p>
          </DemoBox>

          <DemoBox title="Máximo 2 líneas" className="line-clamp-2" width="100%">
            <p className="line-clamp-2" style={{ margin: 0, color: 'var(--text-body)' }}>
              {loremText}
            </p>
          </DemoBox>

          <DemoBox title="Máximo 3 líneas" className="line-clamp-3" width="100%">
            <p className="line-clamp-3" style={{ margin: 0, color: 'var(--text-body)' }}>
              {loremText}
            </p>
          </DemoBox>

          <DemoBox title="Máximo 4 líneas" className="line-clamp-4" width="100%">
            <p className="line-clamp-4" style={{ margin: 0, color: 'var(--text-body)' }}>
              {loremText}
            </p>
          </DemoBox>
        </div>

        <CodeBlock code={`.line-clamp-1 { -webkit-line-clamp: 1; }
.line-clamp-2 { -webkit-line-clamp: 2; }
.line-clamp-3 { -webkit-line-clamp: 3; }
.line-clamp-4 { -webkit-line-clamp: 4; }

/* Uso en una card */
<article class="card">
  <h3>Título</h3>
  <p class="line-clamp-2">
    Descripción larga que se cortará después de 2 líneas...
  </p>
</article>`} />
      </Section>
    </div>
  ),
};

export const Whitespace: Story = {
  name: 'Whitespace (Espacios en blanco)',
  render: () => {
    const textWithSpaces = "Línea 1\n    Línea 2 con espacios    \nLínea 3";

    return (
      <div style={{ padding: 'var(--space-lg)' }}>
        <Section title="Whitespace - Control de espacios y saltos">
          <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-lg)', maxWidth: '600px' }}>
            Controla cómo se manejan los espacios en blanco y los saltos de línea.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
            <DemoBox title="Comportamiento normal del navegador" className="whitespace-normal" width="100%">
              <p className="whitespace-normal" style={{ margin: 0, color: 'var(--text-body)' }}>
                {textWithSpaces}
              </p>
            </DemoBox>

            <DemoBox title="No permite saltos de línea" className="whitespace-nowrap" width="100%">
              <div style={{ overflow: 'auto' }}>
                <p className="whitespace-nowrap" style={{ margin: 0, color: 'var(--text-body)' }}>
                  Este texto muy largo no se partirá en múltiples líneas aunque exceda el contenedor
                </p>
              </div>
            </DemoBox>

            <DemoBox title="Preserva espacios y saltos (como <pre>)" className="whitespace-pre" width="100%">
              <div style={{ overflow: 'auto' }}>
                <p className="whitespace-pre" style={{ margin: 0, color: 'var(--text-body)' }}>
                  {textWithSpaces}
                </p>
              </div>
            </DemoBox>

            <DemoBox title="Preserva espacios con wrapping" className="whitespace-pre-wrap" width="100%">
              <p className="whitespace-pre-wrap" style={{ margin: 0, color: 'var(--text-body)' }}>
                {textWithSpaces}
              </p>
            </DemoBox>
          </div>

          <CodeBlock code={`.whitespace-normal   { white-space: normal; }
.whitespace-nowrap   { white-space: nowrap; }
.whitespace-pre      { white-space: pre; }
.whitespace-pre-wrap { white-space: pre-wrap; }

/* Ejemplo: preservar formato de código */
<pre class="whitespace-pre-wrap">
  function ejemplo() {
    return "hola";
  }
</pre>`} />
        </Section>
      </div>
    );
  },
};

export const Break: Story = {
  name: 'Break (Saltos de palabra)',
  render: () => {
    const longWord = "supercalifragilisticoespialidoso";
    const longUrl = "https://ejemplo.com/ruta/muy/larga/que/excede/el/contenedor/disponible";

    return (
      <div style={{ padding: 'var(--space-lg)' }}>
        <Section title="Break - Control de saltos de palabra">
          <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-lg)', maxWidth: '600px' }}>
            Controla cómo se rompen las palabras largas cuando exceden el contenedor.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-md)' }}>
            <DemoBox title="No rompe palabras (puede hacer overflow)" className="break-normal" width="100%">
              <div style={{ overflow: 'auto' }}>
                <p className="break-normal" style={{ margin: 0, color: 'var(--text-body)' }}>
                  Palabra: {longWord}
                </p>
              </div>
            </DemoBox>

            <DemoBox title="Rompe palabras largas si es necesario" className="break-words" width="100%">
              <p className="break-words" style={{ margin: 0, color: 'var(--text-body)' }}>
                Palabra: {longWord}
              </p>
            </DemoBox>

            <DemoBox title="Rompe en cualquier carácter" className="break-all" width="100%">
              <p className="break-all" style={{ margin: 0, color: 'var(--text-body)' }}>
                URL: {longUrl}
              </p>
            </DemoBox>
          </div>

          <CodeBlock code={`.break-normal {
  word-break: normal;
  overflow-wrap: normal;
}

.break-words {
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.break-all {
  word-break: break-all;
}

/* Uso para URLs largas */
<a class="break-all" href="...">
  https://url-muy-larga.com/...
</a>`} />
        </Section>
      </div>
    );
  },
};

export const TodosLosEjemplos: Story = {
  name: 'Resumen completo',
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-3xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Utilidades de Texto - Resumen
      </h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-xl)',
      }}>
        {[
          { clase: '.truncate', desc: 'Corta con elipsis (1 línea)' },
          { clase: '.line-clamp-1', desc: 'Máximo 1 línea' },
          { clase: '.line-clamp-2', desc: 'Máximo 2 líneas' },
          { clase: '.line-clamp-3', desc: 'Máximo 3 líneas' },
          { clase: '.line-clamp-4', desc: 'Máximo 4 líneas' },
          { clase: '.whitespace-normal', desc: 'Espacios normales' },
          { clase: '.whitespace-nowrap', desc: 'Sin saltos de línea' },
          { clase: '.whitespace-pre', desc: 'Preserva formato' },
          { clase: '.whitespace-pre-wrap', desc: 'Preserva con wrap' },
          { clase: '.break-normal', desc: 'Sin romper palabras' },
          { clase: '.break-words', desc: 'Rompe palabras largas' },
          { clase: '.break-all', desc: 'Rompe en cualquier punto' },
        ].map(({ clase, desc }) => (
          <div key={clase} style={{
            background: 'var(--bg-surface)',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}>
            <code style={{
              color: 'var(--accent)',
              fontSize: 'var(--text-sm)',
              display: 'block',
              marginBottom: 'var(--space-xs)',
            }}>
              {clase}
            </code>
            <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              {desc}
            </span>
          </div>
        ))}
      </div>
    </div>
  ),
};
