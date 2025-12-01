import React, { useState } from 'react';
import { Switch } from '../../../components/Switch/Switch';

export default {
  title: 'Componentes/Toggle',
  component: Switch,
  argTypes: {
    variant: {
      control: 'select',
      options: ['brand', 'secondary', 'success', 'warning', 'danger', 'info'],
    },
  },
};

export const ToggleBasico = () => {
  const [checked1, setChecked1] = useState(false);
  const [checked2, setChecked2] = useState(true);

  return (
    <div>
      <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Toggle / Switch</h2>

      <div className="ig-space-y-4">
        <Switch checked={checked1} onChange={(e) => setChecked1(e.target.checked)}>
          Opción desactivada
        </Switch>

        <Switch checked={checked2} onChange={(e) => setChecked2(e.target.checked)}>
          Opción activada
        </Switch>

        <Switch disabled>
          Deshabilitado (off)
        </Switch>

        <Switch checked disabled>
          Deshabilitado (on)
        </Switch>
      </div>
    </div>
  );
};

export const VariantesDeColor = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Variantes de Color</h2>

    <div className="ig-space-y-4">
      <Switch variant="brand" defaultChecked>
        Switch Brand (vitreus)
      </Switch>

      <Switch variant="secondary" defaultChecked>
        Switch Secondary (axis)
      </Switch>

      <Switch variant="success" defaultChecked>
        Switch Success (laurus)
      </Switch>

      <Switch variant="warning" defaultChecked>
        Switch Warning (rutilus)
      </Switch>

      <Switch variant="danger" defaultChecked>
        Switch Danger (malum)
      </Switch>

      <Switch variant="info" defaultChecked>
        Switch Info (axis)
      </Switch>
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
            <Switch variant="brand" defaultChecked />
          </div>

          <div className="ig-border-t ig-border-subtle ig-pt-4 ig-flex ig-justify-between ig-items-center">
            <div>
              <div className="ig-font-medium ig-text-body">Notificaciones push</div>
              <div className="ig-text-sm ig-text-muted">Alertas en tiempo real</div>
            </div>
            <Switch variant="brand" />
          </div>

          <div className="ig-border-t ig-border-subtle ig-pt-4 ig-flex ig-justify-between ig-items-center">
            <div>
              <div className="ig-font-medium ig-text-body">Modo silencioso</div>
              <div className="ig-text-sm ig-text-muted">Pausar todas las notificaciones</div>
            </div>
            <Switch variant="warning" />
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
            <Switch variant="success" defaultChecked />
          </div>

          <div className="ig-border-t ig-border-subtle ig-pt-4 ig-flex ig-justify-between ig-items-center">
            <div>
              <div className="ig-font-medium ig-text-body">Autenticación en dos pasos</div>
              <div className="ig-text-sm ig-text-muted">Mayor seguridad para tu cuenta</div>
            </div>
            <Switch variant="success" defaultChecked />
          </div>
        </div>
      </div>

      {/* Estado de servicio */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Estado del Servidor</h3>
        <div className="ig-flex ig-justify-between ig-items-center">
          <div>
            <div className="ig-font-medium ig-text-body">Servidor activo</div>
            <div className="ig-text-sm ig-text-success">En línea</div>
          </div>
          <Switch variant="success" defaultChecked />
        </div>
      </div>
    </div>
  </div>
);

export const SwitchEnLinea = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Switch en Línea</h2>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <p className="ig-text-body ig-flex ig-items-center ig-gap-2">
        Puedes activar el modo oscuro
        <Switch variant="brand" />
        en cualquier momento desde aquí.
      </p>
    </div>
  </div>
);

export const Playground = {
  args: {
    children: 'Switch de ejemplo',
    variant: 'brand',
    checked: false,
    disabled: false,
  },
};
