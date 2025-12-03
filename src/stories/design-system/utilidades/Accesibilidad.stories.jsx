import React from 'react';

export default {
  title: 'Utilidades/Accesibilidad',
};

export const ScreenReaderOnly = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Screen Reader Only</h2>
    <p className="ig-text-body ig-mb-6">
      La clase <code className="ig-bg-muted ig-px-1 ig-rounded">ig-sr-only</code> oculta visualmente
      el contenido pero lo mantiene accesible para lectores de pantalla.
    </p>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Botón con texto solo para lectores</h3>
        <button className="ig-btn ig-btn-brand">
          <span className="ig-text-xl">🔍</span>
          <span className="ig-sr-only">Buscar</span>
        </button>
        <p className="ig-text-sm ig-text-muted ig-mt-2">
          El icono es visible, pero "Buscar" solo lo leen los lectores de pantalla.
        </p>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Ejemplo de código</h3>
        <pre className="ig-text-sm ig-text-body ig-bg-muted ig-p-4 ig-rounded ig-overflow-x-auto">
{`<button class="ig-btn ig-btn-outline">
  <span class="ig-text-xl">🗑️</span>
  <span class="ig-sr-only">Eliminar elemento</span>
</button>`}
        </pre>
      </div>
    </div>
  </div>
);

export const NotScreenReaderOnly = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Not Screen Reader Only</h2>
    <p className="ig-text-body ig-mb-6">
      La clase <code className="ig-bg-muted ig-px-1 ig-rounded">ig-not-sr-only</code> revierte
      el efecto de sr-only, haciendo el contenido visible nuevamente.
    </p>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <pre className="ig-text-sm ig-text-body ig-bg-muted ig-p-4 ig-rounded ig-overflow-x-auto">
{`<!-- Oculto en móvil, visible en desktop -->
<span class="ig-sr-only md:ig-not-sr-only">
  Este texto se muestra en pantallas medianas y mayores
</span>`}
      </pre>
    </div>
  </div>
);

export const FocusVisible = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Focus Visible</h2>
    <p className="ig-text-body ig-mb-6">
      Usa Tab para navegar y ver los estilos de focus accesibles.
    </p>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Botones con focus visible</h3>
        <div className="ig-flex ig-gap-4">
          <button className="ig-btn ig-btn-brand focus-visible:ig-ring-2 focus-visible:ig-ring-brand focus-visible:ig-ring-offset-2">
            Botón 1
          </button>
          <button className="ig-btn ig-btn-secondary focus-visible:ig-ring-2 focus-visible:ig-ring-secondary focus-visible:ig-ring-offset-2">
            Botón 2
          </button>
          <button className="ig-btn ig-btn-outline focus-visible:ig-ring-2 focus-visible:ig-ring-brand focus-visible:ig-ring-offset-2">
            Botón 3
          </button>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Links con focus visible</h3>
        <nav className="ig-flex ig-gap-4">
          <a href="#" className="ig-text-brand focus-visible:ig-outline-none focus-visible:ig-ring-2 focus-visible:ig-ring-brand ig-rounded">
            Enlace 1
          </a>
          <a href="#" className="ig-text-brand focus-visible:ig-outline-none focus-visible:ig-ring-2 focus-visible:ig-ring-brand ig-rounded">
            Enlace 2
          </a>
          <a href="#" className="ig-text-brand focus-visible:ig-outline-none focus-visible:ig-ring-2 focus-visible:ig-ring-brand ig-rounded">
            Enlace 3
          </a>
        </nav>
      </div>
    </div>
  </div>
);

export const SkipLinks = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Skip Links</h2>
    <p className="ig-text-body ig-mb-6">
      Los skip links permiten a usuarios de teclado saltar directamente al contenido principal.
    </p>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Implementación</h3>
      <pre className="ig-text-sm ig-text-body ig-bg-muted ig-p-4 ig-rounded ig-overflow-x-auto">
{`<a
  href="#main-content"
  class="ig-sr-only focus:ig-not-sr-only focus:ig-absolute focus:ig-top-4 focus:ig-left-4 focus:ig-z-50 focus:ig-bg-brand focus:ig-text-on-brand focus:ig-px-4 focus:ig-py-2 focus:ig-rounded"
>
  Saltar al contenido principal
</a>`}
      </pre>
    </div>
  </div>
);

export const ReducedMotion = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Reduced Motion</h2>
    <p className="ig-text-body ig-mb-6">
      Respeta las preferencias del usuario para reducir animaciones.
    </p>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Clases disponibles</h3>
        <div className="ig-space-y-2">
          <code className="ig-block ig-text-sm ig-text-muted ig-p-2 ig-bg-muted ig-rounded">
            ig-motion-safe:ig-animate-spin - Anima solo si no prefiere reducir movimiento
          </code>
          <code className="ig-block ig-text-sm ig-text-muted ig-p-2 ig-bg-muted ig-rounded">
            ig-motion-reduce:ig-animate-none - Desactiva animación si prefiere reducir
          </code>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Ejemplo</h3>
        <pre className="ig-text-sm ig-text-body ig-bg-muted ig-p-4 ig-rounded ig-overflow-x-auto">
{`<div class="ig-motion-safe:ig-animate-bounce ig-motion-reduce:ig-animate-none">
  Esto rebota solo si el usuario no prefiere reducir movimiento
</div>`}
        </pre>
      </div>
    </div>
  </div>
);

