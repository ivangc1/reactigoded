import React from 'react';

export default {
  title: 'Interactivos/Hover',
};

export const HoverBasico = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Hover Básico</h2>
    <p className="ig-text-body ig-mb-6">
      Las clases <code className="ig-bg-muted ig-px-1 ig-rounded">ig-hover:*</code> aplican estilos
      cuando el cursor está sobre el elemento.
    </p>

    <div className="ig-flex ig-flex-wrap ig-gap-4">
      <button className="ig-bg-brand ig-text-on-brand ig-px-4 ig-py-2 ig-rounded ig-hover:ig-bg-secondary ig-transition-colors">
        Cambio de color
      </button>

      <button className="ig-bg-surface ig-border ig-border-default ig-px-4 ig-py-2 ig-rounded ig-hover:ig-border-brand ig-hover:ig-text-brand ig-transition-colors">
        Cambio de borde
      </button>

      <div className="ig-bg-muted ig-p-4 ig-rounded ig-hover:ig-bg-surface ig-hover:ig-shadow-lg ig-transition-all ig-cursor-pointer">
        Hover para elevar
      </div>
    </div>
  </div>
);

export const HoverColores = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Hover en Colores</h2>

    <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-3 ig-gap-4">
      <div className="ig-bg-brand ig-hover:ig-bg-secondary ig-text-on-brand ig-p-4 ig-rounded ig-transition-colors ig-cursor-pointer ig-text-center">
        Brand → Secondary
      </div>
      <div className="ig-bg-success ig-hover:ig-bg-warning ig-text-white ig-p-4 ig-rounded ig-transition-colors ig-cursor-pointer ig-text-center">
        Success → Warning
      </div>
      <div className="ig-bg-warning ig-hover:ig-bg-danger ig-text-white ig-p-4 ig-rounded ig-transition-colors ig-cursor-pointer ig-text-center">
        Warning → Danger
      </div>
    </div>
  </div>
);

export const HoverOpacidad = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Hover con Opacidad</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-4">
      <div className="ig-bg-brand ig-p-4 ig-rounded ig-cursor-pointer ig-hover:ig-opacity-75 ig-transition-opacity">
        <span className="ig-text-on-brand">Opacity 75%</span>
      </div>
      <div className="ig-bg-secondary ig-p-4 ig-rounded ig-cursor-pointer ig-hover:ig-opacity-50 ig-transition-opacity">
        <span className="ig-text-on-secondary">Opacity 50%</span>
      </div>
      <div className="ig-opacity-50 ig-bg-success ig-p-4 ig-rounded ig-cursor-pointer ig-hover:ig-opacity-100 ig-transition-opacity">
        <span className="ig-text-on-success">50% → 100%</span>
      </div>
    </div>
  </div>
);

export const HoverTransformaciones = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Hover con Transformaciones</h2>

    <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-4 ig-gap-6 ig-p-4">
      <div className="ig-text-center">
        <div className="ig-bg-brand ig-w-20 ig-h-20 ig-rounded ig-mx-auto ig-transition-transform ig-hover:ig-scale-110 ig-cursor-pointer"></div>
        <code className="ig-text-xs ig-text-muted ig-mt-2 ig-block">ig-hover:ig-scale-110</code>
      </div>

      <div className="ig-text-center">
        <div className="ig-bg-secondary ig-w-20 ig-h-20 ig-rounded ig-mx-auto ig-transition-transform ig-hover:ig--translate-y-2 ig-cursor-pointer"></div>
        <code className="ig-text-xs ig-text-muted ig-mt-2 ig-block">ig-hover:ig--translate-y-2</code>
      </div>

      <div className="ig-text-center">
        <div className="ig-bg-success ig-w-20 ig-h-20 ig-rounded ig-mx-auto ig-transition-transform ig-hover:ig-rotate-6 ig-cursor-pointer"></div>
        <code className="ig-text-xs ig-text-muted ig-mt-2 ig-block">ig-hover:ig-rotate-6</code>
      </div>

      <div className="ig-text-center">
        <div className="ig-bg-warning ig-w-20 ig-h-20 ig-rounded-full ig-mx-auto ig-transition-transform ig-hover:ig-scale-90 ig-cursor-pointer"></div>
        <code className="ig-text-xs ig-text-muted ig-mt-2 ig-block">ig-hover:ig-scale-90</code>
      </div>
    </div>
  </div>
);

