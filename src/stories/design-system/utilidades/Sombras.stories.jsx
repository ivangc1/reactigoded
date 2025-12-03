import React from 'react';

export default {
  title: 'Utilidades/Sombras',
};

export const SombrasDeBox = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Box Shadows</h2>

    <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-4 ig-gap-8 ig-p-4">
      {[
        { clase: 'ig-shadow-none', nombre: 'none' },
        { clase: 'ig-shadow-sm', nombre: 'sm' },
        { clase: 'ig-shadow', nombre: 'default' },
        { clase: 'ig-shadow-md', nombre: 'md' },
        { clase: 'ig-shadow-lg', nombre: 'lg' },
        { clase: 'ig-shadow-xl', nombre: 'xl' },
        { clase: 'ig-shadow-2xl', nombre: '2xl' },
        { clase: 'ig-shadow-inner', nombre: 'inner' },
      ].map(({ clase, nombre }) => (
        <div key={clase} className="ig-text-center">
          <div className={`ig-w-full ig-h-24 ig-bg-surface ${clase} ig-rounded-lg ig-mb-3`}></div>
          <code className="ig-text-sm ig-text-muted">{clase}</code>
        </div>
      ))}
    </div>
  </div>
);

export const SombrasEnCards = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Sombras en Cards</h2>

    <div className="ig-grid ig-grid-cols-1 md:ig-grid-cols-3 ig-gap-6">
      <div className="ig-bg-surface ig-rounded-lg ig-shadow-sm ig-p-4">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-2">Sombra Sutil</h3>
        <p className="ig-text-body ig-text-sm">
          Ideal para elementos que necesitan una ligera elevación.
        </p>
        <code className="ig-text-xs ig-text-muted ig-mt-2 ig-block">ig-shadow-sm</code>
      </div>

      <div className="ig-bg-surface ig-rounded-lg ig-shadow-md ig-p-4">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-2">Sombra Media</h3>
        <p className="ig-text-body ig-text-sm">
          Para cards y elementos con más prominencia.
        </p>
        <code className="ig-text-xs ig-text-muted ig-mt-2 ig-block">ig-shadow-md</code>
      </div>

      <div className="ig-bg-surface ig-rounded-lg ig-shadow-xl ig-p-4">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-2">Sombra Grande</h3>
        <p className="ig-text-body ig-text-sm">
          Para modales, dropdowns y elementos flotantes.
        </p>
        <code className="ig-text-xs ig-text-muted ig-mt-2 ig-block">ig-shadow-xl</code>
      </div>
    </div>
  </div>
);

export const SombraInner = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Sombra Inner</h2>

    <div className="ig-grid ig-grid-cols-1 md:ig-grid-cols-2 ig-gap-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Input con sombra inner</h3>
        <input
          type="text"
          className="ig-input ig-shadow-inner"
          placeholder="Campo con sombra inner"
        />
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Área hundida</h3>
        <div className="ig-bg-muted ig-rounded ig-shadow-inner ig-p-4 ig-text-center">
          <span className="ig-text-muted">Contenido hundido</span>
        </div>
      </div>
    </div>
  </div>
);

