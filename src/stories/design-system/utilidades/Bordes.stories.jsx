import React from 'react';

export default {
  title: 'Utilidades/Bordes',
};

export const AnchosDeBorde = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Anchos de Borde</h2>

    <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-3 lg:ig-grid-cols-5 ig-gap-4">
      {[
        { clase: 'ig-border-0', nombre: '0' },
        { clase: 'ig-border', nombre: '1px' },
        { clase: 'ig-border-2', nombre: '2px' },
        { clase: 'ig-border-4', nombre: '4px' },
        { clase: 'ig-border-8', nombre: '8px' },
      ].map(({ clase, nombre }) => (
        <div key={clase} className="ig-text-center">
          <div className={`ig-w-20 ig-h-20 ig-bg-surface ${clase} ig-border-brand ig-rounded ig-mx-auto ig-mb-2`}></div>
          <code className="ig-text-sm ig-text-muted">{clase}</code>
          <span className="ig-text-xs ig-text-muted ig-block">({nombre})</span>
        </div>
      ))}
    </div>
  </div>
);

export const BordesPorLado = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Bordes por Lado</h2>

    <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-4 ig-gap-4">
      <div className="ig-text-center">
        <div className="ig-w-20 ig-h-20 ig-bg-surface ig-border-t-4 ig-border-brand ig-rounded ig-mx-auto ig-mb-2"></div>
        <code className="ig-text-sm ig-text-muted">ig-border-t-4</code>
      </div>
      <div className="ig-text-center">
        <div className="ig-w-20 ig-h-20 ig-bg-surface ig-border-r-4 ig-border-brand ig-rounded ig-mx-auto ig-mb-2"></div>
        <code className="ig-text-sm ig-text-muted">ig-border-r-4</code>
      </div>
      <div className="ig-text-center">
        <div className="ig-w-20 ig-h-20 ig-bg-surface ig-border-b-4 ig-border-brand ig-rounded ig-mx-auto ig-mb-2"></div>
        <code className="ig-text-sm ig-text-muted">ig-border-b-4</code>
      </div>
      <div className="ig-text-center">
        <div className="ig-w-20 ig-h-20 ig-bg-surface ig-border-l-4 ig-border-brand ig-rounded ig-mx-auto ig-mb-2"></div>
        <code className="ig-text-sm ig-text-muted">ig-border-l-4</code>
      </div>
      <div className="ig-text-center">
        <div className="ig-w-20 ig-h-20 ig-bg-surface ig-border-x-4 ig-border-brand ig-rounded ig-mx-auto ig-mb-2"></div>
        <code className="ig-text-sm ig-text-muted">ig-border-x-4</code>
      </div>
      <div className="ig-text-center">
        <div className="ig-w-20 ig-h-20 ig-bg-surface ig-border-y-4 ig-border-brand ig-rounded ig-mx-auto ig-mb-2"></div>
        <code className="ig-text-sm ig-text-muted">ig-border-y-4</code>
      </div>
    </div>
  </div>
);

