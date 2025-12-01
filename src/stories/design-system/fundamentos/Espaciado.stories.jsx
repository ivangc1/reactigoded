import React from 'react';

export default {
  title: 'Fundamentos/Espaciado',
};

const SpacingDemo = ({ value, label }) => (
  <div className="ig-flex ig-items-center ig-gap-4 ig-p-2 ig-bg-surface ig-rounded ig-border ig-border-subtle">
    <code className="ig-text-xs ig-text-muted ig-w-16 ig-font-mono">{label}</code>
    <div
      className="ig-h-8 ig-bg-brand ig-rounded"
      style={{ width: `var(--ig-space-${value})` }}
    />
    <span className="ig-text-xs ig-text-muted">{value === '0' ? '0' : value === 'px' ? '1px' : `${value} × 0.25rem`}</span>
  </div>
);

export const EscalaDeEspaciado = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-2">Escala de Espaciado</h2>
    <p className="ig-text-body ig-mb-6">
      Basada en una unidad de <code className="ig-bg-muted ig-px-1 ig-rounded">0.25rem (4px)</code>.
      Usa múltiplos de 4 para un ritmo visual consistente.
    </p>

    <div className="ig-space-y-2">
      {['0', 'px', '0-5', '1', '1-5', '2', '2-5', '3', '3-5', '4', '5', '6', '7', '8', '9', '10', '11', '12', '14', '16', '20', '24'].map((val) => (
        <SpacingDemo key={val} value={val} label={val} />
      ))}
    </div>
  </div>
);

