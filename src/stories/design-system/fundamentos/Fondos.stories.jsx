import React from 'react';

export default {
  title: 'Fundamentos/Fondos',
};

export const NivelesDeElevacion = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-2">Niveles de Elevación</h2>
    <p className="ig-text-body ig-mb-6">
      Fondos semánticos para diferentes niveles de profundidad visual. Están tintados con Vitreus para una mejor integración.
    </p>

    <div className="ig-space-y-4">
      <div className="ig-p-6 ig-rounded-lg ig-border ig-border-default" style={{ backgroundColor: 'var(--ig-bg-sunken)' }}>
        <div className="ig-flex ig-justify-between ig-items-start">
          <div>
            <h3 className="ig-font-semibold ig-text-heading">bg-sunken</h3>
            <code className="ig-text-sm ig-text-muted ig-font-mono">--ig-bg-sunken</code>
          </div>
          <span className="ig-text-sm ig-text-muted">Nivel -1</span>
        </div>
        <p className="ig-text-body ig-mt-2">
          Por debajo del base. Úsalo para: inputs, tracks de sliders, headers de tabla, contenedores anidados.
        </p>
      </div>

      <div className="ig-p-6 ig-rounded-lg ig-border ig-border-default" style={{ backgroundColor: 'var(--ig-bg-base)' }}>
        <div className="ig-flex ig-justify-between ig-items-start">
          <div>
            <h3 className="ig-font-semibold ig-text-heading">bg-base (fundus)</h3>
            <code className="ig-text-sm ig-text-muted ig-font-mono">--ig-bg-base</code>
          </div>
          <span className="ig-text-sm ig-text-muted">Nivel 0</span>
        </div>
        <p className="ig-text-body ig-mt-2">
          El fondo principal de la página. Siempre usa esto en el body o contenedor principal.
        </p>
      </div>

      <div className="ig-p-6 ig-rounded-lg ig-border ig-border-default" style={{ backgroundColor: 'var(--ig-bg-surface)' }}>
        <div className="ig-flex ig-justify-between ig-items-start">
          <div>
            <h3 className="ig-font-semibold ig-text-heading">bg-surface</h3>
            <code className="ig-text-sm ig-text-muted ig-font-mono">--ig-bg-surface</code>
          </div>
          <span className="ig-text-sm ig-text-muted">Nivel 1</span>
        </div>
        <p className="ig-text-body ig-mt-2">
          Para tarjetas y contenedores normales. El nivel más común después del base.
        </p>
      </div>

      <div className="ig-p-6 ig-rounded-lg ig-border ig-border-default" style={{ backgroundColor: 'var(--ig-bg-elevated)' }}>
        <div className="ig-flex ig-justify-between ig-items-start">
          <div>
            <h3 className="ig-font-semibold ig-text-heading">bg-elevated</h3>
            <code className="ig-text-sm ig-text-muted ig-font-mono">--ig-bg-elevated</code>
          </div>
          <span className="ig-text-sm ig-text-muted">Nivel 2</span>
        </div>
        <p className="ig-text-body ig-mt-2">
          Para elementos que flotan: modales, dropdowns, tooltips, popovers.
        </p>
      </div>

      <div className="ig-p-6 ig-rounded-lg ig-border ig-border-default" style={{ backgroundColor: 'var(--ig-bg-muted)' }}>
        <div className="ig-flex ig-justify-between ig-items-start">
          <div>
            <h3 className="ig-font-semibold ig-text-heading">bg-muted</h3>
            <code className="ig-text-sm ig-text-muted ig-font-mono">--ig-bg-muted</code>
          </div>
          <span className="ig-text-sm ig-text-muted">Especial</span>
        </div>
        <p className="ig-text-body ig-mt-2">
          Áreas destacadas sutilmente: sidebars, bloques de código, secciones secundarias.
        </p>
      </div>
    </div>
  </div>
);

