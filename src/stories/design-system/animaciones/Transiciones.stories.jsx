import React from 'react';

export default {
  title: 'Animaciones/Transiciones',
};

export const TransicionesVsAnimaciones = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Transiciones vs Animaciones</h2>

    <div className="ig-grid ig-grid-cols-1 md:ig-grid-cols-2 ig-gap-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Transiciones</h3>
        <p className="ig-text-body ig-text-sm ig-mb-4">
          Requieren un trigger (hover, focus, etc.). Suavizan cambios de estado.
        </p>
        <button className="ig-btn ig-btn-brand ig-transition-all ig-duration-300 ig-hover:ig-scale-110 ig-hover:ig-shadow-lg">
          Hover para transición
        </button>
        <code className="ig-block ig-text-xs ig-text-muted ig-mt-2">
          ig-transition-all ig-hover:ig-scale-110
        </code>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Animaciones</h3>
        <p className="ig-text-body ig-text-sm ig-mb-4">
          Se ejecutan automáticamente. Pueden ser infinitas o con repeticiones.
        </p>
        <div className="ig-w-12 ig-h-12 ig-bg-brand ig-rounded ig-animate-bounce"></div>
        <code className="ig-block ig-text-xs ig-text-muted ig-mt-2">
          ig-animate-bounce
        </code>
      </div>
    </div>
  </div>
);

export const TransicionesEnBotones = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Transiciones en Botones</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-4">
      <button className="ig-btn ig-btn-brand ig-transition-colors ig-duration-300 ig-hover:ig-bg-secondary">
        Cambio de color
      </button>

      <button className="ig-btn ig-btn-secondary ig-transition-transform ig-duration-200 ig-hover:ig-scale-105">
        Escalar
      </button>

      <button className="ig-btn ig-btn-success ig-transition-all ig-duration-300 ig-hover:ig-shadow-xl ig-hover:ig--translate-y-1">
        Elevación
      </button>

      <button className="ig-btn ig-btn-warning ig-transition-all ig-duration-300 ig-hover:ig-scale-110">
        Escalar grande
      </button>

      <button className="ig-border-2 ig-border-brand ig-text-brand ig-bg-transparent ig-px-4 ig-py-2 ig-rounded ig-transition-all ig-duration-300 ig-hover:ig-bg-brand ig-hover:ig-text-white">
        Relleno animado
      </button>
    </div>
  </div>
);

export const TransicionesEnCards = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Transiciones en Cards</h2>

    <div className="ig-grid ig-grid-cols-1 md:ig-grid-cols-3 ig-gap-6">
      <div className="ig-card ig-transition-shadow ig-duration-300 ig-hover:ig-shadow-xl ig-cursor-pointer">
        <div className="ig-card-body">
          <h3 className="ig-font-semibold ig-text-heading">Shadow Transition</h3>
          <p className="ig-text-body ig-text-sm">La sombra aumenta suavemente.</p>
          <code className="ig-text-xs ig-text-muted ig-mt-2 ig-block">ig-transition-shadow</code>
        </div>
      </div>

      <div className="ig-card ig-transition-transform ig-duration-300 ig-hover:ig--translate-y-2 ig-cursor-pointer">
        <div className="ig-card-body">
          <h3 className="ig-font-semibold ig-text-heading">Transform Transition</h3>
          <p className="ig-text-body ig-text-sm">Se eleva al hacer hover.</p>
          <code className="ig-text-xs ig-text-muted ig-mt-2 ig-block">ig-transition-transform</code>
        </div>
      </div>

      <div className="ig-card ig-transition-all ig-duration-300 ig-hover:ig-shadow-xl ig-hover:ig--translate-y-2 ig-hover:ig-border-brand ig-cursor-pointer">
        <div className="ig-card-body">
          <h3 className="ig-font-semibold ig-text-heading">All Transitions</h3>
          <p className="ig-text-body ig-text-sm">Múltiples efectos combinados.</p>
          <code className="ig-text-xs ig-text-muted ig-mt-2 ig-block">ig-transition-all</code>
        </div>
      </div>
    </div>
  </div>
);

export const TransicionesEnInputs = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Transiciones en Inputs</h2>

    <div className="ig-space-y-4 ig-max-w-md">
      <input
        type="text"
        className="ig-input ig-transition-all ig-duration-200 ig-focus:ig-ring-brand"
        placeholder="Focus con ring"
      />

      <input
        type="text"
        className="ig-input ig-transition-all ig-duration-200 ig-focus:ig-scale-102"
        placeholder="Focus con escala"
      />

      <input
        type="text"
        className="ig-input ig-transition-all ig-duration-200 ig-focus:ig-border-brand"
        placeholder="Focus cambia borde"
      />
    </div>
  </div>
);

