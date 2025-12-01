import React from 'react';

export default {
  title: 'Componentes/Button',
};

export const Variantes = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Variantes de Botón</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Colores Sólidos</h3>
        <div className="ig-flex ig-flex-wrap ig-gap-3">
          <button className="ig-btn ig-btn-brand">Brand</button>
          <button className="ig-btn ig-btn-secondary">Secondary</button>
          <button className="ig-btn ig-btn-success">Success</button>
          <button className="ig-btn ig-btn-warning">Warning</button>
          <button className="ig-btn ig-btn-danger">Danger</button>
          <button className="ig-btn ig-btn-info">Info</button>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Outline</h3>
        <div className="ig-flex ig-flex-wrap ig-gap-3">
          <button className="ig-btn ig-btn-outline">Outline</button>
          <button className="ig-btn ig-btn-outline-brand">Outline Brand</button>
          <button className="ig-btn ig-btn-outline-secondary">Outline Secondary</button>
          <button className="ig-btn ig-btn-outline-success">Outline Success</button>
          <button className="ig-btn ig-btn-outline-warning">Outline Warning</button>
          <button className="ig-btn ig-btn-outline-danger">Outline Danger</button>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Ghost</h3>
        <div className="ig-flex ig-flex-wrap ig-gap-3">
          <button className="ig-btn ig-btn-ghost">Ghost</button>
          <button className="ig-btn ig-btn-ghost-brand">Ghost Brand</button>
          <button className="ig-btn ig-btn-ghost-secondary">Ghost Secondary</button>
          <button className="ig-btn ig-btn-ghost-success">Ghost Success</button>
          <button className="ig-btn ig-btn-ghost-warning">Ghost Warning</button>
          <button className="ig-btn ig-btn-ghost-danger">Ghost Danger</button>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Link</h3>
        <button className="ig-btn ig-btn-link">Parece un enlace</button>
      </div>
    </div>
  </div>
);

export const Tamanos = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tamaños de Botón</h2>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <div className="ig-flex ig-flex-wrap ig-items-end ig-gap-3">
        <button className="ig-btn ig-btn-brand ig-btn-xs">Extra Pequeño</button>
        <button className="ig-btn ig-btn-brand ig-btn-sm">Pequeño</button>
        <button className="ig-btn ig-btn-brand">Normal</button>
        <button className="ig-btn ig-btn-brand ig-btn-lg">Grande</button>
        <button className="ig-btn ig-btn-brand ig-btn-xl">Extra Grande</button>
      </div>
    </div>

    <div className="ig-mt-6 ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Referencia de clases</h3>
      <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-5 ig-gap-2 ig-text-sm">
        <code className="ig-text-muted">ig-btn-xs</code>
        <code className="ig-text-muted">ig-btn-sm</code>
        <code className="ig-text-muted">(default)</code>
        <code className="ig-text-muted">ig-btn-lg</code>
        <code className="ig-text-muted">ig-btn-xl</code>
      </div>
    </div>
  </div>
);

export const Estados = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Estados de Botón</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Normal vs Disabled</h3>
        <div className="ig-flex ig-flex-wrap ig-gap-3">
          <button className="ig-btn ig-btn-brand">Normal</button>
          <button className="ig-btn ig-btn-brand" disabled>Disabled</button>
          <button className="ig-btn ig-btn-secondary">Normal</button>
          <button className="ig-btn ig-btn-secondary" disabled>Disabled</button>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Con Loading</h3>
        <div className="ig-flex ig-flex-wrap ig-gap-3">
          <button className="ig-btn ig-btn-brand ig-btn-loading" disabled>
            <span className="ig-spinner ig-spinner-sm" style={{ borderTopColor: 'currentColor' }} />
            Cargando...
          </button>
          <button className="ig-btn ig-btn-secondary ig-btn-loading" disabled>
            <span className="ig-spinner ig-spinner-sm" style={{ borderTopColor: 'currentColor' }} />
            Procesando
          </button>
        </div>
      </div>
    </div>
  </div>
);

export const Modificadores = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Modificadores</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">ig-btn-block (ancho completo)</h3>
        <button className="ig-btn ig-btn-brand ig-btn-block">Botón Block</button>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">ig-btn-icon (cuadrado)</h3>
        <div className="ig-flex ig-flex-wrap ig-gap-3">
          <button className="ig-btn ig-btn-brand ig-btn-icon ig-btn-sm">✕</button>
          <button className="ig-btn ig-btn-brand ig-btn-icon">✓</button>
          <button className="ig-btn ig-btn-brand ig-btn-icon ig-btn-lg">+</button>
          <button className="ig-btn ig-btn-outline ig-btn-icon">⋮</button>
          <button className="ig-btn ig-btn-ghost ig-btn-icon">☰</button>
        </div>
      </div>
    </div>
  </div>
);

export const ConIconos = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Botones con Iconos</h2>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <div className="ig-flex ig-flex-wrap ig-gap-3">
        <button className="ig-btn ig-btn-brand">
          <span>→</span>
          Siguiente
        </button>
        <button className="ig-btn ig-btn-brand">
          ←
          <span>Anterior</span>
        </button>
        <button className="ig-btn ig-btn-success">
          ✓
          <span>Guardar</span>
        </button>
        <button className="ig-btn ig-btn-danger">
          🗑
          <span>Eliminar</span>
        </button>
        <button className="ig-btn ig-btn-outline">
          ↓
          <span>Descargar</span>
        </button>
      </div>
    </div>
  </div>
);

export const GrupoDeBotones = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Grupo de Botones</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Horizontal</h3>
        <div className="ig-inline-flex ig-rounded-lg ig-overflow-hidden ig-border ig-border-default">
          <button className="ig-btn ig-btn-ghost ig-rounded-none ig-border-r ig-border-default">Izquierda</button>
          <button className="ig-btn ig-btn-ghost ig-rounded-none ig-border-r ig-border-default">Centro</button>
          <button className="ig-btn ig-btn-ghost ig-rounded-none">Derecha</button>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Con uno activo</h3>
        <div className="ig-inline-flex ig-rounded-lg ig-overflow-hidden ig-border ig-border-default">
          <button className="ig-btn ig-btn-brand ig-rounded-none">Día</button>
          <button className="ig-btn ig-btn-ghost ig-rounded-none ig-border-l ig-border-default">Semana</button>
          <button className="ig-btn ig-btn-ghost ig-rounded-none ig-border-l ig-border-default">Mes</button>
        </div>
      </div>
    </div>
  </div>
);

export const CasosDeUso = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Casos de Uso Comunes</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Formulario - Acciones primaria y secundaria</h3>
        <div className="ig-flex ig-gap-3">
          <button className="ig-btn ig-btn-brand">Guardar cambios</button>
          <button className="ig-btn ig-btn-ghost">Cancelar</button>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Modal de confirmación</h3>
        <div className="ig-flex ig-gap-3">
          <button className="ig-btn ig-btn-danger">Eliminar</button>
          <button className="ig-btn ig-btn-outline">Cancelar</button>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">CTA Hero</h3>
        <div className="ig-flex ig-gap-3">
          <button className="ig-btn ig-btn-brand ig-btn-lg">Empezar gratis</button>
          <button className="ig-btn ig-btn-outline ig-btn-lg">Ver demo</button>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Acciones de tabla</h3>
        <div className="ig-flex ig-gap-2">
          <button className="ig-btn ig-btn-ghost ig-btn-sm">Editar</button>
          <button className="ig-btn ig-btn-ghost-danger ig-btn-sm">Eliminar</button>
        </div>
      </div>
    </div>
  </div>
);
