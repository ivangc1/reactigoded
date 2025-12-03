import React from 'react';

export default {
  title: 'Interactivos/Estados',
};

export const EstadosDeInput = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Estados de Input</h2>

    <div className="ig-space-y-4 ig-max-w-md">
      <div>
        <label className="ig-form-label">Normal</label>
        <input type="text" className="ig-input" placeholder="Estado normal" />
      </div>

      <div>
        <label className="ig-form-label">Focus</label>
        <input
          type="text"
          className="ig-input ig-ring-2 ig-ring-brand ig-border-brand"
          placeholder="Con focus"
        />
      </div>

      <div>
        <label className="ig-form-label">Válido</label>
        <input
          type="text"
          className="ig-input ig-border-success ig-ring-2 ig-ring-success"
          defaultValue="Entrada válida"
        />
        <span className="ig-text-sm ig-text-success ig-mt-1 ig-block">✓ Campo válido</span>
      </div>

      <div>
        <label className="ig-form-label">Inválido</label>
        <input
          type="text"
          className="ig-input ig-border-danger ig-ring-2 ig-ring-danger"
          defaultValue="Entrada inválida"
        />
        <span className="ig-text-sm ig-text-danger ig-mt-1 ig-block">✕ Este campo tiene un error</span>
      </div>

      <div>
        <label className="ig-form-label ig-text-disabled">Deshabilitado</label>
        <input
          type="text"
          className="ig-input"
          disabled
          placeholder="No editable"
        />
      </div>

      <div>
        <label className="ig-form-label">Solo lectura</label>
        <input
          type="text"
          className="ig-input ig-bg-muted"
          readOnly
          defaultValue="Valor de solo lectura"
        />
      </div>
    </div>
  </div>
);

export const EstadosDeBoton = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Estados de Botón</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Estados normales</h3>
        <div className="ig-flex ig-flex-wrap ig-gap-4">
          <button className="ig-btn ig-btn-brand">Normal</button>
          <button className="ig-btn ig-btn-brand" disabled>Deshabilitado</button>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Con loading</h3>
        <div className="ig-flex ig-flex-wrap ig-gap-4">
          <button className="ig-btn ig-btn-brand" disabled>
            <span className="ig-spinner ig-spinner-sm ig-mr-2" style={{ borderTopColor: 'currentColor' }}></span>
            Cargando...
          </button>
          <button className="ig-btn ig-btn-secondary" disabled>
            <span className="ig-spinner ig-spinner-sm ig-mr-2" style={{ borderTopColor: 'currentColor' }}></span>
            Procesando
          </button>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Estado activo</h3>
        <div className="ig-flex ig-flex-wrap ig-gap-4">
          <button className="ig-btn ig-btn-outline">Inactivo</button>
          <button className="ig-btn ig-btn-brand">Activo</button>
        </div>
      </div>
    </div>
  </div>
);

export const EstadosDeCheckbox = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Estados de Checkbox/Radio</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Checkbox</h3>
        <div className="ig-space-y-2">
          <label className="ig-checkbox">
            <input type="checkbox" />
            <span className="ig-checkbox-mark"></span>
            Sin marcar
          </label>
          <label className="ig-checkbox">
            <input type="checkbox" defaultChecked />
            <span className="ig-checkbox-mark"></span>
            Marcado
          </label>
          <label className="ig-checkbox">
            <input type="checkbox" disabled />
            <span className="ig-checkbox-mark"></span>
            Deshabilitado
          </label>
          <label className="ig-checkbox">
            <input type="checkbox" defaultChecked disabled />
            <span className="ig-checkbox-mark"></span>
            Marcado y deshabilitado
          </label>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Radio</h3>
        <div className="ig-space-y-2">
          <label className="ig-radio">
            <input type="radio" name="estado-radio" />
            <span className="ig-radio-mark"></span>
            Sin seleccionar
          </label>
          <label className="ig-radio">
            <input type="radio" name="estado-radio" defaultChecked />
            <span className="ig-radio-mark"></span>
            Seleccionado
          </label>
          <label className="ig-radio">
            <input type="radio" name="estado-radio2" disabled />
            <span className="ig-radio-mark"></span>
            Deshabilitado
          </label>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Switch/Toggle</h3>
        <div className="ig-space-y-2">
          <label className="ig-switch ig-switch-brand">
            <input type="checkbox" />
            <span className="ig-switch-track"></span>
            Off
          </label>
          <label className="ig-switch ig-switch-brand">
            <input type="checkbox" defaultChecked />
            <span className="ig-switch-track"></span>
            On
          </label>
          <label className="ig-switch ig-switch-brand">
            <input type="checkbox" disabled />
            <span className="ig-switch-track"></span>
            Deshabilitado
          </label>
        </div>
      </div>
    </div>
  </div>
);