export const EspaciadoSemantico = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-2">Espaciado Semántico</h2>
    <p className="ig-text-body ig-mb-6">
      Aliases con nombres descriptivos para un uso más intuitivo.
    </p>

    <div className="ig-space-y-4">
      {[
        { name: '2xs', equiv: '0.5 (2px)', desc: 'Micro espaciado' },
        { name: 'xs', equiv: '1 (4px)', desc: 'Muy pequeño' },
        { name: 'sm', equiv: '2 (8px)', desc: 'Pequeño' },
        { name: 'md', equiv: '4 (16px)', desc: 'Medio (default)' },
        { name: 'lg', equiv: '6 (24px)', desc: 'Grande' },
        { name: 'xl', equiv: '8 (32px)', desc: 'Extra grande' },
        { name: '2xl', equiv: '12 (48px)', desc: 'Enorme' },
        { name: '3xl', equiv: '16 (64px)', desc: 'Máximo' },
      ].map(({ name, equiv, desc }) => (
        <div key={name} className="ig-flex ig-items-center ig-gap-4 ig-p-3 ig-bg-surface ig-rounded-lg ig-border ig-border-default">
          <code className="ig-text-sm ig-text-muted ig-w-20 ig-font-mono">space-{name}</code>
          <div
            className="ig-h-10 ig-bg-secondary ig-rounded ig-flex-shrink-0"
            style={{ width: `var(--ig-space-${name})` }}
          />
          <div className="ig-flex-1">
            <span className="ig-text-sm ig-text-muted">= space-{equiv}</span>
            <span className="ig-text-sm ig-text-body ig-ml-2">— {desc}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const ClasesDePadding = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-2">Clases de Padding</h2>
    <p className="ig-text-body ig-mb-6">
      Aplica espaciado interior a los elementos.
    </p>

    <div className="ig-grid ig-grid-cols-1 md:ig-grid-cols-2 ig-gap-4">
      <div className="ig-bg-surface ig-rounded-lg ig-border ig-border-default ig-overflow-hidden">
        <div className="ig-p-3 ig-border-b ig-border-subtle">
          <code className="ig-text-sm ig-text-muted">ig-p-4 (todos los lados)</code>
        </div>
        <div className="ig-bg-muted">
          <div className="ig-p-4 ig-bg-brand/20 ig-border ig-border-dashed ig-border-brand">
            <div className="ig-bg-surface ig-p-2 ig-rounded ig-text-center ig-text-sm">Contenido</div>
          </div>
        </div>
      </div>

      <div className="ig-bg-surface ig-rounded-lg ig-border ig-border-default ig-overflow-hidden">
        <div className="ig-p-3 ig-border-b ig-border-subtle">
          <code className="ig-text-sm ig-text-muted">ig-px-6 ig-py-2</code>
        </div>
        <div className="ig-bg-muted">
          <div className="ig-px-6 ig-py-2 ig-bg-secondary/20 ig-border ig-border-dashed ig-border-secondary">
            <div className="ig-bg-surface ig-p-2 ig-rounded ig-text-center ig-text-sm">Contenido</div>
          </div>
        </div>
      </div>

      <div className="ig-bg-surface ig-rounded-lg ig-border ig-border-default ig-overflow-hidden">
        <div className="ig-p-3 ig-border-b ig-border-subtle">
          <code className="ig-text-sm ig-text-muted">ig-pt-8 ig-pb-2</code>
        </div>
        <div className="ig-bg-muted">
          <div className="ig-pt-8 ig-pb-2 ig-bg-success/20 ig-border ig-border-dashed ig-border-success">
            <div className="ig-bg-surface ig-p-2 ig-rounded ig-text-center ig-text-sm">Contenido</div>
          </div>
        </div>
      </div>

      <div className="ig-bg-surface ig-rounded-lg ig-border ig-border-default ig-overflow-hidden">
        <div className="ig-p-3 ig-border-b ig-border-subtle">
          <code className="ig-text-sm ig-text-muted">ig-pl-8 ig-pr-2</code>
        </div>
        <div className="ig-bg-muted">
          <div className="ig-pl-8 ig-pr-2 ig-py-2 ig-bg-warning/20 ig-border ig-border-dashed ig-border-warning">
            <div className="ig-bg-surface ig-p-2 ig-rounded ig-text-center ig-text-sm">Contenido</div>
          </div>
        </div>
      </div>
    </div>

    <div className="ig-mt-6 ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <h3 className="ig-font-semibold ig-text-heading ig-mb-2">Referencia rápida</h3>
      <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-3 ig-gap-2 ig-text-sm">
        <code className="ig-text-muted">ig-p-* → todos</code>
        <code className="ig-text-muted">ig-px-* → horizontal</code>
        <code className="ig-text-muted">ig-py-* → vertical</code>
        <code className="ig-text-muted">ig-pt-* → arriba</code>
        <code className="ig-text-muted">ig-pr-* → derecha</code>
        <code className="ig-text-muted">ig-pb-* → abajo</code>
        <code className="ig-text-muted">ig-pl-* → izquierda</code>
      </div>
    </div>
  </div>
);

export const ClasesDeMargin = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-2">Clases de Margin</h2>
    <p className="ig-text-body ig-mb-6">
      Aplica espaciado exterior entre elementos.
    </p>

    <div className="ig-space-y-4">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-m-4</code>
        <div className="ig-bg-muted ig-inline-block">
          <div className="ig-m-4 ig-bg-brand ig-p-4 ig-rounded ig-text-on-brand">Margin en todos los lados</div>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-mx-auto (centrar horizontalmente)</code>
        <div className="ig-bg-muted ig-p-4">
          <div className="ig-mx-auto ig-w-48 ig-bg-secondary ig-p-4 ig-rounded ig-text-on-secondary ig-text-center">
            Centrado
          </div>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-mt-4 ig-mb-8</code>
        <div className="ig-bg-muted ig-p-2">
          <div className="ig-bg-surface ig-p-2 ig-rounded ig-text-center">Elemento superior</div>
          <div className="ig-mt-4 ig-mb-8 ig-bg-success ig-p-4 ig-rounded ig-text-on-success ig-text-center">
            Con margen vertical
          </div>
          <div className="ig-bg-surface ig-p-2 ig-rounded ig-text-center">Elemento inferior</div>
        </div>
      </div>
    </div>

    <div className="ig-mt-6 ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <h3 className="ig-font-semibold ig-text-heading ig-mb-2">Márgenes negativos</h3>
      <p className="ig-text-sm ig-text-muted ig-mb-3">Usa <code>ig--mt-*</code>, <code>ig--mr-*</code>, etc. para "tirar" elementos.</p>
      <div className="ig-bg-muted ig-p-4 ig-rounded">
        <div className="ig-bg-brand ig-p-4 ig-rounded ig-text-on-brand">Elemento normal</div>
        <div className="ig--mt-4 ig-ml-4 ig-bg-danger ig-p-4 ig-rounded ig-text-on-danger">
          ig--mt-4 (sube 16px)
        </div>
      </div>
    </div>
  </div>
);

export const ClasesDeGap = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-2">Clases de Gap</h2>
    <p className="ig-text-body ig-mb-6">
      Espaciado entre elementos en contenedores flex o grid.
    </p>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-gap-2</code>
        <div className="ig-flex ig-gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="ig-w-12 ig-h-12 ig-bg-brand ig-rounded ig-flex ig-items-center ig-justify-center ig-text-on-brand">
              {n}
            </div>
          ))}
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-gap-4</code>
        <div className="ig-flex ig-gap-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="ig-w-12 ig-h-12 ig-bg-secondary ig-rounded ig-flex ig-items-center ig-justify-center ig-text-on-secondary">
              {n}
            </div>
          ))}
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-gap-8</code>
        <div className="ig-flex ig-gap-8">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="ig-w-12 ig-h-12 ig-bg-success ig-rounded ig-flex ig-items-center ig-justify-center ig-text-on-success">
              {n}
            </div>
          ))}
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">ig-gap-x-8 ig-gap-y-2 (gap diferente por eje)</code>
        <div className="ig-flex ig-flex-wrap ig-gap-x-8 ig-gap-y-2 ig-w-64">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="ig-w-12 ig-h-12 ig-bg-warning ig-rounded ig-flex ig-items-center ig-justify-center ig-text-on-warning">
              {n}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
