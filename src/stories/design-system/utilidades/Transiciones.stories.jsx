import React from 'react';

export default {
  title: 'Utilidades/Transiciones',
};

export const TransicionesBasicas = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Transiciones Básicas</h2>
    <p className="ig-text-body ig-mb-6">
      Pasa el cursor sobre los elementos para ver las transiciones.
    </p>

    <div className="ig-grid ig-grid-cols-2 ig-md:ig-grid-cols-4 ig-gap-4">
      <div className="ig-text-center">
        <div className="ig-bg-brand ig-w-20 ig-h-20 ig-rounded ig-mx-auto ig-mb-2 ig-transition ig-hover:ig-bg-secondary"></div>
        <code className="ig-text-xs ig-text-muted">ig-transition</code>
      </div>

      <div className="ig-text-center">
        <div className="ig-bg-brand ig-w-20 ig-h-20 ig-rounded ig-mx-auto ig-mb-2 ig-transition-fast ig-hover:ig-bg-secondary"></div>
        <code className="ig-text-xs ig-text-muted">ig-transition-fast</code>
      </div>

      <div className="ig-text-center">
        <div className="ig-bg-brand ig-w-20 ig-h-20 ig-rounded ig-mx-auto ig-mb-2 ig-transition-slow ig-hover:ig-bg-secondary"></div>
        <code className="ig-text-xs ig-text-muted">ig-transition-slow</code>
      </div>

      <div className="ig-text-center">
        <div className="ig-bg-brand ig-w-20 ig-h-20 ig-rounded ig-mx-auto ig-mb-2 ig-transition-slower ig-hover:ig-bg-secondary"></div>
        <code className="ig-text-xs ig-text-muted">ig-transition-slower</code>
      </div>
    </div>
  </div>
);

export const PropiedadesDeTransicion = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Propiedades de Transición</h2>

    <div className="ig-grid ig-grid-cols-1 ig-md:ig-grid-cols-2 ig-gap-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-transition-colors</code>
        <button className="ig-bg-brand ig-text-on-brand ig-px-4 ig-py-2 ig-rounded ig-transition-colors ig-duration-300 ig-hover:ig-bg-secondary">
          Cambio de color
        </button>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-transition-opacity</code>
        <div className="ig-bg-brand ig-w-20 ig-h-12 ig-rounded ig-transition-opacity ig-duration-300 ig-hover:ig-opacity-50"></div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-transition-shadow</code>
        <div className="ig-bg-surface ig-border ig-border-default ig-w-20 ig-h-12 ig-rounded ig-shadow ig-transition-shadow ig-duration-300 ig-hover:ig-shadow-xl"></div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-transition-transform</code>
        <div className="ig-bg-brand ig-w-20 ig-h-12 ig-rounded ig-transition-transform ig-duration-300 ig-hover:ig-scale-110"></div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-transition-all</code>
        <div className="ig-bg-brand ig-w-20 ig-h-12 ig-rounded ig-shadow ig-transition-all ig-duration-300 ig-hover:ig-bg-secondary ig-hover:ig-shadow-xl ig-hover:ig-scale-105"></div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-transition-none</code>
        <div className="ig-bg-brand ig-w-20 ig-h-12 ig-rounded ig-transition-none ig-hover:ig-bg-secondary">
          <span className="ig-text-on-brand ig-text-xs ig-flex ig-h-full ig-items-center ig-justify-center">Sin transición</span>
        </div>
      </div>
    </div>
  </div>
);

export const Duracion = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Duración de Transición</h2>

    <div className="ig-space-y-4">
      {[
        { clase: 'ig-duration-75', ms: '75ms' },
        { clase: 'ig-duration-100', ms: '100ms' },
        { clase: 'ig-duration-150', ms: '150ms' },
        { clase: 'ig-duration-200', ms: '200ms' },
        { clase: 'ig-duration-300', ms: '300ms' },
        { clase: 'ig-duration-500', ms: '500ms' },
        { clase: 'ig-duration-700', ms: '700ms' },
        { clase: 'ig-duration-1000', ms: '1000ms' },
      ].map(({ clase, ms }) => (
        <div key={clase} className="ig-flex ig-items-center ig-gap-4">
          <code className="ig-text-sm ig-text-muted ig-w-32">{clase}</code>
          <div className={`ig-bg-brand ig-h-8 ig-w-16 ig-rounded ig-transition-all ${clase} ig-hover:ig-w-64`}></div>
          <span className="ig-text-sm ig-text-muted">({ms})</span>
        </div>
      ))}
    </div>
  </div>
);

export const TimingFunctions = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Timing Functions (Easing)</h2>

    <div className="ig-space-y-4">
      {[
        { clase: 'ig-ease-linear', nombre: 'Linear' },
        { clase: 'ig-ease-in', nombre: 'Ease In' },
        { clase: 'ig-ease-out', nombre: 'Ease Out' },
        { clase: 'ig-ease-in-out', nombre: 'Ease In-Out' },
      ].map(({ clase, nombre }) => (
        <div key={clase} className="ig-flex ig-items-center ig-gap-4">
          <code className="ig-text-sm ig-text-muted ig-w-32">{clase}</code>
          <div className={`ig-bg-secondary ig-h-8 ig-w-16 ig-rounded ig-transition-all ig-duration-500 ${clase} ig-hover:ig-w-64`}></div>
          <span className="ig-text-sm ig-text-muted">({nombre})</span>
        </div>
      ))}
    </div>
  </div>
);

