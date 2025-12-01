import React from 'react';

export default {
  title: 'Avanzado/Print',
};

export const ClasesDeImpresion = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Clases de Impresión</h2>
    <p className="ig-text-body ig-mb-6">
      Controla qué elementos se muestran u ocultan al imprimir la página.
    </p>

    <div className="ig-space-y-4">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-print-hidden</code>
        <p className="ig-text-body ig-text-sm">
          Oculta el elemento solo al imprimir. Visible en pantalla.
        </p>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-print-only</code>
        <p className="ig-text-body ig-text-sm">
          Solo visible al imprimir. Oculto en pantalla.
        </p>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-print-color-exact</code>
        <p className="ig-text-body ig-text-sm">
          Fuerza los colores exactos de la pantalla al imprimir.
        </p>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-print-color-economy</code>
        <p className="ig-text-body ig-text-sm">
          Permite que el navegador optimice colores para impresión.
        </p>
      </div>
    </div>
  </div>
);

export const EjemploDocumento = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Ejemplo: Documento para Imprimir</h2>
    <p className="ig-text-body ig-mb-6">
      Usa Ctrl+P (Cmd+P en Mac) para ver la vista de impresión.
    </p>

    <div className="ig-bg-surface ig-p-6 ig-rounded-lg ig-border ig-border-default">
      {/* Cabecera solo para pantalla */}
      <header className="ig-print-hidden ig-flex ig-justify-between ig-items-center ig-mb-6 ig-pb-4 ig-border-b ig-border-subtle">
        <h1 className="ig-text-xl ig-font-bold ig-text-heading">Mi Aplicación</h1>
        <nav className="ig-flex ig-gap-4">
          <a href="#" className="ig-text-brand">Inicio</a>
          <a href="#" className="ig-text-brand">Documentos</a>
          <a href="#" className="ig-text-brand">Ajustes</a>
        </nav>
      </header>

      {/* Cabecera solo para impresión */}
      <header className="ig-print-only ig-text-center ig-mb-8">
        <h1 className="ig-text-2xl ig-font-bold">Reporte de Ventas Q4 2024</h1>
        <p className="ig-text-muted">Generado el 15 de diciembre de 2024</p>
      </header>

      {/* Contenido */}
      <article>
        <h2 className="ig-text-lg ig-font-semibold ig-text-heading ig-mb-4">Resumen Ejecutivo</h2>
        <p className="ig-text-body ig-mb-4">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
          tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
          quis nostrud exercitation ullamco laboris.
        </p>

        <h3 className="ig-font-semibold ig-text-heading ig-mb-2">Datos Clave</h3>
        <ul className="ig-list-disc ig-list-inside ig-text-body ig-mb-4">
          <li>Ventas totales: $1,234,567</li>
          <li>Crecimiento: +15.3%</li>
          <li>Nuevos clientes: 1,234</li>
        </ul>

        {/* Botones solo en pantalla */}
        <div className="ig-print-hidden ig-flex ig-gap-4 ig-mt-6">
          <button className="ig-btn ig-btn-brand">Descargar PDF</button>
          <button className="ig-btn ig-btn-outline" onClick={() => window.print()}>
            Imprimir
          </button>
        </div>

        {/* Footer solo para impresión */}
        <footer className="ig-print-only ig-mt-8 ig-pt-4 ig-border-t ig-text-center ig-text-sm ig-text-muted">
          <p>Este documento es confidencial</p>
          <p>Página 1 de 1</p>
        </footer>
      </article>
    </div>
  </div>
);

export const OcultarElementosAlImprimir = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Elementos a Ocultar al Imprimir</h2>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Recomendaciones</h3>
      <ul className="ig-space-y-2 ig-text-body">
        <li className="ig-flex ig-items-center ig-gap-2">
          <span className="ig-text-danger">✕</span>
          Navegación principal
        </li>
        <li className="ig-flex ig-items-center ig-gap-2">
          <span className="ig-text-danger">✕</span>
          Botones de acción (excepto "Imprimir")
        </li>
        <li className="ig-flex ig-items-center ig-gap-2">
          <span className="ig-text-danger">✕</span>
          Sidebars y menús
        </li>
        <li className="ig-flex ig-items-center ig-gap-2">
          <span className="ig-text-danger">✕</span>
          Chat widgets
        </li>
        <li className="ig-flex ig-items-center ig-gap-2">
          <span className="ig-text-danger">✕</span>
          Banners promocionales
        </li>
        <li className="ig-flex ig-items-center ig-gap-2">
          <span className="ig-text-danger">✕</span>
          Videos e iframes
        </li>
      </ul>
    </div>
  </div>
);

export const CodigoEjemplo = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Código de Ejemplo</h2>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <pre className="ig-text-sm ig-text-body ig-bg-muted ig-p-4 ig-rounded ig-overflow-x-auto">
{`<!-- Ocultar navegación al imprimir -->
<nav class="ig-print-hidden">
  <a href="/">Inicio</a>
  <a href="/about">Acerca de</a>
</nav>

<!-- Mostrar solo al imprimir -->
<div class="ig-print-only">
  <p>Este contenido solo aparece al imprimir</p>
  <p>Fecha de impresión: ...</p>
</div>

<!-- Mantener colores exactos -->
<div class="ig-print-color-exact ig-bg-brand ig-text-white">
  Este fondo se imprimirá con el color exacto
</div>

<!-- Estilos específicos para print (CSS) -->
@media print {
  .mi-clase {
    page-break-after: always;
    font-size: 12pt;
  }
}`}
      </pre>
    </div>
  </div>
);

export const PageBreaks = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Saltos de Página</h2>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <h3 className="ig-font-semibold ig-text-heading ig-mb-3">CSS para Control de Páginas</h3>
      <pre className="ig-text-sm ig-text-body ig-bg-muted ig-p-4 ig-rounded ig-overflow-x-auto">
{`/* Evitar que un elemento se corte entre páginas */
.ig-print-inside-avoid {
  break-inside: avoid;
}

/* Forzar salto de página antes */
.ig-print-break-before {
  break-before: page;
}

/* Forzar salto de página después */
.ig-print-break-after {
  break-after: page;
}

/* Uso común: evitar cortar cards */
.card {
  break-inside: avoid;
}`}
      </pre>
    </div>
  </div>
);
