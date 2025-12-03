import React from 'react';

export default {
  title: 'Layout/Posicionamiento',
};

export const TiposDePosicion = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tipos de Posición</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-static (default)</code>
        <div className="ig-h-24 ig-bg-muted ig-rounded ig-p-4 ig-relative">
          <div className="ig-static ig-bg-brand ig-p-3 ig-rounded ig-text-on-brand ig-inline-block">
            Static: sigue el flujo normal
          </div>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-relative</code>
        <div className="ig-h-32 ig-bg-muted ig-rounded ig-p-4">
          <div className="ig-relative ig-top-4 ig-left-4 ig-bg-secondary ig-p-3 ig-rounded ig-text-on-secondary ig-inline-block">
            Relative: se puede mover desde su posición original
          </div>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-absolute (dentro de ig-relative)</code>
        <div className="ig-h-32 ig-bg-muted ig-rounded ig-p-4 ig-relative">
          <div className="ig-absolute ig-top-2 ig-right-2 ig-bg-success ig-p-3 ig-rounded ig-text-on-success">
            Absolute: posición exacta
          </div>
          <div className="ig-absolute ig-bottom-2 ig-left-2 ig-bg-warning ig-p-3 ig-rounded ig-text-on-warning">
            Otro absolute
          </div>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-fixed (fijo en viewport)</code>
        <p className="ig-text-body ig-text-sm">
          <code className="ig-bg-muted ig-px-1 ig-rounded">ig-fixed</code> posiciona relativo al viewport.
          Útil para navbars, modales y botones flotantes.
        </p>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-sticky</code>
        <div className="ig-h-48 ig-overflow-y-auto ig-bg-muted ig-rounded">
          <div className="ig-p-4">
            <p className="ig-text-body ig-mb-4">Scroll para ver el efecto sticky</p>
            <div className="ig-sticky ig-top-0 ig-bg-danger ig-p-3 ig-rounded ig-text-on-danger ig-mb-4">
              Sticky: se pega al scroll
            </div>
            {Array.from({ length: 10 }, (_, i) => (
              <p key={i} className="ig-text-body ig-mb-2">Contenido de scroll {i + 1}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const Inset = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Inset (top, right, bottom, left)</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-inset-0 (todos los lados a 0)</code>
        <div className="ig-h-32 ig-bg-muted ig-rounded ig-relative">
          <div className="ig-absolute ig-inset-0 ig-bg-brand/30 ig-flex ig-items-center ig-justify-center">
            <span className="ig-text-brand ig-font-semibold">Cubre todo el contenedor</span>
          </div>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-inset-x-0, ig-inset-y-0</code>
        <div className="ig-grid ig-grid-cols-2 ig-gap-4">
          <div className="ig-h-32 ig-bg-muted ig-rounded ig-relative">
            <div className="ig-absolute ig-inset-x-0 ig-top-0 ig-h-12 ig-bg-secondary ig-flex ig-items-center ig-justify-center">
              <span className="ig-text-on-secondary ig-text-sm">inset-x-0 top-0</span>
            </div>
          </div>
          <div className="ig-h-32 ig-bg-muted ig-rounded ig-relative">
            <div className="ig-absolute ig-inset-y-0 ig-left-0 ig-w-20 ig-bg-success ig-flex ig-items-center ig-justify-center">
              <span className="ig-text-on-success ig-text-sm">inset-y-0 left-0</span>
            </div>
          </div>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">Posiciones individuales</code>
        <div className="ig-h-40 ig-bg-muted ig-rounded ig-relative">
          <div className="ig-absolute ig-top-2 ig-left-2 ig-p-2 ig-bg-brand ig-rounded ig-text-on-brand ig-text-xs">
            top-2 left-2
          </div>
          <div className="ig-absolute ig-top-2 ig-right-2 ig-p-2 ig-bg-secondary ig-rounded ig-text-on-secondary ig-text-xs">
            top-2 right-2
          </div>
          <div className="ig-absolute ig-bottom-2 ig-left-2 ig-p-2 ig-bg-success ig-rounded ig-text-on-success ig-text-xs">
            bottom-2 left-2
          </div>
          <div className="ig-absolute ig-bottom-2 ig-right-2 ig-p-2 ig-bg-warning ig-rounded ig-text-on-warning ig-text-xs">
            bottom-2 right-2
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const ZIndex = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Z-Index</h2>
    <p className="ig-text-body ig-mb-6">
      Controla el orden de apilamiento de elementos posicionados.
    </p>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">Orden de apilamiento</code>
        <div className="ig-h-40 ig-relative">
          <div className="ig-absolute ig-top-0 ig-left-0 ig-w-32 ig-h-32 ig-bg-brand ig-rounded ig-z-0 ig-flex ig-items-center ig-justify-center">
            <span className="ig-text-on-brand">z-0</span>
          </div>
          <div className="ig-absolute ig-top-4 ig-left-4 ig-w-32 ig-h-32 ig-bg-secondary ig-rounded ig-z-10 ig-flex ig-items-center ig-justify-center">
            <span className="ig-text-on-secondary">z-10</span>
          </div>
          <div className="ig-absolute ig-top-8 ig-left-8 ig-w-32 ig-h-32 ig-bg-success ig-rounded ig-z-20 ig-flex ig-items-center ig-justify-center">
            <span className="ig-text-on-success">z-20</span>
          </div>
          <div className="ig-absolute ig-top-12 ig-left-12 ig-w-32 ig-h-32 ig-bg-warning ig-rounded ig-z-30 ig-flex ig-items-center ig-justify-center">
            <span className="ig-text-on-warning">z-30</span>
          </div>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Variables de z-index semánticos</h3>
        <div className="ig-grid ig-grid-cols-2 ig-md:ig-grid-cols-3 ig-gap-2 ig-text-sm">
          <code className="ig-text-muted">--ig-z-dropdown: 1000</code>
          <code className="ig-text-muted">--ig-z-sticky: 1020</code>
          <code className="ig-text-muted">--ig-z-fixed: 1030</code>
          <code className="ig-text-muted">--ig-z-modal-backdrop: 1040</code>
          <code className="ig-text-muted">--ig-z-modal: 1050</code>
          <code className="ig-text-muted">--ig-z-popover: 1060</code>
          <code className="ig-text-muted">--ig-z-tooltip: 1070</code>
          <code className="ig-text-muted">--ig-z-toast: 1080</code>
        </div>
      </div>
    </div>
  </div>
);

export const Display = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Display</h2>

    <div className="ig-space-y-4">
      {[
        { clase: 'ig-block', desc: 'Elemento de bloque' },
        { clase: 'ig-inline-block', desc: 'Inline con propiedades de bloque' },
        { clase: 'ig-inline', desc: 'Elemento inline' },
        { clase: 'ig-flex', desc: 'Contenedor flex' },
        { clase: 'ig-inline-flex', desc: 'Flex inline' },
        { clase: 'ig-grid', desc: 'Contenedor grid' },
        { clase: 'ig-hidden', desc: 'Oculto (display: none)' },
      ].map(({ clase, desc }) => (
        <div key={clase} className="ig-flex ig-items-center ig-gap-4 ig-p-3 ig-bg-surface ig-rounded-lg ig-border ig-border-default">
          <code className="ig-text-sm ig-text-muted ig-w-32">{clase}</code>
          <span className="ig-text-body">{desc}</span>
        </div>
      ))}
    </div>
  </div>
);

export const Overflow = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Overflow</h2>

    <div className="ig-grid ig-grid-cols-1 ig-md:ig-grid-cols-2 ig-gap-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-overflow-hidden</code>
        <div className="ig-w-full ig-h-24 ig-overflow-hidden ig-bg-muted ig-rounded">
          <div className="ig-w-full ig-h-48 ig-bg-brand/30 ig-flex ig-items-center ig-justify-center">
            <span className="ig-text-brand">Contenido cortado</span>
          </div>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-overflow-auto</code>
        <div className="ig-w-full ig-h-24 ig-overflow-auto ig-bg-muted ig-rounded">
          <div className="ig-w-full ig-h-48 ig-bg-secondary/30 ig-flex ig-items-center ig-justify-center">
            <span className="ig-text-secondary">Scroll si es necesario</span>
          </div>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-overflow-x-auto</code>
        <div className="ig-overflow-x-auto ig-bg-muted ig-rounded">
          <div className="ig-w-[600px] ig-h-16 ig-bg-success/30 ig-flex ig-items-center ig-justify-center">
            <span className="ig-text-success">Scroll horizontal</span>
          </div>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-overflow-visible</code>
        <div className="ig-w-full ig-h-24 ig-overflow-visible ig-bg-muted ig-rounded ig-relative">
          <div className="ig-absolute ig-top-4 ig-left-4 ig-w-32 ig-h-32 ig-bg-warning ig-rounded ig-flex ig-items-center ig-justify-center">
            <span className="ig-text-on-warning ig-text-sm">Se desborda</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const EjemplosReales = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Ejemplos Reales</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Badge en esquina</h3>
        <div className="ig-relative ig-inline-block">
          <div className="ig-w-16 ig-h-16 ig-bg-muted ig-rounded-lg ig-flex ig-items-center ig-justify-center">
            <span className="ig-text-2xl">📦</span>
          </div>
          <span className="ig-absolute ig--top-1 ig--right-1 ig-bg-danger ig-text-on-danger ig-text-xs ig-px-2 ig-py-0.5 ig-rounded-full">
            3
          </span>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Card con overlay</h3>
        <div className="ig-relative ig-w-64 ig-h-40 ig-rounded-lg ig-overflow-hidden">
          <div className="ig-absolute ig-inset-0 ig-bg-gradient-to-t ig-from-black/70 ig-to-transparent" />
          <div className="ig-absolute ig-inset-0 ig-bg-muted" />
          <div className="ig-absolute ig-bottom-0 ig-left-0 ig-right-0 ig-p-4">
            <h4 className="ig-text-white ig-font-semibold">Título de la card</h4>
            <p className="ig-text-white/80 ig-text-sm">Descripción con overlay</p>
          </div>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Botón flotante (FAB)</h3>
        <div className="ig-relative ig-h-32 ig-bg-muted ig-rounded-lg">
          <button className="ig-absolute ig-bottom-4 ig-right-4 ig-w-12 ig-h-12 ig-bg-brand ig-text-on-brand ig-rounded-full ig-shadow-lg ig-flex ig-items-center ig-justify-center ig-text-xl">
            +
          </button>
        </div>
      </div>
    </div>
  </div>
);
