import React from 'react';

export default {
  title: 'Utilidades/Bordes',
};

// Componente contenedor con patrón checkerboard para mejor visibilidad de bordes
const DemoContainer = ({ children, className = '' }) => (
  <div
    className={`ig-p-6 ig-rounded-lg ${className}`}
    style={{
      background: `
        repeating-conic-gradient(
          var(--ig-neutral-300, #d1d5db) 0% 25%,
          var(--ig-neutral-100, #f3f4f6) 0% 50%
        ) 50% / 16px 16px`
    }}
  >
    {children}
  </div>
);

// Caja de demo con fondo que contrasta en ambos temas
const DemoBox = ({ children, className = '', showContent = true }) => (
  <div
    className={`ig-flex ig-items-center ig-justify-center ig-text-sm ig-font-medium ${className}`}
    style={{
      backgroundColor: 'var(--ig-bg-elevated)',
      color: 'var(--ig-text-body)'
    }}
  >
    {showContent && (children || 'Contenido')}
  </div>
);

export const AnchosDeBorde = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Anchos de Borde</h2>

    <DemoContainer>
      <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-3 lg:ig-grid-cols-5 ig-gap-6">
        {[
          { clase: 'ig-border-0', nombre: '0', display: 'ig-border-4' },
          { clase: 'ig-border', nombre: '1px', display: 'ig-border-4' },
          { clase: 'ig-border-2', nombre: '2px', display: 'ig-border-4' },
          { clase: 'ig-border-4', nombre: '4px', display: 'ig-border-4' },
          { clase: 'ig-border-8', nombre: '8px', display: 'ig-border-8' },
        ].map(({ clase, nombre, display }) => (
          <div key={clase} className="ig-text-center">
            <DemoBox className={`ig-w-28 ig-h-28 ${display} ig-border-brand ig-rounded ig-mx-auto ig-mb-3`}>
              {nombre}
            </DemoBox>
            <code className="ig-text-sm ig-font-mono ig-bg-neutral-800 ig-text-neutral-100 ig-px-2 ig-py-1 ig-rounded">{clase}</code>
          </div>
        ))}
      </div>
    </DemoContainer>
    <p className="ig-text-sm ig-text-muted ig-mt-4 ig-italic">
      * Demos muestran borde de 4px para visibilidad. La clase real aplica el grosor indicado.
    </p>
  </div>
);

export const BordesPorLado = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Bordes por Lado</h2>

    <DemoContainer>
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
            <DemoBox className={`ig-w-28 ig-h-28 ${clase} ig-border-brand ig-rounded ig-mx-auto ig-mb-3`}>
              {label}
            </DemoBox>
            <code className="ig-text-sm ig-font-mono ig-bg-neutral-800 ig-text-neutral-100 ig-px-2 ig-py-1 ig-rounded">{clase}</code>
          </div>
        ))}
      </div>
    </DemoContainer>
  </div>
);

export const ColoresDeBorde = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Colores de Borde</h2>

    <div className="ig-space-y-8">
      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Semánticos</h3>
        <DemoContainer>
          <div className="ig-grid ig-grid-cols-3 ig-gap-6">
            {[
              { clase: 'ig-border-subtle', nombre: 'Subtle' },
              { clase: 'ig-border-default', nombre: 'Default' },
              { clase: 'ig-border-strong', nombre: 'Strong' },
            ].map(({ clase, nombre }) => (
              <div key={clase} className="ig-text-center">
                <DemoBox className={`ig-w-full ig-h-24 ig-border-4 ${clase} ig-rounded ig-mb-3`}>
                  {nombre}
                </DemoBox>
                <code className="ig-text-sm ig-font-mono ig-bg-neutral-800 ig-text-neutral-100 ig-px-2 ig-py-1 ig-rounded">{clase}</code>
              </div>
            ))}
          </div>
        </DemoContainer>
      </div>

      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Por Color</h3>
        <DemoContainer>
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
                <DemoBox className={`ig-w-full ig-h-24 ig-border-4 ${clase} ig-rounded ig-mb-3`}>
                  {nombre}
                </DemoBox>
                <code className="ig-text-xs ig-font-mono ig-bg-neutral-800 ig-text-neutral-100 ig-px-2 ig-py-1 ig-rounded">{clase}</code>
              </div>
            ))}
          </div>
        </DemoContainer>
      </div>
    </div>
  </div>
);

export const EstilosDeBorde = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Estilos de Borde</h2>

    <DemoContainer>
      <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-4 ig-gap-6">
        {[
          { clase: 'ig-border-solid', nombre: 'Solid' },
          { clase: 'ig-border-dashed', nombre: 'Dashed' },
          { clase: 'ig-border-dotted', nombre: 'Dotted' },
          { clase: 'ig-border-double', nombre: 'Double' },
        ].map(({ clase, nombre }) => (
          <div key={clase} className="ig-text-center">
            <DemoBox className={`ig-w-full ig-h-28 ig-border-4 ig-border-brand ${clase} ig-rounded ig-mb-3`}>
              {nombre}
            </DemoBox>
            <code className="ig-text-sm ig-font-mono ig-bg-neutral-800 ig-text-neutral-100 ig-px-2 ig-py-1 ig-rounded">{clase}</code>
          </div>
        ))}
      </div>
    </DemoContainer>
  </div>
);

