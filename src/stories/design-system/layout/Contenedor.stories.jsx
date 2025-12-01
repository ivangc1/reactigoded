import React from 'react';

export default {
  title: 'Layout/Contenedor',
};

export const Contenedores = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Contenedores</h2>
    <p className="ig-text-body ig-mb-6">
      Clases para limitar el ancho máximo del contenido y centrarlo horizontalmente.
    </p>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-container ig-mx-auto</code>
        <div className="ig-container ig-mx-auto ig-bg-brand ig-p-4 ig-rounded ig-text-on-brand ig-text-center">
          Contenedor responsivo (max-width varía según breakpoint)
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-max-w-sm (24rem / 384px)</code>
        <div className="ig-max-w-sm ig-mx-auto ig-bg-secondary ig-p-4 ig-rounded ig-text-on-secondary ig-text-center">
          Max width small
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-max-w-md (28rem / 448px)</code>
        <div className="ig-max-w-md ig-mx-auto ig-bg-success ig-p-4 ig-rounded ig-text-on-success ig-text-center">
          Max width medium
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-max-w-lg (32rem / 512px)</code>
        <div className="ig-max-w-lg ig-mx-auto ig-bg-warning ig-p-4 ig-rounded ig-text-on-warning ig-text-center">
          Max width large
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-max-w-xl (36rem / 576px)</code>
        <div className="ig-max-w-xl ig-mx-auto ig-bg-danger ig-p-4 ig-rounded ig-text-on-danger ig-text-center">
          Max width extra large
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-max-w-2xl (42rem / 672px)</code>
        <div className="ig-max-w-2xl ig-mx-auto ig-bg-info ig-p-4 ig-rounded ig-text-on-info ig-text-center">
          Max width 2xl
        </div>
      </div>
    </div>
  </div>
);

export const AnchosFijos = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Anchos Fijos</h2>

    <div className="ig-space-y-4">
      {[
        { clase: 'ig-w-0', desc: '0' },
        { clase: 'ig-w-8', desc: '2rem (32px)' },
        { clase: 'ig-w-16', desc: '4rem (64px)' },
        { clase: 'ig-w-24', desc: '6rem (96px)' },
        { clase: 'ig-w-32', desc: '8rem (128px)' },
        { clase: 'ig-w-48', desc: '12rem (192px)' },
        { clase: 'ig-w-64', desc: '16rem (256px)' },
        { clase: 'ig-w-96', desc: '24rem (384px)' },
      ].map(({ clase, desc }) => (
        <div key={clase} className="ig-flex ig-items-center ig-gap-4 ig-p-3 ig-bg-surface ig-rounded-lg ig-border ig-border-default">
          <code className="ig-text-xs ig-text-muted ig-w-16">{clase}</code>
          <div className={`${clase} ig-h-8 ig-bg-brand ig-rounded`} />
          <span className="ig-text-sm ig-text-muted">{desc}</span>
        </div>
      ))}
    </div>
  </div>
);

