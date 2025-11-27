/**
 * ClipPaths - Formas de recorte CSS Igoded
 *
 * Clip-paths para crear formas geométricas y diseños creativos
 */

export default {
  title: 'Effects/ClipPaths',
  parameters: {
    layout: 'fullscreen',
  },
}

const clipPaths = {
  basic: [
    { name: 'circle', label: 'Circle' },
    { name: 'ellipse', label: 'Ellipse' },
    { name: 'triangle', label: 'Triangle' },
    { name: 'diamond', label: 'Diamond' },
  ],
  polygons: [
    { name: 'pentagon', label: 'Pentagon' },
    { name: 'hexagon', label: 'Hexagon' },
    { name: 'heptagon', label: 'Heptagon' },
    { name: 'octagon', label: 'Octagon' },
  ],
  special: [
    { name: 'star', label: 'Star' },
    { name: 'cross', label: 'Cross' },
    { name: 'message', label: 'Message' },
    { name: 'bevel', label: 'Bevel' },
    { name: 'rabbet', label: 'Rabbet' },
  ],
  directional: [
    { name: 'arrow-right', label: 'Arrow Right' },
    { name: 'arrow-left', label: 'Arrow Left' },
    { name: 'chevron-right', label: 'Chevron Right' },
    { name: 'chevron-left', label: 'Chevron Left' },
  ],
  other: [
    { name: 'trapezoid', label: 'Trapezoid' },
    { name: 'parallelogram', label: 'Parallelogram' },
  ],
}

const ClipShape = ({ name, label }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-sm)',
  }}>
    <div
      className={`clip-${name}`}
      style={{
        width: '100px',
        height: '100px',
        background: 'linear-gradient(135deg, var(--primary), var(--accent))',
      }}
    />
    <code style={{
      color: 'var(--text-muted)',
      fontSize: 'var(--text-xs)',
    }}>
      clip-{name}
    </code>
  </div>
)

export const FormasBasicas = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-4xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Clip-Paths
      </h1>

      <p style={{
        color: 'var(--text-body)',
        marginBottom: 'var(--space-xl)',
        maxWidth: '600px',
      }}>
        Formas de recorte CSS para crear máscaras geométricas.
        Aplica la clase <code style={{ color: 'var(--accent)' }}>clip-[forma]</code> a cualquier elemento.
      </p>

      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-md)',
      }}>
        Formas Básicas
      </h2>

      <div style={{
        display: 'flex',
        gap: 'var(--space-xl)',
        flexWrap: 'wrap',
        marginBottom: 'var(--space-2xl)',
      }}>
        {clipPaths.basic.map(({ name, label }) => (
          <ClipShape key={name} name={name} label={label} />
        ))}
      </div>
    </div>
  ),
}

export const Poligonos = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Polígonos
      </h2>

      <div style={{
        display: 'flex',
        gap: 'var(--space-xl)',
        flexWrap: 'wrap',
      }}>
        {clipPaths.polygons.map(({ name, label }) => (
          <ClipShape key={name} name={name} label={label} />
        ))}
      </div>
    </div>
  ),
}

export const FormasEspeciales = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Formas Especiales
      </h2>

      <div style={{
        display: 'flex',
        gap: 'var(--space-xl)',
        flexWrap: 'wrap',
      }}>
        {clipPaths.special.map(({ name, label }) => (
          <ClipShape key={name} name={name} label={label} />
        ))}
      </div>
    </div>
  ),
}

export const FormasDireccionales = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Formas Direccionales
      </h2>

      <div style={{
        display: 'flex',
        gap: 'var(--space-xl)',
        flexWrap: 'wrap',
      }}>
        {clipPaths.directional.map(({ name, label }) => (
          <ClipShape key={name} name={name} label={label} />
        ))}
      </div>
    </div>
  ),
}

export const OtrasFormas = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Otras Formas
      </h2>

      <div style={{
        display: 'flex',
        gap: 'var(--space-xl)',
        flexWrap: 'wrap',
      }}>
        {clipPaths.other.map(({ name, label }) => (
          <ClipShape key={name} name={name} label={label} />
        ))}
      </div>
    </div>
  ),
}

export const TodasLasFormas = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Galería Completa
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: 'var(--space-lg)',
      }}>
        {Object.values(clipPaths).flat().map(({ name, label }) => (
          <ClipShape key={name} name={name} label={label} />
        ))}
      </div>
    </div>
  ),
}