export const Opacidad = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Opacidad</h2>

    <div className="ig-grid ig-grid-cols-3 md:ig-grid-cols-6 ig-gap-4">
      {[0, 10, 25, 50, 75, 100].map((valor) => (
        <div key={valor} className="ig-text-center">
          <div className={`ig-w-full ig-h-16 ig-bg-brand ig-opacity-${valor} ig-rounded ig-mb-2`}></div>
          <code className="ig-text-xs ig-text-muted">ig-opacity-{valor}</code>
        </div>
      ))}
    </div>

    <div className="ig-mt-8">
      <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Más valores de opacidad</h3>
      <div className="ig-grid ig-grid-cols-4 md:ig-grid-cols-8 ig-gap-2">
        {[5, 20, 30, 40, 60, 70, 80, 90, 95].map((valor) => (
          <div key={valor} className="ig-text-center">
            <div className={`ig-w-full ig-h-10 ig-bg-secondary ig-opacity-${valor} ig-rounded ig-mb-1`}></div>
            <code className="ig-text-xs ig-text-muted">{valor}</code>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const Blur = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Blur (Desenfoque)</h2>

    <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-4 ig-gap-4">
      {[
        { clase: 'ig-blur-none', nombre: 'none' },
        { clase: 'ig-blur-sm', nombre: 'sm' },
        { clase: 'ig-blur', nombre: 'default' },
        { clase: 'ig-blur-md', nombre: 'md' },
        { clase: 'ig-blur-lg', nombre: 'lg' },
        { clase: 'ig-blur-xl', nombre: 'xl' },
        { clase: 'ig-blur-2xl', nombre: '2xl' },
        { clase: 'ig-blur-3xl', nombre: '3xl' },
      ].map(({ clase, nombre }) => (
        <div key={clase} className="ig-text-center">
          <div className={`ig-w-full ig-h-16 ig-bg-brand ${clase} ig-rounded ig-mb-2`}></div>
          <code className="ig-text-xs ig-text-muted">{clase}</code>
        </div>
      ))}
    </div>
  </div>
);

export const EjemploBlurOverlay = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Blur en Overlay</h2>

    <div className="ig-relative ig-h-64 ig-rounded-lg ig-overflow-hidden">
      {/* Contenido de fondo */}
      <div className="ig-absolute ig-inset-0 ig-bg-gradient-to-br ig-from-brand ig-to-secondary ig-flex ig-items-center ig-justify-center">
        <span className="ig-text-white ig-text-2xl ig-font-bold">Contenido de Fondo</span>
      </div>

      {/* Overlay con blur */}
      <div className="ig-absolute ig-inset-0 ig-backdrop-blur-sm ig-bg-base/50 ig-flex ig-items-center ig-justify-center">
        <div className="ig-bg-surface ig-p-6 ig-rounded-lg ig-shadow-xl ig-text-center">
          <h3 className="ig-font-semibold ig-text-heading ig-mb-2">Modal con backdrop blur</h3>
          <p className="ig-text-body ig-text-sm">El fondo está desenfocado</p>
          <code className="ig-text-xs ig-text-muted ig-mt-2 ig-block">ig-backdrop-blur-sm</code>
        </div>
      </div>
    </div>
  </div>
);

export const GradientesSombra = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Combinación: Gradientes y Sombras</h2>

    <div className="ig-grid ig-grid-cols-1 md:ig-grid-cols-3 ig-gap-6">
      <div className="ig-bg-gradient-to-br ig-from-brand ig-to-secondary ig-rounded-lg ig-shadow-lg ig-p-6 ig-text-white">
        <h3 className="ig-font-semibold ig-mb-2">Gradiente + Sombra</h3>
        <p className="ig-text-sm ig-opacity-90">Card con gradiente y sombra lg</p>
      </div>

      <div className="ig-bg-gradient-to-r ig-from-success ig-to-info ig-rounded-lg ig-shadow-xl ig-p-6 ig-text-white">
        <h3 className="ig-font-semibold ig-mb-2">Efecto Glassmorphism</h3>
        <p className="ig-text-sm ig-opacity-90">Con sombra xl</p>
      </div>

      <div className="ig-bg-gradient-to-tr ig-from-warning ig-to-danger ig-rounded-lg ig-shadow-2xl ig-p-6 ig-text-white">
        <h3 className="ig-font-semibold ig-mb-2">Elevación Máxima</h3>
        <p className="ig-text-sm ig-opacity-90">Con sombra 2xl</p>
      </div>
    </div>
  </div>
);

export const SombrasResponsivas = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Sombras en Estados</h2>

    <div className="ig-space-y-4">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Hover con Sombra</h3>
        <div className="ig-flex ig-gap-4">
          <button className="ig-btn ig-btn-brand ig-shadow hover:ig-shadow-lg ig-transition-shadow">
            Hover para sombra
          </button>
          <div className="ig-bg-surface ig-p-4 ig-rounded ig-border ig-border-default ig-shadow-sm hover:ig-shadow-xl ig-transition-shadow ig-cursor-pointer">
            Card con hover
          </div>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Focus con Ring</h3>
        <input
          type="text"
          className="ig-input focus:ig-ring-2 focus:ig-ring-brand"
          placeholder="Focus para ver el ring"
        />
      </div>
    </div>
  </div>
);
