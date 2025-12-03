import React from 'react';

export default {
  title: 'Utilidades/Bordes',
};

export const AnchosDeBorde = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Anchos de Borde</h2>

    <div className="ig-bg-neutral-400 ig-p-8 ig-rounded-xl">
      <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-3 lg:ig-grid-cols-5 ig-gap-6">
        {[
          { clase: 'ig-border-0', nombre: '0' },
          { clase: 'ig-border', nombre: '1px' },
          { clase: 'ig-border-2', nombre: '2px' },
          { clase: 'ig-border-4', nombre: '4px' },
          { clase: 'ig-border-8', nombre: '8px' },
        ].map(({ clase, nombre }) => (
          <div key={clase} className="ig-text-center">
            <div className={`ig-w-28 ig-h-28 ig-bg-neutral-100 ig-border-4 ig-border-brand ig-rounded-lg ig-mx-auto ig-mb-3 ig-flex ig-items-center ig-justify-center`}>
              <span className="ig-text-neutral-900 ig-font-bold ig-text-lg">{nombre}</span>
            </div>
            <code className="ig-text-sm ig-font-mono ig-bg-neutral-900 ig-text-neutral-100 ig-px-2 ig-py-1 ig-rounded">{clase}</code>
          </div>
        ))}
      </div>
    </div>
    <p className="ig-text-sm ig-text-muted ig-mt-4 ig-italic">
      * Demos muestran borde de 4px para visibilidad. La clase real aplica el grosor indicado.
    </p>
  </div>
);