export const Delay = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Delay de Transición</h2>

    <div className="ig-space-y-4">
      {[
        { clase: 'ig-delay-75', ms: '75ms' },
        { clase: 'ig-delay-100', ms: '100ms' },
        { clase: 'ig-delay-150', ms: '150ms' },
        { clase: 'ig-delay-200', ms: '200ms' },
        { clase: 'ig-delay-300', ms: '300ms' },
        { clase: 'ig-delay-500', ms: '500ms' },
      ].map(({ clase, ms }) => (
        <div key={clase} className="ig-flex ig-items-center ig-gap-4">
          <code className="ig-text-sm ig-text-muted ig-w-32">{clase}</code>
          <div className={`ig-bg-success ig-h-8 ig-w-16 ig-rounded ig-transition-all ig-duration-300 ${clase} ig-hover:ig-w-48 ig-hover:ig-bg-warning`}></div>
          <span className="ig-text-sm ig-text-muted">({ms} de delay)</span>
        </div>
      ))}
    </div>
  </div>
);

export const EjemplosBotones = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Transiciones en Botones</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-4">
      <button className="ig-btn ig-btn-brand ig-transition-all ig-duration-200 ig-hover:ig-shadow-lg ig-hover:ig--translate-y-0.5">
        Elevación
      </button>

      <button className="ig-btn ig-btn-secondary ig-transition-all ig-duration-200 ig-hover:ig-scale-105">
        Escalar
      </button>

      <button className="ig-btn ig-btn-outline ig-transition-all ig-duration-300 ig-hover:ig-bg-brand ig-hover:ig-text-on-brand ig-hover:ig-border-brand">
        Cambio completo
      </button>

      <button className="ig-bg-transparent ig-border-2 ig-border-brand ig-text-brand ig-px-4 ig-py-2 ig-rounded ig-transition-all ig-duration-300 ig-hover:ig-bg-brand ig-hover:ig-text-on-brand ig-hover:ig-shadow-lg">
        Relleno animado
      </button>
    </div>
  </div>
);

export const EjemplosCards = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Transiciones en Cards</h2>

    <div className="ig-grid ig-grid-cols-1 ig-md:ig-grid-cols-3 ig-gap-6">
      <div className="ig-card ig-transition-shadow ig-duration-300 ig-hover:ig-shadow-xl ig-cursor-pointer">
        <div className="ig-card-body">
          <h3 className="ig-font-semibold ig-text-heading ig-mb-2">Sombra en Hover</h3>
          <p className="ig-text-body ig-text-sm">La sombra aumenta al pasar el cursor.</p>
        </div>
      </div>

      <div className="ig-card ig-transition-transform ig-duration-300 ig-hover:ig--translate-y-2 ig-cursor-pointer">
        <div className="ig-card-body">
          <h3 className="ig-font-semibold ig-text-heading ig-mb-2">Elevación en Hover</h3>
          <p className="ig-text-body ig-text-sm">La card sube ligeramente.</p>
        </div>
      </div>

      <div className="ig-card ig-transition-all ig-duration-300 ig-hover:ig-shadow-xl ig-hover:ig--translate-y-2 ig-hover:ig-border-brand ig-cursor-pointer">
        <div className="ig-card-body">
          <h3 className="ig-font-semibold ig-text-heading ig-mb-2">Efecto Completo</h3>
          <p className="ig-text-body ig-text-sm">Múltiples transiciones combinadas.</p>
        </div>
      </div>
    </div>
  </div>
);

export const TransicionesDeGrupo = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Transiciones en Grupo (group-hover)</h2>

    <div className="ig-grid ig-grid-cols-1 ig-md:ig-grid-cols-2 ig-gap-6">
      <div className="ig-group ig-card ig-cursor-pointer ig-hover:ig-shadow-xl ig-transition-shadow">
        <div className="ig-card-body">
          <h3 className="ig-font-semibold ig-text-heading ig-mb-2 ig-group-hover:ig-text-brand ig-transition-colors">
            Título que cambia
          </h3>
          <p className="ig-text-body ig-text-sm ig-group-hover:ig-text-heading ig-transition-colors">
            El texto cambia de color cuando el padre tiene hover.
          </p>
          <span className="ig-inline-block ig-mt-4 ig-text-brand ig-transition-transform ig-group-hover:ig-translate-x-2">
            Ver más →
          </span>
        </div>
      </div>

      <div className="ig-group ig-card ig-cursor-pointer ig-overflow-hidden">
        <div className="ig-h-32 ig-bg-brand ig-transition-transform ig-duration-500 ig-group-hover:ig-scale-110"></div>
        <div className="ig-card-body">
          <h3 className="ig-font-semibold ig-text-heading">Imagen con zoom</h3>
          <p className="ig-text-body ig-text-sm">La imagen hace zoom en hover del grupo.</p>
        </div>
      </div>
    </div>
  </div>
);