export const TransicionesConGrupo = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Transiciones con Grupo</h2>

    <div className="ig-grid ig-grid-cols-1 md:ig-grid-cols-2 ig-gap-6">
      <div className="ig-group ig-card ig-cursor-pointer ig-overflow-hidden">
        <div className="ig-h-32 ig-bg-brand ig-transition-transform ig-duration-500 ig-group-hover:ig-scale-110"></div>
        <div className="ig-card-body">
          <h3 className="ig-font-semibold ig-text-heading ig-transition-colors ig-group-hover:ig-text-brand">
            Imagen con zoom
          </h3>
          <p className="ig-text-body ig-text-sm">La imagen se amplía al hacer hover en la card.</p>
          <span className="ig-inline-flex ig-items-center ig-text-brand ig-text-sm ig-mt-2">
            Ver más
            <span className="ig-transition-transform ig-group-hover:ig-translate-x-2 ig-ml-1">→</span>
          </span>
        </div>
      </div>

      <div className="ig-group ig-card ig-cursor-pointer">
        <div className="ig-card-body ig-relative">
          <h3 className="ig-font-semibold ig-text-heading">Acciones reveladas</h3>
          <p className="ig-text-body ig-text-sm ig-mb-10">
            Los botones aparecen al hacer hover.
          </p>
          <div className="ig-absolute ig-bottom-4 ig-left-4 ig-right-4 ig-flex ig-gap-2 ig-opacity-0 ig-translate-y-4 ig-transition-all ig-duration-300 ig-group-hover:ig-opacity-100 ig-group-hover:ig-translate-y-0">
            <button className="ig-btn ig-btn-brand ig-btn-sm ig-flex-1">Editar</button>
            <button className="ig-btn ig-btn-outline ig-btn-sm ig-flex-1">Ver</button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const TransicionesSecuenciales = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Transiciones Secuenciales (Delay)</h2>

    <div className="ig-group ig-bg-surface ig-p-6 ig-rounded-lg ig-border ig-border-default">
      <p className="ig-text-body ig-mb-4">Hover sobre el contenedor para ver la secuencia:</p>
      <div className="ig-flex ig-gap-4">
        {[75, 150, 300, 500].map((delay) => (
          <div
            key={delay}
            className={`ig-w-16 ig-h-16 ig-bg-brand ig-rounded ig-transition-all ig-duration-300 ig-delay-${delay} ig-opacity-50 ig-translate-y-4 ig-group-hover:ig-opacity-100 ig-group-hover:ig-translate-y-0`}
          >
            <span className="ig-text-on-brand ig-flex ig-items-center ig-justify-center ig-h-full ig-text-xs">
              {delay}ms
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const TimingFunctions = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Timing Functions (Easing)</h2>
    <p className="ig-text-body ig-mb-6">
      Hover sobre cada barra para ver la diferencia de easing.
    </p>

    <div className="ig-space-y-4">
      {[
        { clase: 'ig-ease-linear', nombre: 'Linear' },
        { clase: 'ig-ease-in', nombre: 'Ease In' },
        { clase: 'ig-ease-out', nombre: 'Ease Out' },
        { clase: 'ig-ease-in-out', nombre: 'Ease In-Out' },
      ].map(({ clase, nombre }) => (
        <div key={clase} className="ig-flex ig-items-center ig-gap-4">
          <code className="ig-text-sm ig-text-muted ig-w-28">{nombre}</code>
          <div className="ig-group ig-flex-1 ig-h-8 ig-bg-muted ig-rounded ig-relative ig-overflow-hidden ig-cursor-pointer">
            <div
              className={`ig-w-8 ig-h-full ig-bg-brand ig-rounded ig-transition-all ig-duration-5000 ${clase} ig-group-hover:ig-w-full`}
            ></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const DuracionesPersonalizadas = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Duraciones Personalizadas</h2>

    <div className="ig-space-y-4">
      {[
        { clase: 'ig-duration-75', ms: '75ms' },
        { clase: 'ig-duration-150', ms: '150ms' },
        { clase: 'ig-duration-300', ms: '300ms' },
        { clase: 'ig-duration-500', ms: '500ms' },
        { clase: 'ig-duration-1000', ms: '1000ms' },
      ].map(({ clase, ms }) => (
        <div key={clase} className="ig-flex ig-items-center ig-gap-4">
          <code className="ig-text-sm ig-text-muted ig-w-32">{ms}</code>
          <div
            className={`ig-w-16 ig-h-8 ig-bg-secondary ig-rounded ig-transition-all ${clase} ig-hover:ig-scale-110 ig-hover:ig-bg-brand ig-cursor-pointer`}
          ></div>
        </div>
      ))}
    </div>
  </div>
);