export const EjemploDeUso = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Ejemplo de Uso en Contexto</h2>

    <div className="ig-p-6 ig-rounded-xl" style={{ backgroundColor: 'var(--ig-bg-base)' }}>
      <p className="ig-text-xs ig-text-muted ig-mb-4">Fondo: bg-base</p>

      {/* Sidebar */}
      <div className="ig-flex ig-gap-4">
        <div className="ig-w-48 ig-p-4 ig-rounded-lg" style={{ backgroundColor: 'var(--ig-bg-muted)' }}>
          <p className="ig-text-xs ig-text-muted ig-mb-2">bg-muted (sidebar)</p>
          <div className="ig-space-y-2">
            <div className="ig-p-2 ig-rounded ig-bg-brand ig-text-on-brand ig-text-sm">Item activo</div>
            <div className="ig-p-2 ig-rounded ig-text-body ig-text-sm">Item normal</div>
            <div className="ig-p-2 ig-rounded ig-text-body ig-text-sm">Item normal</div>
          </div>
        </div>

        {/* Main content */}
        <div className="ig-flex-1 ig-space-y-4">
          {/* Card */}
          <div className="ig-p-4 ig-rounded-lg" style={{ backgroundColor: 'var(--ig-bg-surface)' }}>
            <p className="ig-text-xs ig-text-muted ig-mb-2">bg-surface (card)</p>
            <h3 className="ig-font-semibold ig-text-heading ig-mb-2">Título de la tarjeta</h3>
            <p className="ig-text-body ig-text-sm">Contenido de la tarjeta en superficie.</p>

            {/* Input dentro de la card */}
            <div className="ig-mt-4 ig-p-3 ig-rounded" style={{ backgroundColor: 'var(--ig-bg-sunken)' }}>
              <p className="ig-text-xs ig-text-muted">bg-sunken (input area)</p>
            </div>
          </div>

          {/* Modal preview */}
          <div className="ig-p-4 ig-rounded-lg ig-shadow-lg" style={{ backgroundColor: 'var(--ig-bg-elevated)' }}>
            <p className="ig-text-xs ig-text-muted ig-mb-2">bg-elevated (modal/popup)</p>
            <h3 className="ig-font-semibold ig-text-heading ig-mb-2">Diálogo</h3>
            <p className="ig-text-body ig-text-sm">Contenido elevado sobre todo lo demás.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const ClasesUtilitarias = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Clases Utilitarias de Fondo</h2>

    <div className="ig-space-y-4">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Fondos de Sistema</h3>
        <div className="ig-grid ig-grid-cols-2 ig-md:ig-grid-cols-5 ig-gap-2">
          <div className="ig-bg-sunken ig-p-4 ig-rounded ig-text-center">
            <span className="ig-text-xs">ig-bg-sunken</span>
          </div>
          <div className="ig-bg-base ig-p-4 ig-rounded ig-border ig-border-subtle ig-text-center">
            <span className="ig-text-xs">ig-bg-base</span>
          </div>
          <div className="ig-bg-surface ig-p-4 ig-rounded ig-border ig-border-subtle ig-text-center">
            <span className="ig-text-xs">ig-bg-surface</span>
          </div>
          <div className="ig-bg-elevated ig-p-4 ig-rounded ig-text-center">
            <span className="ig-text-xs">ig-bg-elevated</span>
          </div>
          <div className="ig-bg-muted ig-p-4 ig-rounded ig-text-center">
            <span className="ig-text-xs">ig-bg-muted</span>
          </div>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Fondos de Color</h3>
        <div className="ig-grid ig-grid-cols-2 ig-md:ig-grid-cols-3 ig-gap-2">
          <div className="ig-bg-brand ig-p-4 ig-rounded ig-text-center">
            <span className="ig-text-xs ig-text-on-brand">ig-bg-brand</span>
          </div>
          <div className="ig-bg-secondary ig-p-4 ig-rounded ig-text-center">
            <span className="ig-text-xs ig-text-on-secondary">ig-bg-secondary</span>
          </div>
          <div className="ig-bg-success ig-p-4 ig-rounded ig-text-center">
            <span className="ig-text-xs ig-text-on-success">ig-bg-success</span>
          </div>
          <div className="ig-bg-warning ig-p-4 ig-rounded ig-text-center">
            <span className="ig-text-xs ig-text-on-warning">ig-bg-warning</span>
          </div>
          <div className="ig-bg-danger ig-p-4 ig-rounded ig-text-center">
            <span className="ig-text-xs ig-text-on-danger">ig-bg-danger</span>
          </div>
          <div className="ig-bg-info ig-p-4 ig-rounded ig-text-center">
            <span className="ig-text-xs ig-text-on-info">ig-bg-info</span>
          </div>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Fondos Básicos</h3>
        <div className="ig-grid ig-grid-cols-2 ig-md:ig-grid-cols-4 ig-gap-2">
          <div className="ig-bg-transparent ig-p-4 ig-rounded ig-border ig-border-dashed ig-border-default ig-text-center">
            <span className="ig-text-xs">ig-bg-transparent</span>
          </div>
          <div className="ig-bg-white ig-p-4 ig-rounded ig-text-center">
            <span className="ig-text-xs ig-text-black">ig-bg-white</span>
          </div>
          <div className="ig-bg-black ig-p-4 ig-rounded ig-text-center">
            <span className="ig-text-xs ig-text-white">ig-bg-black</span>
          </div>
          <div className="ig-bg-current ig-p-4 ig-rounded ig-border ig-border-default ig-text-center">
            <span className="ig-text-xs">ig-bg-current</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const Gradientes = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Fondos con Gradiente</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Gradientes Predefinidos</h3>
        <div className="ig-grid ig-grid-cols-2 ig-md:ig-grid-cols-3 ig-gap-4">
          <div className="ig-gradient-brand ig-p-6 ig-rounded-lg ig-text-center">
            <span className="ig-text-sm ig-font-semibold" style={{ color: 'white' }}>ig-gradient-brand</span>
          </div>
          <div className="ig-gradient-secondary ig-p-6 ig-rounded-lg ig-text-center">
            <span className="ig-text-sm ig-font-semibold" style={{ color: 'white' }}>ig-gradient-secondary</span>
          </div>
          <div className="ig-gradient-success ig-p-6 ig-rounded-lg ig-text-center">
            <span className="ig-text-sm ig-font-semibold" style={{ color: 'white' }}>ig-gradient-success</span>
          </div>
          <div className="ig-gradient-warning ig-p-6 ig-rounded-lg ig-text-center">
            <span className="ig-text-sm ig-font-semibold" style={{ color: 'white' }}>ig-gradient-warning</span>
          </div>
          <div className="ig-gradient-danger ig-p-6 ig-rounded-lg ig-text-center">
            <span className="ig-text-sm ig-font-semibold" style={{ color: 'white' }}>ig-gradient-danger</span>
          </div>
          <div className="ig-gradient-igoded ig-p-6 ig-rounded-lg ig-text-center">
            <span className="ig-text-sm ig-font-semibold" style={{ color: 'white' }}>ig-gradient-igoded</span>
          </div>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Gradientes con Dirección</h3>
        <div className="ig-grid ig-grid-cols-2 ig-md:ig-grid-cols-4 ig-gap-4">
          <div className="ig-gradient-to-r-brand ig-p-6 ig-rounded-lg ig-text-center">
            <span className="ig-text-xs" style={{ color: 'white' }}>to-r-brand (→)</span>
          </div>
          <div className="ig-gradient-to-b-secondary ig-p-6 ig-rounded-lg ig-text-center">
            <span className="ig-text-xs" style={{ color: 'white' }}>to-b-secondary (↓)</span>
          </div>
          <div className="ig-gradient-to-br-success ig-p-6 ig-rounded-lg ig-text-center">
            <span className="ig-text-xs" style={{ color: 'white' }}>to-br-success (↘)</span>
          </div>
          <div className="ig-gradient-radial-warning ig-p-6 ig-rounded-lg ig-text-center">
            <span className="ig-text-xs" style={{ color: 'white' }}>radial-warning</span>
          </div>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Texto con Gradiente</h3>
        <div className="ig-space-y-4">
          <h2 className="ig-text-gradient-brand ig-text-4xl ig-font-bold">Texto con gradiente Brand</h2>
          <h2 className="ig-text-gradient-secondary ig-text-4xl ig-font-bold">Texto con gradiente Secondary</h2>
          <h2 className="ig-text-gradient-igoded ig-text-4xl ig-font-bold">Texto con gradiente Igoded</h2>
        </div>
      </div>
    </div>
  </div>
);
