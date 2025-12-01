import React from 'react';

export default {
  title: 'Layout/Grid',
};

const Cell = ({ children, className = '' }) => (
  <div className={`ig-p-4 ig-bg-secondary ig-text-on-secondary ig-rounded ig-text-center ig-font-semibold ${className}`}>
    {children}
  </div>
);

export const ColumnasBasicas = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Columnas Básicas</h2>

    <div className="ig-space-y-6">
      {[1, 2, 3, 4, 5, 6].map((cols) => (
        <div key={cols} className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
          <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-grid ig-grid-cols-{cols}</code>
          <div className={`ig-grid ig-grid-cols-${cols} ig-gap-2`}>
            {Array.from({ length: cols }, (_, i) => (
              <Cell key={i}>{i + 1}</Cell>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const GridDe12Columnas = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Sistema de 12 Columnas</h2>

    <div className="ig-space-y-4">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-grid ig-grid-cols-12</code>
        <div className="ig-grid ig-grid-cols-12 ig-gap-2">
          {Array.from({ length: 12 }, (_, i) => (
            <Cell key={i} className="ig-text-xs">{i + 1}</Cell>
          ))}
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">col-span-* para ocupar varias columnas</code>
        <div className="ig-grid ig-grid-cols-12 ig-gap-2">
          <Cell className="ig-col-span-12">col-span-12 (100%)</Cell>
          <Cell className="ig-col-span-6">col-span-6 (50%)</Cell>
          <Cell className="ig-col-span-6">col-span-6 (50%)</Cell>
          <Cell className="ig-col-span-4">col-span-4</Cell>
          <Cell className="ig-col-span-4">col-span-4</Cell>
          <Cell className="ig-col-span-4">col-span-4</Cell>
          <Cell className="ig-col-span-3">col-span-3</Cell>
          <Cell className="ig-col-span-3">col-span-3</Cell>
          <Cell className="ig-col-span-3">col-span-3</Cell>
          <Cell className="ig-col-span-3">col-span-3</Cell>
          <Cell className="ig-col-span-8">col-span-8</Cell>
          <Cell className="ig-col-span-4">col-span-4</Cell>
        </div>
      </div>
    </div>
  </div>
);

export const GapEnGrid = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Gap en Grid</h2>

    <div className="ig-space-y-6">
      {[0, 2, 4, 6, 8].map((gap) => (
        <div key={gap} className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
          <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-gap-{gap}</code>
          <div className={`ig-grid ig-grid-cols-4 ig-gap-${gap}`}>
            <Cell>1</Cell>
            <Cell>2</Cell>
            <Cell>3</Cell>
            <Cell>4</Cell>
          </div>
        </div>
      ))}

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-gap-x-8 ig-gap-y-2 (diferente por eje)</code>
        <div className="ig-grid ig-grid-cols-3 ig-gap-x-8 ig-gap-y-2">
          <Cell>1</Cell>
          <Cell>2</Cell>
          <Cell>3</Cell>
          <Cell>4</Cell>
          <Cell>5</Cell>
          <Cell>6</Cell>
        </div>
      </div>
    </div>
  </div>
);

export const GridRows = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Grid Rows</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-grid-rows-3 ig-grid-flow-col</code>
        <div className="ig-grid ig-grid-rows-3 ig-grid-flow-col ig-gap-2 ig-h-48">
          <Cell>1</Cell>
          <Cell>2</Cell>
          <Cell>3</Cell>
          <Cell>4</Cell>
          <Cell>5</Cell>
          <Cell>6</Cell>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">row-span-* para ocupar varias filas</code>
        <div className="ig-grid ig-grid-cols-3 ig-grid-rows-3 ig-gap-2 ig-h-48">
          <Cell className="ig-row-span-2">row-span-2</Cell>
          <Cell>2</Cell>
          <Cell className="ig-row-span-3">row-span-3</Cell>
          <Cell>4</Cell>
          <Cell>5</Cell>
        </div>
      </div>
    </div>
  </div>
);

export const AutoFill = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Auto-fill y Auto-fit</h2>
    <p className="ig-text-body ig-mb-6">
      Usando CSS custom para grids responsivos sin media queries.
    </p>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Grid auto-fill (mínimo 150px)</h3>
        <div
          className="ig-grid ig-gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}
        >
          {Array.from({ length: 8 }, (_, i) => (
            <Cell key={i}>{i + 1}</Cell>
          ))}
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Grid auto-fit (se estiran)</h3>
        <div
          className="ig-grid ig-gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}
        >
          <Cell>1</Cell>
          <Cell>2</Cell>
          <Cell>3</Cell>
        </div>
      </div>
    </div>
  </div>
);

export const PlaceItems = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Place Items y Place Content</h2>

    <div className="ig-space-y-6">
      {[
        { clase: 'ig-place-items-start', desc: 'Inicio' },
        { clase: 'ig-place-items-center', desc: 'Centro' },
        { clase: 'ig-place-items-end', desc: 'Final' },
        { clase: 'ig-place-items-stretch', desc: 'Estirar' },
      ].map(({ clase, desc }) => (
        <div key={clase} className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
          <div className="ig-flex ig-justify-between ig-mb-2">
            <code className="ig-text-sm ig-text-muted">{clase}</code>
            <span className="ig-text-sm ig-text-muted">{desc}</span>
          </div>
          <div className={`ig-grid ig-grid-cols-3 ${clase} ig-gap-2 ig-bg-muted ig-p-2 ig-rounded ig-h-32`}>
            <Cell className="ig-w-16 ig-h-auto">1</Cell>
            <Cell className="ig-w-16 ig-h-auto">2</Cell>
            <Cell className="ig-w-16 ig-h-auto">3</Cell>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const EjemplosDashboard = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Ejemplos de Dashboard</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Layout típico de dashboard</h3>
        <div className="ig-grid ig-grid-cols-12 ig-gap-4">
          <div className="ig-col-span-12 md:ig-col-span-8">
            <Cell className="ig-h-32">Gráfico principal (8 cols)</Cell>
          </div>
          <div className="ig-col-span-12 md:ig-col-span-4">
            <Cell className="ig-h-32">Estadísticas (4 cols)</Cell>
          </div>
          <div className="ig-col-span-12 md:ig-col-span-4">
            <Cell className="ig-h-24">Card 1 (4 cols)</Cell>
          </div>
          <div className="ig-col-span-12 md:ig-col-span-4">
            <Cell className="ig-h-24">Card 2 (4 cols)</Cell>
          </div>
          <div className="ig-col-span-12 md:ig-col-span-4">
            <Cell className="ig-h-24">Card 3 (4 cols)</Cell>
          </div>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Galería de imágenes</h3>
        <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-4 ig-gap-2">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="ig-aspect-square ig-bg-muted ig-rounded-lg ig-flex ig-items-center ig-justify-center">
              <span className="ig-text-muted">Imagen {i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
