import React from 'react';

export default {
  title: 'Fundamentos/Colores',
};

// Componente helper para mostrar un color
const ColorSwatch = ({ name, cssVar, description }) => (
  <div className="ig-flex ig-items-center ig-gap-4 ig-p-3 ig-bg-surface ig-rounded-lg ig-border ig-border-default">
    <div
      className="ig-w-16 ig-h-16 ig-rounded-lg ig-shadow-md ig-flex-shrink-0"
      style={{ backgroundColor: `var(${cssVar})` }}
    />
    <div>
      <div className="ig-font-semibold ig-text-heading">{name}</div>
      <code className="ig-text-sm ig-text-muted ig-font-mono">{cssVar}</code>
      {description && <div className="ig-text-sm ig-text-muted ig-mt-1">{description}</div>}
    </div>
  </div>
);

// Componente para escala de color
const ColorScale = ({ baseName, cssBase }) => {
  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  return (
    <div className="ig-mb-8">
      <h3 className="ig-text-xl ig-font-semibold ig-text-heading ig-mb-4 ig-capitalize">{baseName}</h3>
      <div className="ig-flex ig-flex-wrap ig-gap-2">
        {shades.map((shade) => (
          <div key={shade} className="ig-text-center">
            <div
              className="ig-w-16 ig-h-16 ig-rounded-lg ig-shadow-sm ig-border ig-border-subtle"
              style={{ backgroundColor: `var(${cssBase}-${shade})` }}
            />
            <div className="ig-text-xs ig-text-muted ig-mt-1">{shade}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ColoresLatinos = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-2">Sistema de Colores Latinos</h2>
    <p className="ig-text-body ig-mb-6">
      Los colores base del sistema Igoded utilizan nomenclatura latina. Cada color tiene dos variantes:
      <code className="ig-text-sm ig-bg-muted ig-px-1 ig-rounded ig-mx-1">-lux</code> (modo claro) y
      <code className="ig-text-sm ig-bg-muted ig-px-1 ig-rounded ig-mx-1">-nox</code> (modo oscuro).
    </p>

    <div className="ig-grid ig-grid-cols-1 md:ig-grid-cols-2 ig-gap-4">
      <ColorSwatch
        name="Vitreus (Vidrio)"
        cssVar="--ig-vitreus"
        description="Marca, títulos, identidad. Teal verde-azulado."
      />
      <ColorSwatch
        name="Axis (Eje)"
        cssVar="--ig-axis"
        description="Enlaces, info, interacción. Índigo/violeta."
      />
      <ColorSwatch
        name="Cinis (Ceniza)"
        cssVar="--ig-cinis"
        description="Texto body, contenido largo. Gris grafito."
      />
      <ColorSwatch
        name="Rutilus (Resplandor)"
        cssVar="--ig-rutilus"
        description="Warnings, precaución. Ámbar/cobre."
      />
      <ColorSwatch
        name="Laurus (Laurel)"
        cssVar="--ig-laurus"
        description="Éxito, confirmaciones. Verde victoria."
      />
      <ColorSwatch
        name="Malum (Manzana/Mal)"
        cssVar="--ig-malum"
        description="Errores, peligro. Rojo coral."
      />
    </div>
  </div>
);

export const AliasesSemanticos = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-2">Aliases Semánticos</h2>
    <p className="ig-text-body ig-mb-6">
      Para uso cotidiano, puedes usar nombres familiares que apuntan a los colores latinos.
    </p>

    <div className="ig-grid ig-grid-cols-1 md:ig-grid-cols-2 lg:ig-grid-cols-3 ig-gap-4">
      <ColorSwatch
        name="Brand"
        cssVar="--ig-brand"
        description="→ vitreus"
      />
      <ColorSwatch
        name="Secondary"
        cssVar="--ig-secondary"
        description="→ axis"
      />
      <ColorSwatch
        name="Success"
        cssVar="--ig-success"
        description="→ laurus"
      />
      <ColorSwatch
        name="Warning"
        cssVar="--ig-warning"
        description="→ rutilus"
      />
      <ColorSwatch
        name="Danger"
        cssVar="--ig-danger"
        description="→ malum"
      />
      <ColorSwatch
        name="Info"
        cssVar="--ig-info"
        description="→ axis"
      />
    </div>
  </div>
);

export const VariantesLuxNox = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-2">Variantes Lux y Nox</h2>
    <p className="ig-text-body ig-mb-6">
      Cada color tiene una variante clara (-lux) y oscura (-nox). Las variables adaptativas cambian automáticamente según el tema.
    </p>

    <div className="ig-space-y-6">
      {['vitreus', 'axis', 'cinis', 'rutilus', 'laurus', 'malum'].map((color) => (
        <div key={color} className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
          <h3 className="ig-font-semibold ig-text-heading ig-mb-3 ig-capitalize">{color}</h3>
          <div className="ig-flex ig-gap-4 ig-flex-wrap">
            <div className="ig-text-center">
              <div
                className="ig-w-20 ig-h-20 ig-rounded-lg ig-shadow-md"
                style={{ backgroundColor: `var(--ig-${color}-lux)` }}
              />
              <div className="ig-text-xs ig-text-muted ig-mt-1">-lux (claro)</div>
            </div>
            <div className="ig-text-center">
              <div
                className="ig-w-20 ig-h-20 ig-rounded-lg ig-shadow-md ig-border ig-border-subtle"
                style={{ backgroundColor: `var(--ig-${color})` }}
              />
              <div className="ig-text-xs ig-text-muted ig-mt-1">adaptativo</div>
            </div>
            <div className="ig-text-center">
              <div
                className="ig-w-20 ig-h-20 ig-rounded-lg ig-shadow-md"
                style={{ backgroundColor: `var(--ig-${color}-nox)` }}
              />
              <div className="ig-text-xs ig-text-muted ig-mt-1">-nox (oscuro)</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const ClasesDeTexto = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-2">Clases de Color de Texto</h2>
    <p className="ig-text-body ig-mb-6">
      Usa estas clases utilitarias para aplicar colores al texto.
    </p>

    <div className="ig-space-y-4">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Colores de Sistema</h3>
        <div className="ig-space-y-2">
          <p className="ig-text-heading">ig-text-heading - Para títulos</p>
          <p className="ig-text-body">ig-text-body - Para contenido principal</p>
          <p className="ig-text-muted">ig-text-muted - Para texto secundario</p>
          <p className="ig-text-disabled">ig-text-disabled - Para texto deshabilitado</p>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Colores Semánticos</h3>
        <div className="ig-space-y-2">
          <p className="ig-text-brand">ig-text-brand - Vitreus (marca)</p>
          <p className="ig-text-secondary">ig-text-secondary - Axis (secundario)</p>
          <p className="ig-text-success">ig-text-success - Laurus (éxito)</p>
          <p className="ig-text-warning">ig-text-warning - Rutilus (advertencia)</p>
          <p className="ig-text-danger">ig-text-danger - Malum (peligro)</p>
          <p className="ig-text-info">ig-text-info - Axis (información)</p>
        </div>
      </div>
    </div>
  </div>
);

export const ClasesDeFondo = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-2">Clases de Color de Fondo</h2>
    <p className="ig-text-body ig-mb-6">
      Usa estas clases para aplicar colores de fondo.
    </p>

    <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-3 ig-gap-4">
      <div className="ig-bg-brand ig-p-4 ig-rounded-lg ig-text-center">
        <span className="ig-text-on-brand ig-font-semibold">ig-bg-brand</span>
      </div>
      <div className="ig-bg-secondary ig-p-4 ig-rounded-lg ig-text-center">
        <span className="ig-text-on-secondary ig-font-semibold">ig-bg-secondary</span>
      </div>
      <div className="ig-bg-success ig-p-4 ig-rounded-lg ig-text-center">
        <span className="ig-text-on-success ig-font-semibold">ig-bg-success</span>
      </div>
      <div className="ig-bg-warning ig-p-4 ig-rounded-lg ig-text-center">
        <span className="ig-text-on-warning ig-font-semibold">ig-bg-warning</span>
      </div>
      <div className="ig-bg-danger ig-p-4 ig-rounded-lg ig-text-center">
        <span className="ig-text-on-danger ig-font-semibold">ig-bg-danger</span>
      </div>
      <div className="ig-bg-info ig-p-4 ig-rounded-lg ig-text-center">
        <span className="ig-text-on-info ig-font-semibold">ig-bg-info</span>
      </div>
    </div>
  </div>
);

export const NeutrosTintados = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-2">Neutros Tintados</h2>
    <p className="ig-text-body ig-mb-6">
      Escala de grises tintados con Vitreus para una mejor integración visual.
    </p>

    <div className="ig-flex ig-flex-wrap ig-gap-2">
      {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((shade) => (
        <div key={shade} className="ig-text-center">
          <div
            className="ig-w-20 ig-h-20 ig-rounded-lg ig-shadow-sm ig-border ig-border-subtle"
            style={{ backgroundColor: `var(--ig-neutral-${shade})` }}
          />
          <div className="ig-text-xs ig-text-muted ig-mt-1">neutral-{shade}</div>
        </div>
      ))}
    </div>
  </div>
);

export const Transparencias = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-2">Transparencias con color-mix</h2>
    <p className="ig-text-body ig-mb-6">
      Variables predefinidas con diferentes niveles de opacidad usando CSS moderno.
    </p>

    <div className="ig-space-y-6">
      {['vitreus', 'axis', 'laurus', 'rutilus', 'malum'].map((color) => (
        <div key={color} className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
          <h3 className="ig-font-semibold ig-text-heading ig-mb-3 ig-capitalize">{color}</h3>
          <div className="ig-flex ig-gap-2 ig-flex-wrap">
            {[10, 20, 30, 50, 70].map((alpha) => (
              <div key={alpha} className="ig-text-center">
                <div
                  className="ig-w-16 ig-h-16 ig-rounded-lg ig-border ig-border-subtle"
                  style={{ backgroundColor: `var(--ig-${color}-alpha-${alpha})` }}
                />
                <div className="ig-text-xs ig-text-muted ig-mt-1">alpha-{alpha}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);
