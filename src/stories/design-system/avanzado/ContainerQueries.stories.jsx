import React from 'react';

export default {
  title: 'Avanzado/Container Queries',
};

export const IntroduccionContainerQueries = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Container Queries</h2>
    <p className="ig-text-body ig-mb-6">
      Container queries permiten que los componentes respondan al tamaño de su contenedor,
      no del viewport. Usa <code className="ig-bg-muted ig-px-1 ig-rounded">ig-@container</code> en el padre.
    </p>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Clases de contenedor</h3>
      <div className="ig-space-y-2">
        <code className="ig-block ig-text-sm ig-text-muted ig-p-2 ig-bg-muted ig-rounded">
          ig-@container - Contenedor básico
        </code>
        <code className="ig-block ig-text-sm ig-text-muted ig-p-2 ig-bg-muted ig-rounded">
          ig-@container/main - Contenedor con nombre "main"
        </code>
        <code className="ig-block ig-text-sm ig-text-muted ig-p-2 ig-bg-muted ig-rounded">
          ig-@container/sidebar - Contenedor con nombre "sidebar"
        </code>
        <code className="ig-block ig-text-sm ig-text-muted ig-p-2 ig-bg-muted ig-rounded">
          ig-@container/card - Contenedor con nombre "card"
        </code>
      </div>
    </div>
  </div>
);

export const BreakpointsDeContenedor = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Breakpoints de Contenedor</h2>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Breakpoints disponibles</h3>
      <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-3 ig-gap-3">
        {[
          { bp: '@xs', size: '320px' },
          { bp: '@sm', size: '384px' },
          { bp: '@md', size: '448px' },
          { bp: '@lg', size: '512px' },
          { bp: '@xl', size: '576px' },
          { bp: '@2xl', size: '672px' },
        ].map(({ bp, size }) => (
          <div key={bp} className="ig-p-3 ig-bg-muted ig-rounded ig-text-center">
            <code className="ig-text-sm ig-text-brand ig-font-bold">{bp}</code>
            <span className="ig-text-xs ig-text-muted ig-block">{size}+</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const EjemploBasico = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Ejemplo Básico</h2>
    <p className="ig-text-body ig-mb-6">
      Redimensiona el contenedor arrastrando el borde para ver el efecto.
    </p>

    <div className="ig-space-y-6">
      {/* Contenedor pequeño */}
      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-2">Contenedor pequeño (250px)</h3>
        <div className="ig-@container ig-bg-muted ig-p-4 ig-rounded-lg" style={{ width: '250px' }}>
          <div className="ig-bg-surface ig-p-4 ig-rounded ig-border ig-border-default @xs:ig-bg-brand @xs:ig-text-on-brand">
            <p className="ig-text-sm">Este contenido cambiará cuando el contenedor sea {'>'}= 320px</p>
          </div>
        </div>
      </div>

      {/* Contenedor mediano */}
      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-2">Contenedor mediano (400px)</h3>
        <div className="ig-@container ig-bg-muted ig-p-4 ig-rounded-lg" style={{ width: '400px' }}>
          <div className="ig-bg-surface ig-p-4 ig-rounded ig-border ig-border-default @xs:ig-bg-brand @xs:ig-text-on-brand">
            <p className="ig-text-sm">Este contenido cambiará cuando el contenedor sea {'>'}= 320px</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const CardResponsiva = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Card Responsiva al Contenedor</h2>

    <div className="ig-grid ig-grid-cols-1 md:ig-grid-cols-2 ig-gap-6">
      {/* Card en contenedor pequeño */}
      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-2">En espacio reducido</h3>
        <div className="ig-@container/card ig-bg-muted ig-p-2 ig-rounded-lg" style={{ width: '200px' }}>
          <div className="ig-card">
            <div className="ig-card-body">
              <div className="ig-text-center @sm:ig-text-left">
                <div className="ig-w-12 ig-h-12 ig-bg-brand ig-rounded-full ig-mx-auto @sm:ig-mx-0 ig-mb-2 @sm:ig-float-left @sm:ig-mr-3"></div>
                <h4 className="ig-font-semibold ig-text-heading">Título</h4>
                <p className="ig-text-body ig-text-sm">Contenido de la card.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card en contenedor grande */}
      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-2">En espacio amplio</h3>
        <div className="ig-@container/card ig-bg-muted ig-p-2 ig-rounded-lg">
          <div className="ig-card">
            <div className="ig-card-body">
              <div className="ig-text-center @sm:ig-text-left">
                <div className="ig-w-12 ig-h-12 ig-bg-brand ig-rounded-full ig-mx-auto @sm:ig-mx-0 ig-mb-2 @sm:ig-float-left @sm:ig-mr-3"></div>
                <h4 className="ig-font-semibold ig-text-heading">Título</h4>
                <p className="ig-text-body ig-text-sm">Contenido de la card que se expande horizontalmente.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const SidebarConContenedor = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Sidebar con Container Query</h2>

    <div className="ig-flex ig-gap-4 ig-h-96">
      {/* Sidebar */}
      <div className="ig-@container/sidebar ig-bg-surface ig-border ig-border-default ig-rounded-lg ig-p-4" style={{ width: '200px' }}>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4 @md:ig-text-lg">Menú</h3>
        <nav className="ig-space-y-2">
          <a href="#" className="ig-block ig-p-2 ig-rounded ig-bg-brand ig-text-on-brand">
            <span className="@md:ig-hidden">🏠</span>
            <span className="ig-hidden @md:ig-inline">Inicio</span>
          </a>
          <a href="#" className="ig-block ig-p-2 ig-rounded ig-hover:ig-bg-muted">
            <span className="@md:ig-hidden">👤</span>
            <span className="ig-hidden @md:ig-inline">Perfil</span>
          </a>
          <a href="#" className="ig-block ig-p-2 ig-rounded ig-hover:ig-bg-muted">
            <span className="@md:ig-hidden">⚙️</span>
            <span className="ig-hidden @md:ig-inline">Ajustes</span>
          </a>
        </nav>
      </div>

      {/* Contenido principal */}
      <div className="ig-flex-1 ig-bg-surface ig-border ig-border-default ig-rounded-lg ig-p-4">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Contenido Principal</h3>
        <p className="ig-text-body ig-text-sm">
          El sidebar muestra iconos o texto según su ancho.
        </p>
      </div>
    </div>
  </div>
);

export const CodigoEjemplo = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Código de Ejemplo</h2>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <pre className="ig-text-sm ig-text-body ig-bg-muted ig-p-4 ig-rounded ig-overflow-x-auto">
{`<!-- Definir el contenedor -->
<div class="ig-@container">

  <!-- Los hijos responden al contenedor -->
  <div class="ig-text-sm @md:ig-text-base @lg:ig-text-lg">
    Texto que crece con el contenedor
  </div>

  <!-- Grid que cambia columnas -->
  <div class="ig-grid ig-grid-cols-1 @sm:ig-grid-cols-2 @lg:ig-grid-cols-3">
    <div>Item 1</div>
    <div>Item 2</div>
    <div>Item 3</div>
  </div>
</div>

<!-- Con nombre de contenedor -->
<aside class="ig-@container/sidebar">
  <nav class="@md/sidebar:ig-flex-col">
    ...
  </nav>
</aside>`}
      </pre>
    </div>
  </div>
);
