import React from 'react';

export default {
  title: 'Fundamentos/Tipografía',
};

export const FamiliasDeFuentes = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Familias de Fuentes</h2>

    <div className="ig-space-y-8">
      <div className="ig-bg-surface ig-p-6 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-text-lg ig-font-semibold ig-text-heading ig-mb-2">Electrolize - Títulos</h3>
        <code className="ig-text-sm ig-text-muted ig-font-mono ig-block ig-mb-4">--ig-font-heading</code>
        <p style={{ fontFamily: 'var(--ig-font-heading)' }} className="ig-text-4xl">
          ABCDEFGHIJKLMNOPQRSTUVWXYZ
        </p>
        <p style={{ fontFamily: 'var(--ig-font-heading)' }} className="ig-text-4xl">
          abcdefghijklmnopqrstuvwxyz
        </p>
        <p style={{ fontFamily: 'var(--ig-font-heading)' }} className="ig-text-4xl">
          0123456789
        </p>
      </div>

      <div className="ig-bg-surface ig-p-6 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-text-lg ig-font-semibold ig-text-heading ig-mb-2">Saira - Texto Base</h3>
        <code className="ig-text-sm ig-text-muted ig-font-mono ig-block ig-mb-4">--ig-font-base / --ig-font-sans</code>
        <p style={{ fontFamily: 'var(--ig-font-base)' }} className="ig-text-xl">
          ABCDEFGHIJKLMNOPQRSTUVWXYZ
        </p>
        <p style={{ fontFamily: 'var(--ig-font-base)' }} className="ig-text-xl">
          abcdefghijklmnopqrstuvwxyz
        </p>
        <p style={{ fontFamily: 'var(--ig-font-base)' }} className="ig-text-xl">
          0123456789
        </p>
      </div>

      <div className="ig-bg-surface ig-p-6 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-text-lg ig-font-semibold ig-text-heading ig-mb-2">JetBrains Mono - Código</h3>
        <code className="ig-text-sm ig-text-muted ig-font-mono ig-block ig-mb-4">--ig-font-mono</code>
        <p style={{ fontFamily: 'var(--ig-font-mono)' }} className="ig-text-lg">
          ABCDEFGHIJKLMNOPQRSTUVWXYZ
        </p>
        <p style={{ fontFamily: 'var(--ig-font-mono)' }} className="ig-text-lg">
          abcdefghijklmnopqrstuvwxyz
        </p>
        <p style={{ fontFamily: 'var(--ig-font-mono)' }} className="ig-text-lg">
          {`const example = () => { return "Hello World"; }`}
        </p>
      </div>
    </div>
  </div>
);

export const EscalaDeTamanos = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Escala de Tamaños</h2>
    <p className="ig-text-body ig-mb-6">
      Clases de tamaño proporcionales a <code className="ig-bg-muted ig-px-1 ig-rounded">--ig-text-base</code> (1rem = 16px).
    </p>

    <div className="ig-space-y-4">
      <div className="ig-flex ig-items-baseline ig-gap-4 ig-p-3 ig-bg-surface ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-xs ig-text-muted ig-w-24">ig-text-xs</code>
        <span className="ig-text-xs">El veloz murciélago hindú (12px)</span>
      </div>
      <div className="ig-flex ig-items-baseline ig-gap-4 ig-p-3 ig-bg-surface ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-xs ig-text-muted ig-w-24">ig-text-sm</code>
        <span className="ig-text-sm">El veloz murciélago hindú (14px)</span>
      </div>
      <div className="ig-flex ig-items-baseline ig-gap-4 ig-p-3 ig-bg-surface ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-xs ig-text-muted ig-w-24">ig-text-base</code>
        <span className="ig-text-base">El veloz murciélago hindú (16px)</span>
      </div>
      <div className="ig-flex ig-items-baseline ig-gap-4 ig-p-3 ig-bg-surface ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-xs ig-text-muted ig-w-24">ig-text-lg</code>
        <span className="ig-text-lg">El veloz murciélago hindú (18px)</span>
      </div>
      <div className="ig-flex ig-items-baseline ig-gap-4 ig-p-3 ig-bg-surface ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-xs ig-text-muted ig-w-24">ig-text-xl</code>
        <span className="ig-text-xl">El veloz murciélago hindú (20px)</span>
      </div>
      <div className="ig-flex ig-items-baseline ig-gap-4 ig-p-3 ig-bg-surface ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-xs ig-text-muted ig-w-24">ig-text-2xl</code>
        <span className="ig-text-2xl">El veloz murciélago (24px)</span>
      </div>
      <div className="ig-flex ig-items-baseline ig-gap-4 ig-p-3 ig-bg-surface ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-xs ig-text-muted ig-w-24">ig-text-3xl</code>
        <span className="ig-text-3xl">El veloz murciélago (30px)</span>
      </div>
      <div className="ig-flex ig-items-baseline ig-gap-4 ig-p-3 ig-bg-surface ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-xs ig-text-muted ig-w-24">ig-text-4xl</code>
        <span className="ig-text-4xl">El veloz (36px)</span>
      </div>
      <div className="ig-flex ig-items-baseline ig-gap-4 ig-p-3 ig-bg-surface ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-xs ig-text-muted ig-w-24">ig-text-5xl</code>
        <span className="ig-text-5xl">Veloz (48px)</span>
      </div>
    </div>
  </div>
);