export const BordesPorLado = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Bordes por Lado</h2>

    <div className="ig-bg-neutral-400 ig-p-8 ig-rounded-xl">
      <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-3 lg:ig-grid-cols-6 ig-gap-6">
        {[
          { clase: 'ig-border-t-4', label: 'Top' },
          { clase: 'ig-border-r-4', label: 'Right' },
          { clase: 'ig-border-b-4', label: 'Bottom' },
          { clase: 'ig-border-l-4', label: 'Left' },
          { clase: 'ig-border-x-4', label: 'X (L+R)' },
          { clase: 'ig-border-y-4', label: 'Y (T+B)' },
        ].map(({ clase, label }) => (
          <div key={clase} className="ig-text-center">
            <div className={`ig-w-28 ig-h-28 ig-bg-neutral-100 ${clase} ig-border-brand ig-rounded-lg ig-mx-auto ig-mb-3 ig-flex ig-items-center ig-justify-center`}>
              <span className="ig-text-neutral-900 ig-font-bold ig-text-lg">{label}</span>
            </div>
            <code className="ig-text-sm ig-font-mono ig-bg-neutral-900 ig-text-neutral-100 ig-px-2 ig-py-1 ig-rounded">{clase}</code>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const ColoresDeBorde = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Colores de Borde</h2>

    <div className="ig-space-y-8">
      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Semánticos</h3>
        <div className="ig-bg-neutral-400 ig-p-8 ig-rounded-xl">
          <div className="ig-grid ig-grid-cols-3 ig-gap-6">
            {[
              { clase: 'ig-border-subtle', nombre: 'Subtle' },
              { clase: 'ig-border-default', nombre: 'Default' },
              { clase: 'ig-border-strong', nombre: 'Strong' },
            ].map(({ clase, nombre }) => (
              <div key={clase} className="ig-text-center">
                <div className={`ig-h-24 ig-bg-neutral-100 ig-border-4 ${clase} ig-rounded-lg ig-mb-3 ig-flex ig-items-center ig-justify-center`}>
                  <span className="ig-text-neutral-900 ig-font-bold">{nombre}</span>
                </div>
                <code className="ig-text-sm ig-font-mono ig-bg-neutral-900 ig-text-neutral-100 ig-px-2 ig-py-1 ig-rounded">{clase}</code>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Por Color</h3>
        <div className="ig-bg-neutral-400 ig-p-8 ig-rounded-xl">
          <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-3 lg:ig-grid-cols-6 ig-gap-6">
            {[
              { clase: 'ig-border-brand', nombre: 'Brand' },
              { clase: 'ig-border-secondary', nombre: 'Secondary' },
              { clase: 'ig-border-success', nombre: 'Success' },
              { clase: 'ig-border-warning', nombre: 'Warning' },
              { clase: 'ig-border-danger', nombre: 'Danger' },
              { clase: 'ig-border-info', nombre: 'Info' },
            ].map(({ clase, nombre }) => (
              <div key={clase} className="ig-text-center">
                <div className={`ig-h-24 ig-bg-neutral-100 ig-border-4 ${clase} ig-rounded-lg ig-mb-3 ig-flex ig-items-center ig-justify-center`}>
                  <span className="ig-text-neutral-900 ig-font-bold">{nombre}</span>
                </div>
                <code className="ig-text-xs ig-font-mono ig-bg-neutral-900 ig-text-neutral-100 ig-px-2 ig-py-1 ig-rounded">{clase}</code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const EstilosDeBorde = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Estilos de Borde</h2>

    <div className="ig-bg-neutral-400 ig-p-8 ig-rounded-xl">
      <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-4 ig-gap-6">
        {[
          { clase: 'ig-border-solid', nombre: 'Solid' },
          { clase: 'ig-border-dashed', nombre: 'Dashed' },
          { clase: 'ig-border-dotted', nombre: 'Dotted' },
          { clase: 'ig-border-double', nombre: 'Double' },
        ].map(({ clase, nombre }) => (
          <div key={clase} className="ig-text-center">
            <div className={`ig-h-28 ig-bg-neutral-100 ig-border-4 ig-border-brand ${clase} ig-rounded-lg ig-mb-3 ig-flex ig-items-center ig-justify-center`}>
              <span className="ig-text-neutral-900 ig-font-bold ig-text-lg">{nombre}</span>
            </div>
            <code className="ig-text-sm ig-font-mono ig-bg-neutral-900 ig-text-neutral-100 ig-px-2 ig-py-1 ig-rounded">{clase}</code>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const BorderRadius = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Border Radius</h2>

    <div className="ig-bg-neutral-400 ig-p-8 ig-rounded-xl">
      <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-4 lg:ig-grid-cols-7 ig-gap-6">
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
            <div className={`ig-w-24 ig-h-24 ig-bg-brand ig-flex ig-items-center ig-justify-center ig-text-neutral-100 ig-font-bold ${clase} ig-mx-auto ig-mb-3`}>
              {nombre}
            </div>
            <code className="ig-text-xs ig-font-mono ig-bg-neutral-900 ig-text-neutral-100 ig-px-2 ig-py-1 ig-rounded">{clase}</code>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const RadiusPorEsquina = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Radius por Esquina</h2>

    <div className="ig-bg-neutral-400 ig-p-8 ig-rounded-xl">
      <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-4 ig-gap-6">
        {[
          { clase: 'ig-rounded-tl-xl', label: 'TL', bg: 'ig-bg-brand' },
          { clase: 'ig-rounded-tr-xl', label: 'TR', bg: 'ig-bg-brand' },
          { clase: 'ig-rounded-br-xl', label: 'BR', bg: 'ig-bg-brand' },
          { clase: 'ig-rounded-bl-xl', label: 'BL', bg: 'ig-bg-brand' },
          { clase: 'ig-rounded-t-xl', label: 'Top', bg: 'ig-bg-secondary' },
          { clase: 'ig-rounded-b-xl', label: 'Bottom', bg: 'ig-bg-secondary' },
          { clase: 'ig-rounded-l-xl', label: 'Left', bg: 'ig-bg-secondary' },
          { clase: 'ig-rounded-r-xl', label: 'Right', bg: 'ig-bg-secondary' },
        ].map(({ clase, label, bg }) => (
          <div key={clase} className="ig-text-center">
            <div className={`ig-w-24 ig-h-24 ${bg} ig-flex ig-items-center ig-justify-center ig-text-neutral-100 ig-font-bold ${clase} ig-mx-auto ig-mb-3`}>
              {label}
            </div>
            <code className="ig-text-xs ig-font-mono ig-bg-neutral-900 ig-text-neutral-100 ig-px-2 ig-py-1 ig-rounded">{clase}</code>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const Dividers = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Dividers</h2>

    <div className="ig-bg-neutral-400 ig-p-8 ig-rounded-xl">
      <div className="ig-space-y-8">
        <div>
          <p className="ig-text-sm ig-font-bold ig-text-neutral-900 ig-mb-3">Divisor manual con border-t:</p>
          <div className="ig-bg-neutral-100 ig-rounded-lg ig-border-2 ig-border-brand">
            <div className="ig-p-4 ig-text-neutral-900 ig-font-medium">Elemento 1</div>
            <div className="ig-border-t-2 ig-border-brand"></div>
            <div className="ig-p-4 ig-text-neutral-900 ig-font-medium">Elemento 2</div>
            <div className="ig-border-t-2 ig-border-brand"></div>
            <div className="ig-p-4 ig-text-neutral-900 ig-font-medium">Elemento 3</div>
          </div>
        </div>

        <div>
          <p className="ig-text-sm ig-font-bold ig-text-neutral-900 ig-mb-3">Con ig-divide-y (automático):</p>
          <div className="ig-bg-neutral-100 ig-rounded-lg ig-border-2 ig-border-secondary ig-divide-y-2 ig-divide-secondary">
            <div className="ig-p-4 ig-text-neutral-900 ig-font-medium">Con ig-divide-y</div>
            <div className="ig-p-4 ig-text-neutral-900 ig-font-medium">Automático</div>
            <div className="ig-p-4 ig-text-neutral-900 ig-font-medium">Entre hijos</div>
          </div>
        </div>

        <div>
          <p className="ig-text-sm ig-font-bold ig-text-neutral-900 ig-mb-3">Con ig-divide-x (horizontal):</p>
          <div className="ig-flex ig-bg-neutral-100 ig-rounded-lg ig-border-2 ig-border-success ig-divide-x-2 ig-divide-success">
            <div className="ig-p-4 ig-flex-1 ig-text-center ig-text-neutral-900 ig-font-medium">Col 1</div>
            <div className="ig-p-4 ig-flex-1 ig-text-center ig-text-neutral-900 ig-font-medium">Col 2</div>
            <div className="ig-p-4 ig-flex-1 ig-text-center ig-text-neutral-900 ig-font-medium">Col 3</div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const Ring = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Ring (Focus Ring)</h2>

    <div className="ig-space-y-8">
      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Anchos de Ring</h3>
        <div className="ig-bg-neutral-400 ig-p-8 ig-rounded-xl">
          <div className="ig-flex ig-flex-wrap ig-gap-6">
            {[
              { clase: 'ig-ring-0', nombre: '0' },
              { clase: 'ig-ring-1', nombre: '1' },
              { clase: 'ig-ring-2', nombre: '2' },
              { clase: 'ig-ring', nombre: 'default' },
              { clase: 'ig-ring-4', nombre: '4' },
            ].map(({ clase, nombre }) => (
              <div key={clase} className="ig-text-center">
                <div className={`ig-w-24 ig-h-24 ig-bg-neutral-100 ${clase} ig-ring-brand ig-rounded-lg ig-mb-3 ig-flex ig-items-center ig-justify-center`}>
                  <span className="ig-text-neutral-900 ig-font-bold ig-text-lg">{nombre}</span>
                </div>
                <code className="ig-text-xs ig-font-mono ig-bg-neutral-900 ig-text-neutral-100 ig-px-2 ig-py-1 ig-rounded">{clase}</code>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Colores de Ring</h3>
        <div className="ig-bg-neutral-400 ig-p-8 ig-rounded-xl">
          <div className="ig-flex ig-flex-wrap ig-gap-6">
            {[
              { clase: 'ig-ring-brand', nombre: 'Brand' },
              { clase: 'ig-ring-secondary', nombre: 'Secondary' },
              { clase: 'ig-ring-success', nombre: 'Success' },
              { clase: 'ig-ring-warning', nombre: 'Warning' },
              { clase: 'ig-ring-danger', nombre: 'Danger' },
              { clase: 'ig-ring-info', nombre: 'Info' },
            ].map(({ clase, nombre }) => (
              <div key={clase} className="ig-text-center">
                <div className={`ig-w-24 ig-h-24 ig-bg-neutral-100 ig-ring-4 ${clase} ig-rounded-lg ig-mb-3 ig-flex ig-items-center ig-justify-center`}>
                  <span className="ig-text-neutral-900 ig-font-bold">{nombre}</span>
                </div>
                <code className="ig-text-xs ig-font-mono ig-bg-neutral-900 ig-text-neutral-100 ig-px-2 ig-py-1 ig-rounded">{clase}</code>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Ring Inset</h3>
        <div className="ig-bg-neutral-400 ig-p-8 ig-rounded-xl">
          <div className="ig-flex ig-gap-8">
            <div className="ig-text-center">
              <div className="ig-w-28 ig-h-28 ig-bg-neutral-100 ig-ring-4 ig-ring-brand ig-rounded-lg ig-mb-3 ig-flex ig-items-center ig-justify-center">
                <span className="ig-text-neutral-900 ig-font-bold">Normal</span>
              </div>
              <code className="ig-text-xs ig-font-mono ig-bg-neutral-900 ig-text-neutral-100 ig-px-2 ig-py-1 ig-rounded">ig-ring-4</code>
            </div>
            <div className="ig-text-center">
              <div className="ig-w-28 ig-h-28 ig-bg-neutral-100 ig-ring-4 ig-ring-inset ig-ring-brand ig-rounded-lg ig-mb-3 ig-flex ig-items-center ig-justify-center">
                <span className="ig-text-neutral-900 ig-font-bold">Inset</span>
              </div>
              <code className="ig-text-xs ig-font-mono ig-bg-neutral-900 ig-text-neutral-100 ig-px-2 ig-py-1 ig-rounded">ig-ring-inset</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
