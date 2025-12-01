import React from 'react';

export default {
  title: 'Animaciones/Keyframes',
};

export const AnimacionesBasicas = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Animaciones Básicas</h2>

    <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-4 ig-gap-6">
      <div className="ig-text-center">
        <div className="ig-w-16 ig-h-16 ig-bg-brand ig-rounded ig-mx-auto ig-mb-2 ig-animate-spin"></div>
        <code className="ig-text-xs ig-text-muted">ig-animate-spin</code>
      </div>

      <div className="ig-text-center">
        <div className="ig-relative ig-mx-auto ig-mb-2 ig-w-16 ig-h-16">
          <div className="ig-w-16 ig-h-16 ig-bg-secondary ig-rounded-full ig-animate-ping ig-opacity-75"></div>
          <div className="ig-absolute ig-inset-0 ig-w-16 ig-h-16 ig-bg-secondary ig-rounded-full"></div>
        </div>
        <code className="ig-text-xs ig-text-muted">ig-animate-ping</code>
      </div>

      <div className="ig-text-center">
        <div className="ig-w-16 ig-h-16 ig-bg-success ig-rounded ig-mx-auto ig-mb-2 ig-animate-pulse"></div>
        <code className="ig-text-xs ig-text-muted">ig-animate-pulse</code>
      </div>

      <div className="ig-text-center">
        <div className="ig-w-16 ig-h-16 ig-bg-warning ig-rounded ig-mx-auto ig-mb-2 ig-animate-bounce"></div>
        <code className="ig-text-xs ig-text-muted">ig-animate-bounce</code>
      </div>
    </div>
  </div>
);

export const AnimacionesDeAtencion = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Animaciones de Atención</h2>

    <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-4 ig-gap-6">
      <div className="ig-text-center">
        <div className="ig-w-16 ig-h-16 ig-bg-danger ig-rounded ig-mx-auto ig-mb-2 ig-animate-shake"></div>
        <code className="ig-text-xs ig-text-muted">ig-animate-shake</code>
      </div>

      <div className="ig-text-center">
        <div className="ig-w-16 ig-h-16 ig-bg-info ig-rounded ig-mx-auto ig-mb-2 ig-animate-wiggle"></div>
        <code className="ig-text-xs ig-text-muted">ig-animate-wiggle</code>
      </div>

      <div className="ig-text-center">
        <div className="ig-w-16 ig-h-16 ig-bg-danger ig-rounded-full ig-mx-auto ig-mb-2 ig-animate-heartbeat"></div>
        <code className="ig-text-xs ig-text-muted">ig-animate-heartbeat</code>
      </div>

      <div className="ig-text-center">
        <div className="ig-w-16 ig-h-16 ig-bg-brand ig-rounded ig-mx-auto ig-mb-2 ig-animate-glow-pulse"></div>
        <code className="ig-text-xs ig-text-muted">ig-animate-glow-pulse</code>
      </div>
    </div>
  </div>
);

export const AnimacionesDeFade = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Animaciones de Fade</h2>

    <div className="ig-grid ig-grid-cols-2 ig-gap-6">
      <div className="ig-text-center">
        <div className="ig-w-20 ig-h-20 ig-bg-brand ig-rounded ig-mx-auto ig-mb-2 ig-animate-fade-in"></div>
        <code className="ig-text-xs ig-text-muted">ig-animate-fade-in</code>
        <p className="ig-text-sm ig-text-muted ig-mt-1">Aparece con fade</p>
      </div>

      <div className="ig-text-center">
        <div className="ig-w-20 ig-h-20 ig-bg-secondary ig-rounded ig-mx-auto ig-mb-2 ig-animate-fade-out"></div>
        <code className="ig-text-xs ig-text-muted">ig-animate-fade-out</code>
        <p className="ig-text-sm ig-text-muted ig-mt-1">Desaparece con fade</p>
      </div>
    </div>
  </div>
);

export const AnimacionesDeSlide = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Animaciones de Slide</h2>

    <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-4 ig-gap-6">
      <div className="ig-text-center">
        <div className="ig-w-16 ig-h-16 ig-bg-brand ig-rounded ig-mx-auto ig-mb-2 ig-animate-slide-up"></div>
        <code className="ig-text-xs ig-text-muted">ig-animate-slide-up</code>
        <p className="ig-text-xs ig-text-muted">Desde abajo</p>
      </div>

      <div className="ig-text-center">
        <div className="ig-w-16 ig-h-16 ig-bg-secondary ig-rounded ig-mx-auto ig-mb-2 ig-animate-slide-down"></div>
        <code className="ig-text-xs ig-text-muted">ig-animate-slide-down</code>
        <p className="ig-text-xs ig-text-muted">Desde arriba</p>
      </div>

      <div className="ig-text-center">
        <div className="ig-w-16 ig-h-16 ig-bg-success ig-rounded ig-mx-auto ig-mb-2 ig-animate-slide-left"></div>
        <code className="ig-text-xs ig-text-muted">ig-animate-slide-left</code>
        <p className="ig-text-xs ig-text-muted">Desde derecha</p>
      </div>

      <div className="ig-text-center">
        <div className="ig-w-16 ig-h-16 ig-bg-warning ig-rounded ig-mx-auto ig-mb-2 ig-animate-slide-right"></div>
        <code className="ig-text-xs ig-text-muted">ig-animate-slide-right</code>
        <p className="ig-text-xs ig-text-muted">Desde izquierda</p>
      </div>
    </div>
  </div>
);