export const AnchosPorcentuales = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Anchos en Porcentaje</h2>

    <div className="ig-space-y-4">
      {[
        { clase: 'ig-w-1/2', desc: '50%' },
        { clase: 'ig-w-1/3', desc: '33.333%' },
        { clase: 'ig-w-2/3', desc: '66.666%' },
        { clase: 'ig-w-1/4', desc: '25%' },
        { clase: 'ig-w-3/4', desc: '75%' },
        { clase: 'ig-w-full', desc: '100%' },
      ].map(({ clase, desc }) => (
        <div key={clase} className="ig-p-3 ig-bg-surface ig-rounded-lg ig-border ig-border-default">
          <div className="ig-flex ig-justify-between ig-mb-2">
            <code className="ig-text-sm ig-text-muted">{clase}</code>
            <span className="ig-text-sm ig-text-muted">{desc}</span>
          </div>
          <div className="ig-bg-muted ig-rounded ig-p-2">
            <div className={`${clase} ig-h-8 ig-bg-secondary ig-rounded`} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const AnchosDePantalla = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Anchos de Pantalla</h2>

    <div className="ig-space-y-4 ig-overflow-x-auto">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-w-screen (100vw)</code>
        <div className="ig-w-screen ig-h-12 ig-bg-brand ig-rounded ig-flex ig-items-center ig-justify-center ig-text-on-brand" style={{ marginLeft: '-1rem' }}>
          Ancho completo de pantalla
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-min-w-full, ig-max-w-full</code>
        <p className="ig-text-body ig-text-sm">
          <code className="ig-bg-muted ig-px-1 ig-rounded">ig-min-w-*</code> establece el ancho mínimo.
          <br />
          <code className="ig-bg-muted ig-px-1 ig-rounded">ig-max-w-*</code> establece el ancho máximo.
        </p>
      </div>
    </div>

    <div className="ig-mt-6 ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Referencia de max-width</h3>
      <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-3 ig-gap-2 ig-text-sm">
        <code className="ig-text-muted">ig-max-w-xs: 20rem</code>
        <code className="ig-text-muted">ig-max-w-sm: 24rem</code>
        <code className="ig-text-muted">ig-max-w-md: 28rem</code>
        <code className="ig-text-muted">ig-max-w-lg: 32rem</code>
        <code className="ig-text-muted">ig-max-w-xl: 36rem</code>
        <code className="ig-text-muted">ig-max-w-2xl: 42rem</code>
        <code className="ig-text-muted">ig-max-w-3xl: 48rem</code>
        <code className="ig-text-muted">ig-max-w-4xl: 56rem</code>
        <code className="ig-text-muted">ig-max-w-5xl: 64rem</code>
        <code className="ig-text-muted">ig-max-w-6xl: 72rem</code>
        <code className="ig-text-muted">ig-max-w-7xl: 80rem</code>
        <code className="ig-text-muted">ig-max-w-full: 100%</code>
      </div>
    </div>
  </div>
);

export const Alturas = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Alturas</h2>

    <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-4 ig-gap-4">
      {[
        { clase: 'ig-h-8', desc: '2rem' },
        { clase: 'ig-h-12', desc: '3rem' },
        { clase: 'ig-h-16', desc: '4rem' },
        { clase: 'ig-h-24', desc: '6rem' },
        { clase: 'ig-h-32', desc: '8rem' },
        { clase: 'ig-h-48', desc: '12rem' },
      ].map(({ clase, desc }) => (
        <div key={clase} className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
          <code className="ig-text-xs ig-text-muted ig-block ig-mb-2">{clase}</code>
          <div className={`${clase} ig-w-full ig-bg-success ig-rounded ig-flex ig-items-center ig-justify-center`}>
            <span className="ig-text-on-success ig-text-xs">{desc}</span>
          </div>
        </div>
      ))}
    </div>

    <div className="ig-mt-6 ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-h-screen (100vh)</code>
      <div className="ig-h-32 ig-overflow-hidden ig-bg-muted ig-rounded">
        <div className="ig-h-screen ig-bg-warning ig-flex ig-items-center ig-justify-center">
          <span className="ig-text-on-warning">Altura completa de pantalla (truncada)</span>
        </div>
      </div>
    </div>
  </div>
);

export const Size = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Size (ancho y alto iguales)</h2>
    <p className="ig-text-body ig-mb-6">
      Clases <code className="ig-bg-muted ig-px-1 ig-rounded">ig-size-*</code> para establecer width y height al mismo tiempo.
    </p>

    <div className="ig-flex ig-flex-wrap ig-gap-4 ig-items-end">
      {[4, 8, 12, 16, 20, 24].map((size) => (
        <div key={size} className="ig-text-center">
          <div className={`ig-size-${size} ig-bg-brand ig-rounded ig-flex ig-items-center ig-justify-center ig-mx-auto`}>
            <span className="ig-text-on-brand ig-text-xs">{size}</span>
          </div>
          <code className="ig-text-xs ig-text-muted ig-mt-1 ig-block">ig-size-{size}</code>
        </div>
      ))}
    </div>
  </div>
);