export const EstadosSemanticos = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Estados Semánticos</h2>

    <div className="ig-grid ig-grid-cols-1 ig-md:ig-grid-cols-2 ig-gap-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border-l-4 ig-border-success">
        <h3 className="ig-font-semibold ig-text-success ig-mb-1">Éxito</h3>
        <p className="ig-text-body ig-text-sm">La operación se completó correctamente.</p>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border-l-4 ig-border-warning">
        <h3 className="ig-font-semibold ig-text-warning ig-mb-1">Advertencia</h3>
        <p className="ig-text-body ig-text-sm">Hay algo que requiere tu atención.</p>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border-l-4 ig-border-danger">
        <h3 className="ig-font-semibold ig-text-danger ig-mb-1">Error</h3>
        <p className="ig-text-body ig-text-sm">Algo salió mal, por favor intenta de nuevo.</p>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border-l-4 ig-border-info">
        <h3 className="ig-font-semibold ig-text-info ig-mb-1">Información</h3>
        <p className="ig-text-body ig-text-sm">Aquí hay información adicional.</p>
      </div>
    </div>
  </div>
);

export const EstadosDeValidacion = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Estados de Validación</h2>

    <form className="ig-bg-surface ig-p-6 ig-rounded-lg ig-border ig-border-default ig-max-w-md">
      <div className="ig-space-y-4">
        <div>
          <label className="ig-form-label">Email válido</label>
          <div className="ig-relative">
            <input
              type="email"
              className="ig-input ig-border-success ig-pr-10"
              defaultValue="usuario@ejemplo.com"
            />
            <span className="ig-absolute ig-right-3 ig-top-1/2 ig--translate-y-1/2 ig-text-success">
              ✓
            </span>
          </div>
          <span className="ig-text-sm ig-text-success ig-mt-1 ig-block">Email válido</span>
        </div>

        <div>
          <label className="ig-form-label">Email inválido</label>
          <div className="ig-relative">
            <input
              type="email"
              className="ig-input ig-border-danger ig-pr-10"
              defaultValue="email-invalido"
            />
            <span className="ig-absolute ig-right-3 ig-top-1/2 ig--translate-y-1/2 ig-text-danger">
              ✕
            </span>
          </div>
          <span className="ig-text-sm ig-text-danger ig-mt-1 ig-block">
            Por favor ingresa un email válido
          </span>
        </div>

        <div>
          <label className="ig-form-label">
            Contraseña
            <span className="ig-text-danger ig-ml-1">*</span>
          </label>
          <input
            type="password"
            className="ig-input ig-border-warning"
            defaultValue="123"
          />
          <span className="ig-text-sm ig-text-warning ig-mt-1 ig-block">
            La contraseña debe tener al menos 8 caracteres
          </span>
        </div>
      </div>
    </form>
  </div>
);

export const EstadosDeNavegacion = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Estados de Navegación</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-rounded-lg ig-border ig-border-default">
        <nav className="ig-flex ig-border-b ig-border-subtle">
          <a href="#" className="ig-px-4 ig-py-3 ig-text-brand ig-border-b-2 ig-border-brand ig-font-medium">
            Activo
          </a>
          <a href="#" className="ig-px-4 ig-py-3 ig-text-muted ig-hover:ig-text-body ig-hover:ig-bg-muted ig-transition-colors">
            Inactivo
          </a>
          <a href="#" className="ig-px-4 ig-py-3 ig-text-muted ig-hover:ig-text-body ig-hover:ig-bg-muted ig-transition-colors">
            Otro
          </a>
          <span className="ig-px-4 ig-py-3 ig-text-disabled ig-cursor-not-allowed">
            Deshabilitado
          </span>
        </nav>
      </div>

      <div className="ig-bg-surface ig-rounded-lg ig-border ig-border-default ig-w-48">
        <nav className="ig-p-2">
          <a href="#" className="ig-block ig-px-3 ig-py-2 ig-rounded ig-bg-brand ig-text-on-brand">
            Activo
          </a>
          <a href="#" className="ig-block ig-px-3 ig-py-2 ig-rounded ig-text-body ig-hover:ig-bg-muted ig-transition-colors">
            Link
          </a>
          <a href="#" className="ig-block ig-px-3 ig-py-2 ig-rounded ig-text-body ig-hover:ig-bg-muted ig-transition-colors">
            Otro link
          </a>
          <span className="ig-block ig-px-3 ig-py-2 ig-rounded ig-text-disabled ig-cursor-not-allowed">
            Deshabilitado
          </span>
        </nav>
      </div>
    </div>
  </div>
);