export const BorderRadius = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Border Radius</h2>

    <DemoContainer>
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
            <div className={`ig-w-24 ig-h-24 ig-bg-brand ig-flex ig-items-center ig-justify-center ig-text-white ig-text-sm ig-font-medium ${clase} ig-mx-auto ig-mb-3`}>
              {nombre}
            </div>
            <code className="ig-text-xs ig-font-mono ig-bg-neutral-800 ig-text-neutral-100 ig-px-2 ig-py-1 ig-rounded">{clase}</code>
          </div>
        ))}
      </div>
    </DemoContainer>
  </div>
);

export const RadiusPorEsquina = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Radius por Esquina</h2>

    <DemoContainer>
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
            <div className={`ig-w-24 ig-h-24 ${bg} ig-flex ig-items-center ig-justify-center ig-text-white ig-text-sm ig-font-medium ${clase} ig-mx-auto ig-mb-3`}>
              {label}
            </div>
            <code className="ig-text-xs ig-font-mono ig-bg-neutral-800 ig-text-neutral-100 ig-px-2 ig-py-1 ig-rounded">{clase}</code>
          </div>
        ))}
      </div>
    </DemoContainer>
  </div>
);

export const Dividers = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Dividers</h2>

    <DemoContainer>
      <div className="ig-space-y-8">
        <div>
          <p className="ig-text-sm ig-font-medium ig-mb-3" style={{ color: 'var(--ig-text-heading)' }}>Divisor manual con border-t:</p>
          <div className="ig-bg-surface ig-rounded-lg ig-border-2 ig-border-brand">
            <div className="ig-p-4 ig-text-body">Elemento 1</div>
            <div className="ig-border-t-2 ig-border-brand"></div>
            <div className="ig-p-4 ig-text-body">Elemento 2</div>
            <div className="ig-border-t-2 ig-border-brand"></div>
            <div className="ig-p-4 ig-text-body">Elemento 3</div>
          </div>
        </div>

        <div>
          <p className="ig-text-sm ig-font-medium ig-mb-3" style={{ color: 'var(--ig-text-heading)' }}>Con ig-divide-y (automático):</p>
          <div className="ig-bg-surface ig-rounded-lg ig-border-2 ig-border-secondary ig-divide-y-2 ig-divide-secondary">
            <div className="ig-p-4 ig-text-body">Con ig-divide-y</div>
            <div className="ig-p-4 ig-text-body">Automático</div>
            <div className="ig-p-4 ig-text-body">Entre hijos</div>
          </div>
        </div>

        <div>
          <p className="ig-text-sm ig-font-medium ig-mb-3" style={{ color: 'var(--ig-text-heading)' }}>Con ig-divide-x (horizontal):</p>
          <div className="ig-flex ig-bg-surface ig-rounded-lg ig-border-2 ig-border-success ig-divide-x-2 ig-divide-success">
            <div className="ig-p-4 ig-flex-1 ig-text-center ig-text-body">Col 1</div>
            <div className="ig-p-4 ig-flex-1 ig-text-center ig-text-body">Col 2</div>
            <div className="ig-p-4 ig-flex-1 ig-text-center ig-text-body">Col 3</div>
          </div>
        </div>
      </div>
    </DemoContainer>
  </div>
);

export const Ring = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Ring (Focus Ring)</h2>

    <div className="ig-space-y-8">
      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Anchos de Ring</h3>
        <DemoContainer>
          <div className="ig-flex ig-flex-wrap ig-gap-6">
            {[
              { clase: 'ig-ring-0', nombre: '0' },
              { clase: 'ig-ring-1', nombre: '1' },
              { clase: 'ig-ring-2', nombre: '2' },
              { clase: 'ig-ring', nombre: 'default' },
              { clase: 'ig-ring-4', nombre: '4' },
            ].map(({ clase, nombre }) => (
              <div key={clase} className="ig-text-center">
                <DemoBox className={`ig-w-24 ig-h-24 ${clase} ig-ring-brand ig-rounded ig-mb-3`}>
                  {nombre}
                </DemoBox>
                <code className="ig-text-xs ig-font-mono ig-bg-neutral-800 ig-text-neutral-100 ig-px-2 ig-py-1 ig-rounded">{clase}</code>
              </div>
            ))}
          </div>
        </DemoContainer>
      </div>

      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Colores de Ring</h3>
        <DemoContainer>
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
                <DemoBox className={`ig-w-24 ig-h-24 ig-ring-4 ${clase} ig-rounded ig-mb-3`}>
                  {nombre}
                </DemoBox>
                <code className="ig-text-xs ig-font-mono ig-bg-neutral-800 ig-text-neutral-100 ig-px-2 ig-py-1 ig-rounded">{clase}</code>
              </div>
            ))}
          </div>
        </DemoContainer>
      </div>

      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Ring Inset</h3>
        <DemoContainer>
          <div className="ig-flex ig-gap-8">
            <div className="ig-text-center">
              <DemoBox className="ig-w-28 ig-h-28 ig-ring-4 ig-ring-brand ig-rounded ig-mb-3">
                Normal
              </DemoBox>
              <code className="ig-text-xs ig-font-mono ig-bg-neutral-800 ig-text-neutral-100 ig-px-2 ig-py-1 ig-rounded">ig-ring-4</code>
            </div>
            <div className="ig-text-center">
              <DemoBox className="ig-w-28 ig-h-28 ig-ring-4 ig-ring-inset ig-ring-brand ig-rounded ig-mb-3">
                Inset
              </DemoBox>
              <code className="ig-text-xs ig-font-mono ig-bg-neutral-800 ig-text-neutral-100 ig-px-2 ig-py-1 ig-rounded">ig-ring-inset</code>
            </div>
          </div>
        </DemoContainer>
      </div>
    </div>
  </div>
);