export const AnimacionesDeZoom = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Animaciones de Zoom/Scale</h2>

    <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-4 ig-gap-6">
      <div className="ig-text-center">
        <div className="ig-w-16 ig-h-16 ig-bg-brand ig-rounded ig-mx-auto ig-mb-2 ig-animate-scale-in"></div>
        <code className="ig-text-xs ig-text-muted">ig-animate-scale-in</code>
      </div>

      <div className="ig-text-center">
        <div className="ig-w-16 ig-h-16 ig-bg-secondary ig-rounded ig-mx-auto ig-mb-2 ig-animate-zoom-in"></div>
        <code className="ig-text-xs ig-text-muted">ig-animate-zoom-in</code>
      </div>

      <div className="ig-text-center">
        <div className="ig-w-16 ig-h-16 ig-bg-success ig-rounded ig-mx-auto ig-mb-2 ig-animate-zoom-out"></div>
        <code className="ig-text-xs ig-text-muted">ig-animate-zoom-out</code>
      </div>
    </div>
  </div>
);

export const AnimacionesDeFlip = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Animaciones de Flip 3D</h2>

    <div className="ig-grid ig-grid-cols-2 ig-gap-6" style={{ perspective: '1000px' }}>
      <div className="ig-text-center">
        <div className="ig-w-20 ig-h-20 ig-bg-brand ig-rounded ig-mx-auto ig-mb-2 ig-animate-flip-x" style={{ transformStyle: 'preserve-3d' }}>
          <span className="ig-text-on-brand ig-flex ig-items-center ig-justify-center ig-h-full">X</span>
        </div>
        <code className="ig-text-xs ig-text-muted">ig-animate-flip-x</code>
        <p className="ig-text-xs ig-text-muted">Volteo horizontal</p>
      </div>

      <div className="ig-text-center">
        <div className="ig-w-20 ig-h-20 ig-bg-secondary ig-rounded ig-mx-auto ig-mb-2 ig-animate-flip-y" style={{ transformStyle: 'preserve-3d' }}>
          <span className="ig-text-on-secondary ig-flex ig-items-center ig-justify-center ig-h-full">Y</span>
        </div>
        <code className="ig-text-xs ig-text-muted">ig-animate-flip-y</code>
        <p className="ig-text-xs ig-text-muted">Volteo vertical</p>
      </div>
    </div>
  </div>
);

export const AnimacionShimmer = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Shimmer (Loading)</h2>
    <p className="ig-text-body ig-mb-6">
      La animación shimmer es ideal para estados de carga (skeleton loaders).
    </p>

    <div className="ig-space-y-4 ig-max-w-md">
      <div className="ig-h-4 ig-bg-muted ig-rounded ig-animate-shimmer"></div>
      <div className="ig-h-4 ig-bg-muted ig-rounded ig-animate-shimmer ig-w-3/4"></div>
      <div className="ig-h-4 ig-bg-muted ig-rounded ig-animate-shimmer ig-w-1/2"></div>

      <div className="ig-flex ig-gap-4 ig-mt-6">
        <div className="ig-w-12 ig-h-12 ig-bg-muted ig-rounded-full ig-animate-shimmer"></div>
        <div className="ig-flex-1 ig-space-y-2">
          <div className="ig-h-4 ig-bg-muted ig-rounded ig-animate-shimmer"></div>
          <div className="ig-h-3 ig-bg-muted ig-rounded ig-animate-shimmer ig-w-2/3"></div>
        </div>
      </div>
    </div>
  </div>
);

export const SinAnimacion = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Sin Animación</h2>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <p className="ig-text-body ig-mb-4">
        Usa <code className="ig-bg-muted ig-px-1 ig-rounded">ig-animate-none</code> para
        desactivar animaciones condicionalmente.
      </p>

      <div className="ig-flex ig-gap-4">
        <div className="ig-w-16 ig-h-16 ig-bg-brand ig-rounded ig-animate-pulse"></div>
        <div className="ig-w-16 ig-h-16 ig-bg-brand ig-rounded ig-animate-none"></div>
      </div>

      <pre className="ig-text-sm ig-text-body ig-bg-muted ig-p-4 ig-rounded ig-mt-4 ig-overflow-x-auto">
{`<!-- Con animación -->
<div class="ig-animate-pulse">...</div>

<!-- Sin animación -->
<div class="ig-animate-none">...</div>

<!-- Reducir movimiento para accesibilidad -->
<div class="ig-motion-safe:ig-animate-pulse ig-motion-reduce:ig-animate-none">
  Respeta preferencias del usuario
</div>`}
      </pre>
    </div>
  </div>
);

export const TodasLasAnimaciones = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Todas las Animaciones</h2>

    <div className="ig-grid ig-grid-cols-3 md:ig-grid-cols-5 lg:ig-grid-cols-7 ig-gap-4">
      {[
        'spin', 'ping', 'pulse', 'bounce', 'shake',
        'fade-in', 'fade-out', 'slide-up', 'slide-down',
        'slide-left', 'slide-right', 'scale-in',
        'zoom-in', 'zoom-out', 'flip-x', 'flip-y',
        'wiggle', 'heartbeat', 'shimmer', 'glow-pulse'
      ].map((anim) => (
        <div key={anim} className="ig-text-center">
          <div className={`ig-w-12 ig-h-12 ig-bg-brand ig-rounded ig-mx-auto ig-mb-1 ig-animate-${anim}`}></div>
          <code className="ig-text-xs ig-text-muted">{anim}</code>
        </div>
      ))}
    </div>
  </div>
);
