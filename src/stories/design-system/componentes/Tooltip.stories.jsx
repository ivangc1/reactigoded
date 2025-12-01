import React from 'react';

export default {
  title: 'Componentes/Tooltip',
};

export const TooltipBasico = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tooltip Básico</h2>
    <p className="ig-text-body ig-mb-8">
      Pasa el cursor sobre los elementos para ver los tooltips.
    </p>

    <div className="ig-flex ig-flex-wrap ig-gap-8 ig-items-center ig-justify-center ig-py-12">
      <span className="ig-tooltip" data-tooltip="Este es un tooltip básico">
        <button className="ig-btn ig-btn-outline">Hover aquí</button>
      </span>

      <span className="ig-tooltip" data-tooltip="Información adicional sobre este elemento">
        <span className="ig-text-body ig-underline ig-cursor-help">Texto con tooltip</span>
      </span>

      <span className="ig-tooltip" data-tooltip="Icono de ayuda">
        <span className="ig-text-2xl ig-cursor-help">❓</span>
      </span>
    </div>
  </div>
);

export const PosicionesDeTooltip = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Posiciones de Tooltip</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-8 ig-items-center ig-justify-center ig-py-16">
      <span className="ig-tooltip ig-tooltip-top" data-tooltip="Tooltip arriba (default)">
        <button className="ig-btn ig-btn-brand">Top</button>
      </span>

      <span className="ig-tooltip ig-tooltip-bottom" data-tooltip="Tooltip abajo">
        <button className="ig-btn ig-btn-secondary">Bottom</button>
      </span>

      <span className="ig-tooltip ig-tooltip-left" data-tooltip="Tooltip izquierda">
        <button className="ig-btn ig-btn-success">Left</button>
      </span>

      <span className="ig-tooltip ig-tooltip-right" data-tooltip="Tooltip derecha">
        <button className="ig-btn ig-btn-warning">Right</button>
      </span>
    </div>
  </div>
);

export const TooltipConColores = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tooltips con Colores</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-6 ig-items-center ig-justify-center ig-py-12">
      <span className="ig-tooltip" data-tooltip="Tooltip default (oscuro)">
        <button className="ig-btn ig-btn-outline">Default</button>
      </span>

      <span className="ig-tooltip ig-tooltip-brand" data-tooltip="Tooltip brand">
        <button className="ig-btn ig-btn-brand">Brand</button>
      </span>

      <span className="ig-tooltip ig-tooltip-secondary" data-tooltip="Tooltip secondary">
        <button className="ig-btn ig-btn-secondary">Secondary</button>
      </span>

      <span className="ig-tooltip ig-tooltip-success" data-tooltip="Tooltip success">
        <button className="ig-btn ig-btn-success">Success</button>
      </span>

      <span className="ig-tooltip ig-tooltip-warning" data-tooltip="Tooltip warning">
        <button className="ig-btn ig-btn-warning">Warning</button>
      </span>

      <span className="ig-tooltip ig-tooltip-danger" data-tooltip="Tooltip danger">
        <button className="ig-btn ig-btn-danger">Danger</button>
      </span>
    </div>
  </div>
);

export const TooltipEnElementos = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tooltip en Diferentes Elementos</h2>

    <div className="ig-space-y-8">
      {/* En iconos */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">En iconos de acción</h3>
        <div className="ig-flex ig-gap-4">
          <span className="ig-tooltip" data-tooltip="Editar">
            <button className="ig-btn ig-btn-outline ig-btn-sm">✏️</button>
          </span>
          <span className="ig-tooltip" data-tooltip="Eliminar">
            <button className="ig-btn ig-btn-outline ig-btn-sm">🗑️</button>
          </span>
          <span className="ig-tooltip" data-tooltip="Compartir">
            <button className="ig-btn ig-btn-outline ig-btn-sm">📤</button>
          </span>
          <span className="ig-tooltip" data-tooltip="Descargar">
            <button className="ig-btn ig-btn-outline ig-btn-sm">⬇️</button>
          </span>
        </div>
      </div>

      {/* En badges */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">En badges</h3>
        <div className="ig-flex ig-gap-4">
          <span className="ig-tooltip" data-tooltip="5 mensajes nuevos">
            <span className="ig-badge ig-badge-danger ig-badge-pill">5</span>
          </span>
          <span className="ig-tooltip" data-tooltip="Estado activo desde hace 2 horas">
            <span className="ig-badge ig-badge-success">Activo</span>
          </span>
          <span className="ig-tooltip" data-tooltip="Versión beta - puede contener errores">
            <span className="ig-badge ig-badge-warning">Beta</span>
          </span>
        </div>
      </div>

      {/* En avatares */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">En avatares</h3>
        <div className="ig-flex ig-gap-4">
          <span className="ig-tooltip" data-tooltip="Juan Pérez - Admin">
            <div className="ig-avatar ig-avatar-md ig-bg-brand ig-text-on-brand">JP</div>
          </span>
          <span className="ig-tooltip" data-tooltip="María García - Editor">
            <div className="ig-avatar ig-avatar-md ig-bg-secondary ig-text-on-secondary">MG</div>
          </span>
          <span className="ig-tooltip" data-tooltip="Carlos López - Viewer">
            <div className="ig-avatar ig-avatar-md ig-bg-success ig-text-on-success">CL</div>
          </span>
        </div>
      </div>

      {/* En inputs */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">En campos de formulario</h3>
        <div className="ig-max-w-md">
          <label className="ig-form-label ig-flex ig-items-center ig-gap-2">
            Contraseña
            <span className="ig-tooltip ig-tooltip-right" data-tooltip="Mínimo 8 caracteres, una mayúscula y un número">
              <span className="ig-text-muted ig-cursor-help">ℹ️</span>
            </span>
          </label>
          <input type="password" className="ig-input" placeholder="••••••••" />
        </div>
      </div>
    </div>
  </div>
);

export const TooltipContenidoLargo = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tooltip con Contenido Largo</h2>
    <p className="ig-text-body ig-mb-6">
      Los tooltips con texto largo se ajustan automáticamente.
    </p>

    <div className="ig-flex ig-justify-center ig-py-12">
      <span
        className="ig-tooltip"
        data-tooltip="Este es un tooltip con un texto más largo que explica algo en detalle. Puede contener información adicional importante."
      >
        <button className="ig-btn ig-btn-brand">Tooltip con texto largo</button>
      </span>
    </div>
  </div>
);

export const AccesibilidadTooltip = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Accesibilidad en Tooltips</h2>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Buenas prácticas</h3>
      <ul className="ig-space-y-2 ig-text-body">
        <li>• Usa <code className="ig-bg-muted ig-px-1 ig-rounded">aria-label</code> o <code className="ig-bg-muted ig-px-1 ig-rounded">aria-describedby</code> para accesibilidad</li>
        <li>• Los tooltips deben ser breves y descriptivos</li>
        <li>• No uses tooltips para información esencial</li>
        <li>• Asegúrate de que el contenido sea accesible por teclado</li>
      </ul>

      <div className="ig-mt-6">
        <h4 className="ig-font-medium ig-text-heading ig-mb-3">Ejemplo accesible:</h4>
        <pre className="ig-text-sm ig-text-body ig-bg-muted ig-p-4 ig-rounded ig-overflow-x-auto">
{`<button
  class="ig-btn ig-btn-outline"
  aria-label="Eliminar elemento"
  aria-describedby="delete-tooltip"
>
  🗑️
</button>
<div id="delete-tooltip" role="tooltip" class="ig-sr-only">
  Eliminar este elemento permanentemente
</div>`}
        </pre>
      </div>
    </div>
  </div>
);