export const AriaLabels = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">ARIA Labels y Roles</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Iconos con aria-label</h3>
        <div className="ig-flex ig-gap-4">
          <button className="ig-btn ig-btn-outline" aria-label="Guardar documento">
            💾
          </button>
          <button className="ig-btn ig-btn-outline" aria-label="Editar">
            ✏️
          </button>
          <button className="ig-btn ig-btn-outline" aria-label="Eliminar">
            🗑️
          </button>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Formulario accesible</h3>
        <form className="ig-space-y-4">
          <div>
            <label htmlFor="email-acc" className="ig-form-label">
              Email <span className="ig-text-danger" aria-hidden="true">*</span>
              <span className="ig-sr-only">(requerido)</span>
            </label>
            <input
              type="email"
              id="email-acc"
              className="ig-input"
              aria-required="true"
              aria-describedby="email-help"
            />
            <p id="email-help" className="ig-text-sm ig-text-muted ig-mt-1">
              Usaremos tu email para enviarte actualizaciones.
            </p>
          </div>
        </form>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Navegación con role</h3>
        <pre className="ig-text-sm ig-text-body ig-bg-muted ig-p-4 ig-rounded ig-overflow-x-auto">
{`<nav aria-label="Navegación principal">
  <ul role="menubar">
    <li role="none">
      <a role="menuitem" href="#">Inicio</a>
    </li>
    <li role="none">
      <a role="menuitem" href="#">Productos</a>
    </li>
  </ul>
</nav>`}
        </pre>
      </div>
    </div>
  </div>
);

export const ColorContraste = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Contraste de Color</h2>
    <p className="ig-text-body ig-mb-6">
      El sistema de colores está diseñado para cumplir con WCAG 2.1 AA.
    </p>

    <div className="ig-grid ig-grid-cols-1 md:ig-grid-cols-2 ig-gap-4">
      <div className="ig-bg-brand ig-text-on-brand ig-p-4 ig-rounded-lg">
        <strong>Brand</strong>
        <p className="ig-text-sm">Texto sobre fondo brand</p>
      </div>
      <div className="ig-bg-secondary ig-text-on-secondary ig-p-4 ig-rounded-lg">
        <strong>Secondary</strong>
        <p className="ig-text-sm">Texto sobre fondo secondary</p>
      </div>
      <div className="ig-bg-success ig-text-on-success ig-p-4 ig-rounded-lg">
        <strong>Success</strong>
        <p className="ig-text-sm">Texto sobre fondo success</p>
      </div>
      <div className="ig-bg-warning ig-text-on-warning ig-p-4 ig-rounded-lg">
        <strong>Warning</strong>
        <p className="ig-text-sm">Texto sobre fondo warning</p>
      </div>
      <div className="ig-bg-danger ig-text-on-danger ig-p-4 ig-rounded-lg">
        <strong>Danger</strong>
        <p className="ig-text-sm">Texto sobre fondo danger</p>
      </div>
      <div className="ig-bg-info ig-text-on-info ig-p-4 ig-rounded-lg">
        <strong>Info</strong>
        <p className="ig-text-sm">Texto sobre fondo info</p>
      </div>
    </div>
  </div>
);

export const BuenasPracticas = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Buenas Prácticas de Accesibilidad</h2>

    <div className="ig-space-y-4">
      {[
        { titulo: 'Usar etiquetas semánticas', desc: '<button>, <nav>, <main>, <article>, <header>, <footer>' },
        { titulo: 'Proporcionar texto alternativo', desc: 'Siempre usar alt en imágenes y aria-label en iconos' },
        { titulo: 'Asegurar navegación por teclado', desc: 'Todos los elementos interactivos deben ser accesibles con Tab' },
        { titulo: 'Mantener orden lógico', desc: 'El orden del DOM debe coincidir con el orden visual' },
        { titulo: 'Usar focus visible', desc: 'Indicadores claros de enfoque para navegación por teclado' },
        { titulo: 'Respetar preferencias del usuario', desc: 'Soportar modo oscuro, reduced motion, etc.' },
      ].map((item, i) => (
        <div key={i} className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
          <h3 className="ig-font-semibold ig-text-heading ig-mb-1">{item.titulo}</h3>
          <p className="ig-text-body ig-text-sm">{item.desc}</p>
        </div>
      ))}
    </div>
  </div>
);