export const ColoresDeBorde = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Colores de Borde</h2>

    <div className="ig-space-y-6">
      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Semánticos</h3>
        <div className="ig-grid ig-grid-cols-3 ig-gap-4">
          <div className="ig-text-center">
            <div className="ig-h-16 ig-bg-surface ig-border-2 ig-border-subtle ig-rounded ig-mb-2"></div>
            <code className="ig-text-sm ig-text-muted">ig-border-subtle</code>
          </div>
          <div className="ig-text-center">
            <div className="ig-h-16 ig-bg-surface ig-border-2 ig-border-default ig-rounded ig-mb-2"></div>
            <code className="ig-text-sm ig-text-muted">ig-border-default</code>
          </div>
          <div className="ig-text-center">
            <div className="ig-h-16 ig-bg-surface ig-border-2 ig-border-strong ig-rounded ig-mb-2"></div>
            <code className="ig-text-sm ig-text-muted">ig-border-strong</code>
          </div>
        </div>
      </div>

      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Por Color</h3>
        <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-3 lg:ig-grid-cols-6 ig-gap-4">
          {[
            { clase: 'ig-border-brand', nombre: 'brand' },
            { clase: 'ig-border-secondary', nombre: 'secondary' },
            { clase: 'ig-border-success', nombre: 'success' },
            { clase: 'ig-border-warning', nombre: 'warning' },
            { clase: 'ig-border-danger', nombre: 'danger' },
            { clase: 'ig-border-info', nombre: 'info' },
          ].map(({ clase, nombre }) => (
            <div key={clase} className="ig-text-center">
              <div className={`ig-h-16 ig-bg-surface ig-border-2 ${clase} ig-rounded ig-mb-2`}></div>
              <code className="ig-text-xs ig-text-muted">{clase}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const EstilosDeBorde = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Estilos de Borde</h2>

    <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-4 ig-gap-4">
      {[
        { clase: 'ig-border-solid', nombre: 'solid' },
        { clase: 'ig-border-dashed', nombre: 'dashed' },
        { clase: 'ig-border-dotted', nombre: 'dotted' },
        { clase: 'ig-border-double', nombre: 'double' },
      ].map(({ clase, nombre }) => (
        <div key={clase} className="ig-text-center">
          <div className={`ig-h-20 ig-bg-surface ig-border-4 ig-border-brand ${clase} ig-rounded ig-mb-2`}></div>
          <code className="ig-text-sm ig-text-muted">{clase}</code>
        </div>
      ))}
    </div>
  </div>
);

export const BorderRadius = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Border Radius</h2>

    <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-4 lg:ig-grid-cols-7 ig-gap-4">
      {[
        { clase: 'ig-rounded-none', nombre: 'none' },
        { clase: 'ig-rounded-sm', nombre: 'sm' },
        { clase: 'ig-rounded', nombre: 'default' },
        { clase: 'ig-rounded-md', nombre: 'md' },
        { clase: 'ig-rounded-lg', nombre: 'lg' },
        { clase: 'ig-rounded-xl', nombre: 'xl' },
        { clase: 'ig-rounded-full', nombre: 'full' },
      ].map(({ clase, nombre }) => (
        <div key={clase} className="ig-text-center">
          <div className={`ig-w-20 ig-h-20 ig-bg-brand ${clase} ig-mx-auto ig-mb-2`}></div>
          <code className="ig-text-xs ig-text-muted">{clase}</code>
        </div>
      ))}
    </div>
  </div>
);

export const RadiusPorEsquina = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Radius por Esquina</h2>

    <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-4 ig-gap-4">
      <div className="ig-text-center">
        <div className="ig-w-20 ig-h-20 ig-bg-brand ig-rounded-tl-xl ig-mx-auto ig-mb-2"></div>
        <code className="ig-text-xs ig-text-muted">ig-rounded-tl-xl</code>
      </div>
      <div className="ig-text-center">
        <div className="ig-w-20 ig-h-20 ig-bg-brand ig-rounded-tr-xl ig-mx-auto ig-mb-2"></div>
        <code className="ig-text-xs ig-text-muted">ig-rounded-tr-xl</code>
      </div>
      <div className="ig-text-center">
        <div className="ig-w-20 ig-h-20 ig-bg-brand ig-rounded-br-xl ig-mx-auto ig-mb-2"></div>
        <code className="ig-text-xs ig-text-muted">ig-rounded-br-xl</code>
      </div>
      <div className="ig-text-center">
        <div className="ig-w-20 ig-h-20 ig-bg-brand ig-rounded-bl-xl ig-mx-auto ig-mb-2"></div>
        <code className="ig-text-xs ig-text-muted">ig-rounded-bl-xl</code>
      </div>
      <div className="ig-text-center">
        <div className="ig-w-20 ig-h-20 ig-bg-secondary ig-rounded-t-xl ig-mx-auto ig-mb-2"></div>
        <code className="ig-text-xs ig-text-muted">ig-rounded-t-xl</code>
      </div>
      <div className="ig-text-center">
        <div className="ig-w-20 ig-h-20 ig-bg-secondary ig-rounded-b-xl ig-mx-auto ig-mb-2"></div>
        <code className="ig-text-xs ig-text-muted">ig-rounded-b-xl</code>
      </div>
      <div className="ig-text-center">
        <div className="ig-w-20 ig-h-20 ig-bg-secondary ig-rounded-l-xl ig-mx-auto ig-mb-2"></div>
        <code className="ig-text-xs ig-text-muted">ig-rounded-l-xl</code>
      </div>
      <div className="ig-text-center">
        <div className="ig-w-20 ig-h-20 ig-bg-secondary ig-rounded-r-xl ig-mx-auto ig-mb-2"></div>
        <code className="ig-text-xs ig-text-muted">ig-rounded-r-xl</code>
      </div>
    </div>
  </div>
);

