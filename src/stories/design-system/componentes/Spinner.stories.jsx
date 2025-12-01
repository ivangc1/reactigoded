import React from 'react';

export default {
  title: 'Componentes/Spinner',
};

export const SpinnerBasico = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Spinner Básico</h2>

    <div className="ig-flex ig-gap-8 ig-items-center">
      <div className="ig-spinner"></div>
      <span className="ig-text-body">Cargando...</span>
    </div>
  </div>
);

export const VariantesDeColor = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Variantes de Color</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-8 ig-items-center">
      <div className="ig-text-center">
        <div className="ig-spinner ig-spinner-brand ig-mb-2"></div>
        <span className="ig-text-sm ig-text-muted">Brand</span>
      </div>
      <div className="ig-text-center">
        <div className="ig-spinner ig-spinner-secondary ig-mb-2"></div>
        <span className="ig-text-sm ig-text-muted">Secondary</span>
      </div>
      <div className="ig-text-center">
        <div className="ig-spinner ig-spinner-success ig-mb-2"></div>
        <span className="ig-text-sm ig-text-muted">Success</span>
      </div>
      <div className="ig-text-center">
        <div className="ig-spinner ig-spinner-warning ig-mb-2"></div>
        <span className="ig-text-sm ig-text-muted">Warning</span>
      </div>
      <div className="ig-text-center">
        <div className="ig-spinner ig-spinner-danger ig-mb-2"></div>
        <span className="ig-text-sm ig-text-muted">Danger</span>
      </div>
      <div className="ig-text-center">
        <div className="ig-spinner ig-spinner-info ig-mb-2"></div>
        <span className="ig-text-sm ig-text-muted">Info</span>
      </div>
    </div>
  </div>
);

export const Tamanos = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tamaños</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-8 ig-items-end">
      <div className="ig-text-center">
        <div className="ig-spinner ig-spinner-sm ig-spinner-brand ig-mb-2"></div>
        <span className="ig-text-sm ig-text-muted">sm (1rem)</span>
      </div>
      <div className="ig-text-center">
        <div className="ig-spinner ig-spinner-brand ig-mb-2"></div>
        <span className="ig-text-sm ig-text-muted">default (1.5rem)</span>
      </div>
      <div className="ig-text-center">
        <div className="ig-spinner ig-spinner-lg ig-spinner-brand ig-mb-2"></div>
        <span className="ig-text-sm ig-text-muted">lg (2rem)</span>
      </div>
      <div className="ig-text-center">
        <div className="ig-spinner ig-spinner-xl ig-spinner-brand ig-mb-2"></div>
        <span className="ig-text-sm ig-text-muted">xl (3rem)</span>
      </div>
    </div>
  </div>
);

export const SpinnerEnBoton = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Spinner en Botón</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-4">
      <button className="ig-btn ig-btn-brand" disabled>
        <span className="ig-spinner ig-spinner-sm" style={{ borderTopColor: 'currentColor' }}></span>
        Cargando...
      </button>

      <button className="ig-btn ig-btn-secondary" disabled>
        <span className="ig-spinner ig-spinner-sm" style={{ borderTopColor: 'currentColor' }}></span>
        Procesando
      </button>

      <button className="ig-btn ig-btn-outline" disabled>
        <span className="ig-spinner ig-spinner-sm ig-spinner-brand"></span>
        Guardando
      </button>
    </div>
  </div>
);

export const SpinnerConTexto = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Spinner con Texto</h2>

    <div className="ig-space-y-6">
      <div className="ig-flex ig-items-center ig-gap-3">
        <div className="ig-spinner ig-spinner-brand"></div>
        <span className="ig-text-body">Cargando datos...</span>
      </div>

      <div className="ig-flex ig-flex-col ig-items-center ig-gap-3">
        <div className="ig-spinner ig-spinner-lg ig-spinner-secondary"></div>
        <span className="ig-text-body">Por favor espera</span>
      </div>
    </div>
  </div>
);

export const EstadoDeCarga = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Estado de Carga</h2>

    <div className="ig-space-y-6">
      {/* Card con loading */}
      <div className="ig-card ig-relative">
        <div className="ig-card-body ig-flex ig-items-center ig-justify-center ig-h-32">
          <div className="ig-text-center">
            <div className="ig-spinner ig-spinner-lg ig-spinner-brand ig-mb-3"></div>
            <p className="ig-text-muted">Cargando contenido...</p>
          </div>
        </div>
      </div>

      {/* Página completa */}
      <div className="ig-bg-surface ig-rounded-lg ig-border ig-border-default ig-h-48 ig-flex ig-items-center ig-justify-center">
        <div className="ig-text-center">
          <div className="ig-spinner ig-spinner-xl ig-spinner-brand ig-mb-4"></div>
          <h3 className="ig-text-lg ig-font-semibold ig-text-heading">Cargando aplicación</h3>
          <p className="ig-text-sm ig-text-muted">Esto puede tomar unos segundos...</p>
        </div>
      </div>
    </div>
  </div>
);

export const SpinnerOverlay = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Spinner con Overlay</h2>

    <div className="ig-relative ig-h-48 ig-bg-surface ig-rounded-lg ig-border ig-border-default ig-overflow-hidden">
      {/* Contenido de fondo */}
      <div className="ig-p-4">
        <h3 className="ig-font-semibold ig-text-heading">Contenido de ejemplo</h3>
        <p className="ig-text-body">Este contenido está detrás del overlay.</p>
      </div>

      {/* Overlay con spinner */}
      <div className="ig-absolute ig-inset-0 ig-bg-base/80 ig-flex ig-items-center ig-justify-center">
        <div className="ig-text-center">
          <div className="ig-spinner ig-spinner-lg ig-spinner-brand ig-mb-3"></div>
          <p className="ig-text-body">Guardando cambios...</p>
        </div>
      </div>
    </div>
  </div>
);
