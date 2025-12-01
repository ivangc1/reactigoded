import React from 'react';

export default {
  title: 'Componentes/Toggle',
};

export const ToggleBasico = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Toggle / Switch</h2>

    <div className="ig-space-y-4">
      <label className="ig-switch">
        <input type="checkbox" />
        <span className="ig-switch-track"></span>
        Opción desactivada
      </label>

      <label className="ig-switch">
        <input type="checkbox" defaultChecked />
        <span className="ig-switch-track"></span>
        Opción activada
      </label>

      <label className="ig-switch">
        <input type="checkbox" disabled />
        <span className="ig-switch-track"></span>
        Deshabilitado (off)
      </label>

      <label className="ig-switch">
        <input type="checkbox" defaultChecked disabled />
        <span className="ig-switch-track"></span>
        Deshabilitado (on)
      </label>
    </div>
  </div>
);

export const VariantesDeColor = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Variantes de Color</h2>

    <div className="ig-space-y-4">
      <label className="ig-switch ig-switch-brand">
        <input type="checkbox" defaultChecked />
        <span className="ig-switch-track"></span>
        Switch Brand (vitreus)
      </label>

      <label className="ig-switch ig-switch-secondary">
        <input type="checkbox" defaultChecked />
        <span className="ig-switch-track"></span>
        Switch Secondary (axis)
      </label>

      <label className="ig-switch ig-switch-success">
        <input type="checkbox" defaultChecked />
        <span className="ig-switch-track"></span>
        Switch Success (laurus)
      </label>

      <label className="ig-switch ig-switch-warning">
        <input type="checkbox" defaultChecked />
        <span className="ig-switch-track"></span>
        Switch Warning (rutilus)
      </label>

      <label className="ig-switch ig-switch-danger">
        <input type="checkbox" defaultChecked />
        <span className="ig-switch-track"></span>
        Switch Danger (malum)
      </label>

      <label className="ig-switch ig-switch-info">
        <input type="checkbox" defaultChecked />
        <span className="ig-switch-track"></span>
        Switch Info (axis)
      </label>
    </div>
  </div>
);

export const CasosDeUso = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Casos de Uso</h2>

    <div className="ig-space-y-6">
      {/* Panel de ajustes */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Configuración de Notificaciones</h3>
        <div className="ig-space-y-4">
          <div className="ig-flex ig-justify-between ig-items-center">
            <div>
              <div className="ig-font-medium ig-text-body">Notificaciones por email</div>
              <div className="ig-text-sm ig-text-muted">Recibe actualizaciones en tu correo</div>
            </div>
            <label className="ig-switch ig-switch-brand">
              <input type="checkbox" defaultChecked />
              <span className="ig-switch-track"></span>
            </label>
          </div>

          <div className="ig-border-t ig-border-subtle ig-pt-4 ig-flex ig-justify-between ig-items-center">
            <div>
              <div className="ig-font-medium ig-text-body">Notificaciones push</div>
              <div className="ig-text-sm ig-text-muted">Alertas en tiempo real</div>
            </div>
            <label className="ig-switch ig-switch-brand">
              <input type="checkbox" />
              <span className="ig-switch-track"></span>
            </label>
          </div>

          <div className="ig-border-t ig-border-subtle ig-pt-4 ig-flex ig-justify-between ig-items-center">
            <div>
              <div className="ig-font-medium ig-text-body">Modo silencioso</div>
              <div className="ig-text-sm ig-text-muted">Pausar todas las notificaciones</div>
            </div>
            <label className="ig-switch ig-switch-warning">
              <input type="checkbox" />
              <span className="ig-switch-track"></span>
            </label>
          </div>
        </div>
      </div>

      {/* Opciones de privacidad */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Privacidad</h3>
        <div className="ig-space-y-4">
          <div className="ig-flex ig-justify-between ig-items-center">
            <div>
              <div className="ig-font-medium ig-text-body">Perfil público</div>
              <div className="ig-text-sm ig-text-muted">Visible para todos los usuarios</div>
            </div>
            <label className="ig-switch ig-switch-success">
              <input type="checkbox" defaultChecked />
              <span className="ig-switch-track"></span>
            </label>
          </div>

          <div className="ig-border-t ig-border-subtle ig-pt-4 ig-flex ig-justify-between ig-items-center">
            <div>
              <div className="ig-font-medium ig-text-body">Autenticación en dos pasos</div>
              <div className="ig-text-sm ig-text-muted">Mayor seguridad para tu cuenta</div>
            </div>
            <label className="ig-switch ig-switch-success">
              <input type="checkbox" defaultChecked />
              <span className="ig-switch-track"></span>
            </label>
          </div>
        </div>
      </div>

      {/* Estado de servicio */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Estado del Servidor</h3>
        <div className="ig-flex ig-justify-between ig-items-center">
          <div>
            <div className="ig-font-medium ig-text-body">Servidor activo</div>
            <div className="ig-text-sm ig-text-success">● En línea</div>
          </div>
          <label className="ig-switch ig-switch-success">
            <input type="checkbox" defaultChecked />
            <span className="ig-switch-track"></span>
          </label>
        </div>
      </div>
    </div>
  </div>
);

export const SwitchEnLinea = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Switch en Línea</h2>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <p className="ig-text-body">
        Puedes activar el modo oscuro{' '}
        <label className="ig-switch ig-switch-brand" style={{ display: 'inline-flex', verticalAlign: 'middle' }}>
          <input type="checkbox" />
          <span className="ig-switch-track"></span>
        </label>
        {' '}en cualquier momento desde aquí.
      </p>
    </div>
  </div>
);