export const Dividers = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Dividers</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-rounded-lg ig-border ig-border-default">
        <div className="ig-p-4">Elemento 1</div>
        <div className="ig-border-t ig-border-subtle"></div>
        <div className="ig-p-4">Elemento 2</div>
        <div className="ig-border-t ig-border-subtle"></div>
        <div className="ig-p-4">Elemento 3</div>
      </div>

      <div className="ig-bg-surface ig-rounded-lg ig-border ig-border-default ig-divide-y ig-divide-subtle">
        <div className="ig-p-4">Con ig-divide-y</div>
        <div className="ig-p-4">Automático</div>
        <div className="ig-p-4">Entre hijos</div>
      </div>

      <div className="ig-flex ig-bg-surface ig-rounded-lg ig-border ig-border-default ig-divide-x ig-divide-subtle">
        <div className="ig-p-4 ig-flex-1 ig-text-center">Col 1</div>
        <div className="ig-p-4 ig-flex-1 ig-text-center">Col 2</div>
        <div className="ig-p-4 ig-flex-1 ig-text-center">Col 3</div>
      </div>
    </div>
  </div>
);

export const Ring = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Ring (Focus Ring)</h2>

    <div className="ig-space-y-6">
      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Anchos de Ring</h3>
        <div className="ig-flex ig-flex-wrap ig-gap-4">
          {[
            { clase: 'ig-ring-0', nombre: '0' },
            { clase: 'ig-ring-1', nombre: '1' },
            { clase: 'ig-ring-2', nombre: '2' },
            { clase: 'ig-ring', nombre: 'default' },
            { clase: 'ig-ring-4', nombre: '4' },
          ].map(({ clase, nombre }) => (
            <div key={clase} className="ig-text-center">
              <div className={`ig-w-16 ig-h-16 ig-bg-surface ${clase} ig-ring-brand ig-rounded ig-mb-2`}></div>
              <code className="ig-text-xs ig-text-muted">{clase}</code>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Colores de Ring</h3>
        <div className="ig-flex ig-flex-wrap ig-gap-4">
          {[
            { clase: 'ig-ring-brand', nombre: 'brand' },
            { clase: 'ig-ring-secondary', nombre: 'secondary' },
            { clase: 'ig-ring-success', nombre: 'success' },
            { clase: 'ig-ring-warning', nombre: 'warning' },
            { clase: 'ig-ring-danger', nombre: 'danger' },
            { clase: 'ig-ring-info', nombre: 'info' },
          ].map(({ clase, nombre }) => (
            <div key={clase} className="ig-text-center">
              <div className={`ig-w-16 ig-h-16 ig-bg-surface ig-ring-2 ${clase} ig-rounded ig-mb-2`}></div>
              <code className="ig-text-xs ig-text-muted">{clase}</code>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Ring Inset</h3>
        <div className="ig-flex ig-gap-4">
          <div className="ig-text-center">
            <div className="ig-w-16 ig-h-16 ig-bg-surface ig-ring-2 ig-ring-brand ig-rounded ig-mb-2"></div>
            <code className="ig-text-xs ig-text-muted">Normal</code>
          </div>
          <div className="ig-text-center">
            <div className="ig-w-16 ig-h-16 ig-bg-surface ig-ring-2 ig-ring-inset ig-ring-brand ig-rounded ig-mb-2"></div>
            <code className="ig-text-xs ig-text-muted">ig-ring-inset</code>
          </div>
        </div>
      </div>
    </div>
  </div>
);
