/**
 * Filters - Filtros CSS Igoded
 *
 * Filtros para estados, efectos estéticos y tintes de color
 */

export default {
  title: 'Effects/Filters',
  parameters: {
    layout: 'fullscreen',
  },
}

const gradientBg = 'linear-gradient(135deg, var(--tellus) 0%, var(--liminal) 25%, var(--senum) 50%, var(--vesper) 75%, var(--primary) 100%)'

const FilterBox = ({ filterClass, label }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-sm)',
  }}>
    <div
      className={filterClass}
      style={{
        width: '120px',
        height: '120px',
        borderRadius: 'var(--radius-md)',
        background: gradientBg,
      }}
    />
    <code style={{
      color: 'var(--text-muted)',
      fontSize: 'var(--text-xs)',
    }}>
      {filterClass}
    </code>
  </div>
)

export const FiltrosDeEstado = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-4xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Filtros CSS
      </h1>

      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-md)',
      }}>
        Filtros de Estado
      </h2>

      <p style={{
        color: 'var(--text-body)',
        marginBottom: 'var(--space-lg)',
      }}>
        Para indicar estados de elementos como deshabilitado, hover o cargando.
      </p>

      <div style={{
        display: 'flex',
        gap: 'var(--space-xl)',
        flexWrap: 'wrap',
        marginBottom: 'var(--space-2xl)',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-sm)',
        }}>
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: 'var(--radius-md)',
            background: gradientBg,
          }} />
          <code style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
            (original)
          </code>
        </div>
        <FilterBox filterClass="filter-disabled" label="Disabled" />
        <FilterBox filterClass="filter-hover" label="Hover" />
        <FilterBox filterClass="filter-loading" label="Loading" />
      </div>
    </div>
  ),
}

export const FiltrosEsteticos = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Filtros Estéticos
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 'var(--space-lg)',
      }}>
        <FilterBox filterClass="filter-bw" label="B&W" />
        <FilterBox filterClass="filter-muted" label="Muted" />
        <FilterBox filterClass="filter-vintage" label="Vintage" />
        <FilterBox filterClass="filter-vivid" label="Vivid" />
        <FilterBox filterClass="filter-warm" label="Warm" />
        <FilterBox filterClass="filter-cool" label="Cool" />
        <FilterBox filterClass="filter-dramatic" label="Dramatic" />
        <FilterBox filterClass="filter-faded" label="Faded" />
        <FilterBox filterClass="filter-bright" label="Bright" />
      </div>
    </div>
  ),
}

export const TintesIgoded = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Tintes de Color Igoded
      </h2>

      <p style={{
        color: 'var(--text-body)',
        marginBottom: 'var(--space-lg)',
      }}>
        Filtros que aplican el tinte de cada color cardinal.
      </p>

      <div style={{
        display: 'flex',
        gap: 'var(--space-xl)',
        flexWrap: 'wrap',
      }}>
        <FilterBox filterClass="filter-tellus" label="Tellus" />
        <FilterBox filterClass="filter-liminal" label="Liminal" />
        <FilterBox filterClass="filter-senum" label="Senum" />
        <FilterBox filterClass="filter-vesper" label="Vesper" />
      </div>
    </div>
  ),
}

export const TintesAdaptativos = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Tintes Adaptativos
      </h2>

      <p style={{
        color: 'var(--text-body)',
        marginBottom: 'var(--space-lg)',
      }}>
        Estos tintes cambian según el modo dark/light.
      </p>

      <div style={{
        display: 'flex',
        gap: 'var(--space-xl)',
        flexWrap: 'wrap',
      }}>
        <FilterBox filterClass="filter-primary" label="Primary" />
        <FilterBox filterClass="filter-accent" label="Accent" />
      </div>
    </div>
  ),
}

export const ComparacionCompleta = {
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Comparación: Todos los Filtros
      </h2>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-xl)',
      }}>
        {/* Original */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-lg)',
        }}>
          <div style={{
            width: '200px',
            height: '100px',
            borderRadius: 'var(--radius-md)',
            background: gradientBg,
          }} />
          <div>
            <code style={{ color: 'var(--accent)', fontSize: 'var(--text-sm)' }}>
              (sin filtro)
            </code>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>
              Imagen original sin modificar
            </p>
          </div>
        </div>

        {/* Filters */}
        {[
          { cls: 'filter-bw', desc: 'Blanco y negro' },
          { cls: 'filter-muted', desc: 'Colores apagados' },
          { cls: 'filter-vintage', desc: 'Look retro sepia' },
          { cls: 'filter-vivid', desc: 'Saturación aumentada' },
          { cls: 'filter-warm', desc: 'Tonos cálidos' },
          { cls: 'filter-cool', desc: 'Tonos fríos' },
          { cls: 'filter-dramatic', desc: 'Alto contraste' },
        ].map(({ cls, desc }) => (
          <div key={cls} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-lg)',
          }}>
            <div
              className={cls}
              style={{
                width: '200px',
                height: '100px',
                borderRadius: 'var(--radius-md)',
                background: gradientBg,
              }}
            />
            <div>
              <code style={{ color: 'var(--accent)', fontSize: 'var(--text-sm)' }}>
                .{cls}
              </code>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>
                {desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
}