export const PesosDeFuente = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Pesos de Fuente</h2>

    <div className="ig-space-y-4">
      <div className="ig-flex ig-items-baseline ig-gap-4 ig-p-3 ig-bg-surface ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-xs ig-text-muted ig-w-32">ig-font-light</code>
        <span className="ig-text-xl ig-font-light">Texto con peso light (300)</span>
      </div>
      <div className="ig-flex ig-items-baseline ig-gap-4 ig-p-3 ig-bg-surface ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-xs ig-text-muted ig-w-32">ig-font-normal</code>
        <span className="ig-text-xl ig-font-normal">Texto con peso normal (400)</span>
      </div>
      <div className="ig-flex ig-items-baseline ig-gap-4 ig-p-3 ig-bg-surface ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-xs ig-text-muted ig-w-32">ig-font-medium</code>
        <span className="ig-text-xl ig-font-medium">Texto con peso medium (500)</span>
      </div>
      <div className="ig-flex ig-items-baseline ig-gap-4 ig-p-3 ig-bg-surface ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-xs ig-text-muted ig-w-32">ig-font-semibold</code>
        <span className="ig-text-xl ig-font-semibold">Texto con peso semibold (600)</span>
      </div>
      <div className="ig-flex ig-items-baseline ig-gap-4 ig-p-3 ig-bg-surface ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-xs ig-text-muted ig-w-32">ig-font-bold</code>
        <span className="ig-text-xl ig-font-bold">Texto con peso bold (700)</span>
      </div>
    </div>
  </div>
);

export const AlturasDeLinea = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Alturas de Línea</h2>

    <div className="ig-space-y-6">
      {[
        { clase: 'ig-leading-none', valor: '1', desc: 'Sin espaciado extra' },
        { clase: 'ig-leading-tight', valor: '1.25', desc: 'Compacto' },
        { clase: 'ig-leading-snug', valor: '1.375', desc: 'Ajustado' },
        { clase: 'ig-leading-normal', valor: '1.5', desc: 'Normal (recomendado)' },
        { clase: 'ig-leading-relaxed', valor: '1.625', desc: 'Relajado' },
        { clase: 'ig-leading-loose', valor: '2', desc: 'Muy espaciado' },
      ].map(({ clase, valor, desc }) => (
        <div key={clase} className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
          <div className="ig-flex ig-justify-between ig-mb-2">
            <code className="ig-text-sm ig-text-muted">{clase}</code>
            <span className="ig-text-sm ig-text-muted">{valor} - {desc}</span>
          </div>
          <p className={`ig-text-base ${clase} ig-bg-muted ig-p-3 ig-rounded`}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
          </p>
        </div>
      ))}
    </div>
  </div>
);

export const EspaciadoDeLetras = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Espaciado entre Letras</h2>

    <div className="ig-space-y-4">
      {[
        { clase: 'ig-tracking-tighter', valor: '-0.05em' },
        { clase: 'ig-tracking-tight', valor: '-0.025em' },
        { clase: 'ig-tracking-normal', valor: '0' },
        { clase: 'ig-tracking-wide', valor: '0.025em' },
        { clase: 'ig-tracking-wider', valor: '0.05em' },
        { clase: 'ig-tracking-widest', valor: '0.1em' },
      ].map(({ clase, valor }) => (
        <div key={clase} className="ig-flex ig-items-center ig-gap-4 ig-p-3 ig-bg-surface ig-rounded-lg ig-border ig-border-default">
          <code className="ig-text-xs ig-text-muted ig-w-36">{clase}</code>
          <span className="ig-text-sm ig-text-muted ig-w-20">{valor}</span>
          <span className={`ig-text-lg ${clase}`}>ABCDEFGHIJKLMNOP</span>
        </div>
      ))}
    </div>
  </div>
);

export const AlineacionDeTexto = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Alineación de Texto</h2>

    <div className="ig-space-y-4">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-text-left</code>
        <p className="ig-text-left ig-bg-muted ig-p-3 ig-rounded">
          Texto alineado a la izquierda. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
      </div>
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-text-center</code>
        <p className="ig-text-center ig-bg-muted ig-p-3 ig-rounded">
          Texto centrado. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
      </div>
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-text-right</code>
        <p className="ig-text-right ig-bg-muted ig-p-3 ig-rounded">
          Texto alineado a la derecha. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
      </div>
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-text-justify</code>
        <p className="ig-text-justify ig-bg-muted ig-p-3 ig-rounded">
          Texto justificado. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
      </div>
    </div>
  </div>
);

export const EstilosDeTexto = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Estilos de Texto</h2>

    <div className="ig-grid ig-grid-cols-1 ig-md:ig-grid-cols-2 ig-gap-4">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-italic</code>
        <p className="ig-italic ig-text-lg">Texto en itálica</p>
      </div>
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-not-italic</code>
        <p className="ig-not-italic ig-text-lg">Texto normal (sin itálica)</p>
      </div>
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-underline</code>
        <p className="ig-underline ig-text-lg">Texto subrayado</p>
      </div>
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-line-through</code>
        <p className="ig-line-through ig-text-lg">Texto tachado</p>
      </div>
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-uppercase</code>
        <p className="ig-uppercase ig-text-lg">texto en mayúsculas</p>
      </div>
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-lowercase</code>
        <p className="ig-lowercase ig-text-lg">TEXTO EN MINÚSCULAS</p>
      </div>
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-capitalize</code>
        <p className="ig-capitalize ig-text-lg">texto con iniciales mayúsculas</p>
      </div>
    </div>
  </div>
);
