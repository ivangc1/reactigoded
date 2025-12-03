import React from 'react';

export default {
  title: 'Utilidades/Texto',
};

export const AlineacionDeTexto = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Alineación de Texto</h2>

    <div className="ig-space-y-4">
      {[
        { clase: 'ig-text-left', desc: 'Texto alineado a la izquierda' },
        { clase: 'ig-text-center', desc: 'Texto centrado' },
        { clase: 'ig-text-right', desc: 'Texto alineado a la derecha' },
        { clase: 'ig-text-justify', desc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.' },
      ].map(({ clase, desc }) => (
        <div key={clase} className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
          <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">{clase}</code>
          <p className={`ig-text-body ${clase}`}>{desc}</p>
        </div>
      ))}
    </div>
  </div>
);

export const TruncadoDeTexto = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Truncado de Texto</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-truncate</code>
        <p className="ig-truncate ig-text-body ig-max-w-xs">
          Este texto es muy largo y será truncado con puntos suspensivos cuando no quepa en una línea.
        </p>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-line-clamp-1</code>
        <p className="ig-line-clamp-1 ig-text-body ig-max-w-md">
          Este texto es muy largo y será limitado a una sola línea usando line-clamp.
        </p>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-line-clamp-2</code>
        <p className="ig-line-clamp-2 ig-text-body ig-max-w-md">
          Este texto es muy largo y será limitado a dos líneas. Lorem ipsum dolor sit amet,
          consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
        </p>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-line-clamp-3</code>
        <p className="ig-line-clamp-3 ig-text-body ig-max-w-md">
          Este texto es muy largo y será limitado a tres líneas. Lorem ipsum dolor sit amet,
          consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
          commodo consequat. Duis aute irure dolor in reprehenderit in voluptate.
        </p>
      </div>
    </div>
  </div>
);

export const TextoWrap = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Text Wrap</h2>

    <div className="ig-space-y-4">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-text-balance</code>
        <h3 className="ig-text-balance ig-text-xl ig-font-bold ig-text-heading ig-max-w-sm">
          Un título largo que se balanceará de manera uniforme en múltiples líneas
        </h3>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-text-pretty</code>
        <p className="ig-text-pretty ig-text-body ig-max-w-sm">
          Este párrafo usa text-wrap: pretty para evitar huérfanos tipográficos y mejorar la legibilidad.
        </p>
      </div>
    </div>
  </div>
);

export const Whitespace = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Whitespace</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-whitespace-normal</code>
        <p className="ig-whitespace-normal ig-text-body ig-max-w-xs ig-bg-muted ig-p-2 ig-rounded">
          Texto     con     espacios      múltiples    y
          saltos de línea
          que se normalizan.
        </p>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-whitespace-nowrap</code>
        <div className="ig-overflow-x-auto">
          <p className="ig-whitespace-nowrap ig-text-body ig-bg-muted ig-p-2 ig-rounded">
            Este texto no hace salto de línea sin importar lo largo que sea, continúa en una sola línea.
          </p>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-whitespace-pre</code>
        <p className="ig-whitespace-pre ig-text-body ig-bg-muted ig-p-2 ig-rounded ig-text-sm ig-overflow-x-auto">
{`function ejemplo() {
  const x = 1;
  return x;
}`}
        </p>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-whitespace-pre-wrap</code>
        <p className="ig-whitespace-pre-wrap ig-text-body ig-max-w-sm ig-bg-muted ig-p-2 ig-rounded">
{`Este texto preserva los saltos de línea
y los espacios múltiples   pero
hace wrap al final de la línea.`}
        </p>
      </div>
    </div>
  </div>
);

export const WordBreak = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Word Break</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-break-normal</code>
        <p className="ig-break-normal ig-text-body ig-max-w-xs ig-bg-muted ig-p-2 ig-rounded">
          Unasuperlargapalabraquenoserompe normalmente continúa fuera del contenedor.
        </p>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-break-words</code>
        <p className="ig-break-words ig-text-body ig-max-w-xs ig-bg-muted ig-p-2 ig-rounded">
          Unasuperlargapalabraquenoserompe ahora sí se rompe cuando es necesario.
        </p>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-break-all</code>
        <p className="ig-break-all ig-text-body ig-max-w-xs ig-bg-muted ig-p-2 ig-rounded">
          Cualquier texto se romperá en cualquier carácter sin importar si es una palabra.
        </p>
      </div>
    </div>
  </div>
);

export const TransformacionesDeTexto = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Transformaciones de Texto</h2>

    <div className="ig-space-y-4">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-uppercase</code>
        <p className="ig-uppercase ig-text-body">texto en mayúsculas</p>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-lowercase</code>
        <p className="ig-lowercase ig-text-body">TEXTO EN MINÚSCULAS</p>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-capitalize</code>
        <p className="ig-capitalize ig-text-body">cada palabra capitalizada</p>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-normal-case</code>
        <p className="ig-normal-case ig-text-body">Texto Normal Sin Transformación</p>
      </div>
    </div>
  </div>
);

export const Decoraciones = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Decoraciones de Texto</h2>

    <div className="ig-space-y-4">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-underline</code>
        <p className="ig-underline ig-text-body">Texto subrayado</p>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-line-through</code>
        <p className="ig-line-through ig-text-body">Texto tachado</p>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-no-underline</code>
        <a href="#" className="ig-no-underline ig-text-brand">Enlace sin subrayado</a>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">ig-decoration-brand</code>
        <p className="ig-underline ig-decoration-brand ig-decoration-2 ig-text-body">
          Subrayado con color brand
        </p>
      </div>
    </div>
  </div>
);

export const EspaciadoDeLetras = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Espaciado de Letras y Líneas</h2>

    <div className="ig-space-y-6">
      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Letter Spacing</h3>
        <div className="ig-space-y-3">
          {[
            { clase: 'ig-tracking-tighter', texto: 'Tracking Tighter' },
            { clase: 'ig-tracking-tight', texto: 'Tracking Tight' },
            { clase: 'ig-tracking-normal', texto: 'Tracking Normal' },
            { clase: 'ig-tracking-wide', texto: 'Tracking Wide' },
            { clase: 'ig-tracking-wider', texto: 'Tracking Wider' },
            { clase: 'ig-tracking-widest', texto: 'Tracking Widest' },
          ].map(({ clase, texto }) => (
            <div key={clase} className="ig-flex ig-items-center ig-gap-4">
              <code className="ig-text-sm ig-text-muted ig-w-40">{clase}</code>
              <span className={`ig-text-body ${clase}`}>{texto}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Line Height</h3>
        <div className="ig-grid ig-grid-cols-1 md:ig-grid-cols-2 ig-gap-4">
          {[
            { clase: 'ig-leading-none', nombre: 'none (1)' },
            { clase: 'ig-leading-tight', nombre: 'tight (1.25)' },
            { clase: 'ig-leading-snug', nombre: 'snug (1.375)' },
            { clase: 'ig-leading-normal', nombre: 'normal (1.5)' },
            { clase: 'ig-leading-relaxed', nombre: 'relaxed (1.625)' },
            { clase: 'ig-leading-loose', nombre: 'loose (2)' },
          ].map(({ clase, nombre }) => (
            <div key={clase} className="ig-bg-surface ig-p-3 ig-rounded ig-border ig-border-default">
              <code className="ig-text-sm ig-text-muted ig-block ig-mb-2">{clase}</code>
              <p className={`ig-text-body ${clase}`}>
                Ejemplo de texto con line-height {nombre}. Múltiples líneas para demostrar el espaciado vertical.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