export const HoverSombras = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Hover con Sombras</h2>

    <div className="ig-grid ig-grid-cols-1 md:ig-grid-cols-3 ig-gap-6">
      <div className="ig-bg-surface ig-p-6 ig-rounded-lg ig-border ig-border-default ig-shadow-sm ig-hover:ig-shadow-lg ig-transition-shadow ig-cursor-pointer">
        <h3 className="ig-font-semibold ig-text-heading">Shadow SM → LG</h3>
        <p className="ig-text-body ig-text-sm">Incremento de sombra</p>
      </div>

      <div className="ig-bg-surface ig-p-6 ig-rounded-lg ig-border ig-border-default ig-hover:ig-shadow-xl ig-hover:ig--translate-y-1 ig-transition-all ig-cursor-pointer">
        <h3 className="ig-font-semibold ig-text-heading">Elevación</h3>
        <p className="ig-text-body ig-text-sm">Sombra + movimiento</p>
      </div>

      <div className="ig-bg-surface ig-p-6 ig-rounded-lg ig-border ig-border-default ig-shadow-md ig-hover:ig-shadow-none ig-transition-shadow ig-cursor-pointer">
        <h3 className="ig-font-semibold ig-text-heading">Shadow → None</h3>
        <p className="ig-text-body ig-text-sm">Remover sombra</p>
      </div>
    </div>
  </div>
);

export const HoverEnBotones = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Hover en Botones</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-4">
      <button className="ig-btn ig-btn-brand ig-hover:ig-shadow-lg ig-hover:ig--translate-y-0.5 ig-transition-all">
        Con elevación
      </button>

      <button className="ig-bg-transparent ig-border-2 ig-border-brand ig-text-brand ig-px-4 ig-py-2 ig-rounded ig-hover:ig-bg-brand ig-hover:ig-text-on-brand ig-transition-all">
        Relleno al hover
      </button>

      <button className="ig-btn ig-btn-secondary ig-hover:ig-scale-105 ig-transition-transform">
        Escalar
      </button>

      <button className="ig-btn ig-btn-outline ig-relative ig-overflow-hidden ig-group">
        <span className="ig-relative ig-z-10">Efecto fondo</span>
        <span className="ig-absolute ig-inset-0 ig-bg-brand ig-scale-x-0 ig-group-hover:ig-scale-x-100 ig-origin-left ig-transition-transform ig-duration-300"></span>
      </button>
    </div>
  </div>
);

export const HoverEnCards = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Hover en Cards</h2>

    <div className="ig-grid ig-grid-cols-1 md:ig-grid-cols-3 ig-gap-6">
      <div className="ig-card ig-hover:ig-border-brand ig-transition-colors ig-cursor-pointer">
        <div className="ig-card-body">
          <h3 className="ig-font-semibold ig-text-heading">Borde activo</h3>
          <p className="ig-text-body ig-text-sm">El borde cambia a brand color.</p>
        </div>
      </div>

      <div className="ig-card ig-hover:ig-shadow-xl ig-hover:ig--translate-y-2 ig-transition-all ig-cursor-pointer">
        <div className="ig-card-body">
          <h3 className="ig-font-semibold ig-text-heading">Flotante</h3>
          <p className="ig-text-body ig-text-sm">Se eleva al pasar el cursor.</p>
        </div>
      </div>

      <div className="ig-card ig-overflow-hidden ig-cursor-pointer ig-group">
        <div className="ig-h-32 ig-bg-brand ig-transition-transform ig-duration-500 ig-group-hover:ig-scale-110"></div>
        <div className="ig-card-body">
          <h3 className="ig-font-semibold ig-text-heading ig-group-hover:ig-text-brand ig-transition-colors">
            Imagen zoom
          </h3>
          <p className="ig-text-body ig-text-sm">La imagen hace zoom.</p>
        </div>
      </div>
    </div>
  </div>
);

export const HoverEnListas = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Hover en Listas</h2>

    <div className="ig-bg-surface ig-rounded-lg ig-border ig-border-default ig-divide-y ig-divide-subtle">
      {['Elemento 1', 'Elemento 2', 'Elemento 3', 'Elemento 4'].map((item, i) => (
        <div key={i} className="ig-p-4 ig-hover:ig-bg-muted ig-cursor-pointer ig-transition-colors">
          <span className="ig-text-body">{item}</span>
        </div>
      ))}
    </div>

    <div className="ig-mt-6 ig-bg-surface ig-rounded-lg ig-border ig-border-default ig-divide-y ig-divide-subtle">
      {['Opción A', 'Opción B', 'Opción C'].map((item, i) => (
        <div key={i} className="ig-p-4 ig-flex ig-items-center ig-gap-3 ig-hover:ig-bg-brand/10 ig-hover:ig-border-l-4 ig-hover:ig-border-brand ig-cursor-pointer ig-transition-all">
          <span className="ig-text-body">{item}</span>
          <span className="ig-ml-auto ig-text-muted ig-opacity-0 ig-hover:ig-opacity-100 ig-transition-opacity">→</span>
        </div>
      ))}
    </div>
  </div>
);
