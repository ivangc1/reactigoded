import React from 'react';

export default {
  title: 'Layout/Flexbox',
};

const Box = ({ children, className = '' }) => (
  <div className={`ig-p-4 ig-bg-brand ig-text-on-brand ig-rounded ig-text-center ig-font-semibold ${className}`}>
    {children}
  </div>
);

export const DireccionFlex = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Dirección Flex</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-flex ig-flex-row (default)</code>
        <div className="ig-flex ig-flex-row ig-gap-2">
          <Box>1</Box>
          <Box>2</Box>
          <Box>3</Box>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-flex ig-flex-row-reverse</code>
        <div className="ig-flex ig-flex-row-reverse ig-gap-2">
          <Box>1</Box>
          <Box>2</Box>
          <Box>3</Box>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-flex ig-flex-col</code>
        <div className="ig-flex ig-flex-col ig-gap-2 ig-w-48">
          <Box>1</Box>
          <Box>2</Box>
          <Box>3</Box>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-flex ig-flex-col-reverse</code>
        <div className="ig-flex ig-flex-col-reverse ig-gap-2 ig-w-48">
          <Box>1</Box>
          <Box>2</Box>
          <Box>3</Box>
        </div>
      </div>
    </div>
  </div>
);

export const JustifyContent = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Justify Content (eje principal)</h2>

    <div className="ig-space-y-4">
      {[
        { clase: 'ig-justify-start', desc: 'Inicio' },
        { clase: 'ig-justify-center', desc: 'Centro' },
        { clase: 'ig-justify-end', desc: 'Final' },
        { clase: 'ig-justify-between', desc: 'Espacio entre' },
        { clase: 'ig-justify-around', desc: 'Espacio alrededor' },
        { clase: 'ig-justify-evenly', desc: 'Espacio uniforme' },
      ].map(({ clase, desc }) => (
        <div key={clase} className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
          <div className="ig-flex ig-justify-between ig-mb-2">
            <code className="ig-text-sm ig-text-muted">{clase}</code>
            <span className="ig-text-sm ig-text-muted">{desc}</span>
          </div>
          <div className={`ig-flex ${clase} ig-gap-2 ig-bg-muted ig-p-2 ig-rounded`}>
            <Box className="ig-w-16">1</Box>
            <Box className="ig-w-16">2</Box>
            <Box className="ig-w-16">3</Box>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const AlignItems = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Align Items (eje cruzado)</h2>

    <div className="ig-space-y-4">
      {[
        { clase: 'ig-items-start', desc: 'Inicio' },
        { clase: 'ig-items-center', desc: 'Centro' },
        { clase: 'ig-items-end', desc: 'Final' },
        { clase: 'ig-items-baseline', desc: 'Línea base' },
        { clase: 'ig-items-stretch', desc: 'Estirar (default)' },
      ].map(({ clase, desc }) => (
        <div key={clase} className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
          <div className="ig-flex ig-justify-between ig-mb-2">
            <code className="ig-text-sm ig-text-muted">{clase}</code>
            <span className="ig-text-sm ig-text-muted">{desc}</span>
          </div>
          <div className={`ig-flex ${clase} ig-gap-2 ig-bg-muted ig-p-2 ig-rounded ig-h-24`}>
            <Box className="ig-w-16 ig-h-8">1</Box>
            <Box className="ig-w-16 ig-h-12">2</Box>
            <Box className="ig-w-16 ig-h-16">3</Box>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const FlexWrap = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Flex Wrap</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-flex-nowrap (default)</code>
        <div className="ig-flex ig-flex-nowrap ig-gap-2 ig-overflow-x-auto ig-bg-muted ig-p-2 ig-rounded">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <Box key={n} className="ig-w-20 ig-flex-shrink-0">{n}</Box>
          ))}
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-flex-wrap</code>
        <div className="ig-flex ig-flex-wrap ig-gap-2 ig-bg-muted ig-p-2 ig-rounded">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <Box key={n} className="ig-w-20">{n}</Box>
          ))}
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-flex-wrap-reverse</code>
        <div className="ig-flex ig-flex-wrap-reverse ig-gap-2 ig-bg-muted ig-p-2 ig-rounded">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <Box key={n} className="ig-w-20">{n}</Box>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const FlexGrowShrink = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Flex Grow y Shrink</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-flex-1 (crece para llenar)</code>
        <div className="ig-flex ig-gap-2 ig-bg-muted ig-p-2 ig-rounded">
          <Box className="ig-flex-1">flex-1</Box>
          <Box className="ig-w-20">fijo</Box>
          <Box className="ig-flex-1">flex-1</Box>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-flex-grow vs ig-flex-grow-0</code>
        <div className="ig-flex ig-gap-2 ig-bg-muted ig-p-2 ig-rounded">
          <Box className="ig-flex-grow">grow</Box>
          <Box className="ig-flex-grow-0 ig-w-20">grow-0</Box>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-flex-shrink vs ig-flex-shrink-0</code>
        <div className="ig-flex ig-gap-2 ig-bg-muted ig-p-2 ig-rounded ig-w-48">
          <Box className="ig-flex-shrink ig-w-32">shrink</Box>
          <Box className="ig-flex-shrink-0 ig-w-32">shrink-0</Box>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-flex-auto vs ig-flex-none</code>
        <div className="ig-flex ig-gap-2 ig-bg-muted ig-p-2 ig-rounded">
          <Box className="ig-flex-auto">auto (crece y encoge)</Box>
          <Box className="ig-flex-none ig-w-32">none (tamaño fijo)</Box>
        </div>
      </div>
    </div>
  </div>
);

export const AlignSelf = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Align Self (elemento individual)</h2>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">Cada elemento con diferente align-self</code>
      <div className="ig-flex ig-gap-2 ig-bg-muted ig-p-2 ig-rounded ig-h-32">
        <Box className="ig-self-start ig-h-auto">self-start</Box>
        <Box className="ig-self-center ig-h-auto">self-center</Box>
        <Box className="ig-self-end ig-h-auto">self-end</Box>
        <Box className="ig-self-stretch">self-stretch</Box>
      </div>
    </div>
  </div>
);

export const EjemplosPracticos = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Ejemplos Prácticos</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Navbar con logo y acciones</h3>
        <div className="ig-flex ig-items-center ig-justify-between ig-bg-muted ig-p-4 ig-rounded">
          <div className="ig-text-brand ig-font-bold">Logo</div>
          <nav className="ig-flex ig-gap-4">
            <span className="ig-text-body">Inicio</span>
            <span className="ig-text-body">Productos</span>
            <span className="ig-text-body">Contacto</span>
          </nav>
          <button className="ig-btn ig-btn-brand ig-btn-sm">Login</button>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Card con footer pegado abajo</h3>
        <div className="ig-flex ig-flex-col ig-h-48 ig-bg-muted ig-rounded ig-overflow-hidden">
          <div className="ig-flex-1 ig-p-4">
            <h4 className="ig-font-semibold ig-text-heading">Título</h4>
            <p className="ig-text-body ig-text-sm">Contenido que puede variar en tamaño.</p>
          </div>
          <div className="ig-p-4 ig-bg-brand ig-text-on-brand ig-text-center">
            Footer siempre abajo
          </div>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Centrado perfecto</h3>
        <div className="ig-flex ig-items-center ig-justify-center ig-h-32 ig-bg-muted ig-rounded">
          <div className="ig-p-4 ig-bg-brand ig-text-on-brand ig-rounded">
            Centrado vertical y horizontal
          </div>
        </div>
      </div>
    </div>
  </div>
);
