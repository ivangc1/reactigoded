import React from 'react';
import { Alert } from '../../../components/Alert/Alert';
import { Button } from '../../../components/Button/Button';

export default {
  title: 'Componentes/Alert',
  component: Alert,
  argTypes: {
    variant: {
      control: 'select',
      options: ['success', 'warning', 'danger', 'info', 'brand', 'secondary'],
    },
  },
};

export const Variantes = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Variantes de Alert</h2>

    <div className="ig-space-y-4">
      <Alert variant="success" icon="✓" title="¡Operación exitosa!">
        Los cambios se han guardado correctamente.
      </Alert>

      <Alert variant="warning" icon="⚠" title="Advertencia">
        Tu sesión expirará en 5 minutos.
      </Alert>

      <Alert variant="danger" icon="✕" title="Error">
        No se pudo completar la operación. Por favor, intenta de nuevo.
      </Alert>

      <Alert variant="info" icon="ℹ" title="Información">
        Hay actualizaciones disponibles para tu cuenta.
      </Alert>

      <Alert variant="brand" icon="★" title="Brand">
        Mensaje con estilo brand.
      </Alert>

      <Alert variant="secondary" icon="◆" title="Secondary">
        Mensaje con estilo secondary.
      </Alert>
    </div>
  </div>
);

export const AlertSimple = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Alert Simple (solo descripción)</h2>

    <div className="ig-space-y-4">
      <Alert variant="success" icon="✓">
        Archivo subido correctamente.
      </Alert>

      <Alert variant="warning" icon="⚠">
        Recuerda guardar tus cambios antes de salir.
      </Alert>

      <Alert variant="danger" icon="✕">
        Error de conexión. Verifica tu red.
      </Alert>

      <Alert variant="info" icon="ℹ">
        Nueva versión disponible: v2.5.0
      </Alert>
    </div>
  </div>
);

export const AlertConBotonCerrar = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Alert con Botón de Cerrar</h2>

    <div className="ig-space-y-4">
      <Alert
        variant="success"
        icon="✓"
        title="¡Cuenta creada!"
        onClose={() => alert('Cerrado')}
      >
        Tu cuenta ha sido creada exitosamente.
      </Alert>

      <Alert
        variant="warning"
        icon="⚠"
        onClose={() => alert('Cerrado')}
      >
        Este mensaje puede ser descartado.
      </Alert>
    </div>
  </div>
);

export const AlertConAcciones = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Alert con Acciones</h2>

    <div className="ig-space-y-4">
      <div className="ig-alert ig-alert-info">
        <span className="ig-alert-icon">ℹ</span>
        <div className="ig-flex-1">
          <div className="ig-alert-title">Nueva actualización disponible</div>
          <div className="ig-alert-description">Hay una nueva versión del sistema. ¿Deseas actualizar ahora?</div>
          <div className="ig-flex ig-gap-2 ig-mt-3">
            <Button variant="secondary" size="sm">Actualizar ahora</Button>
            <Button variant="ghost" size="sm">Más tarde</Button>
          </div>
        </div>
      </div>

      <div className="ig-alert ig-alert-danger">
        <span className="ig-alert-icon">✕</span>
        <div className="ig-flex-1">
          <div className="ig-alert-title">Error de sincronización</div>
          <div className="ig-alert-description">No se pudieron sincronizar los datos con el servidor.</div>
          <div className="ig-flex ig-gap-2 ig-mt-3">
            <Button variant="danger" size="sm">Reintentar</Button>
            <Button variant="ghost" size="sm">Ver detalles</Button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const AlertConLista = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Alert con Lista de Errores</h2>

    <div className="ig-alert ig-alert-danger">
      <span className="ig-alert-icon">✕</span>
      <div>
        <div className="ig-alert-title">Por favor corrige los siguientes errores:</div>
        <ul className="ig-list-disc ig-list-inside ig-mt-2 ig-space-y-1 ig-text-sm">
          <li>El email no es válido</li>
          <li>La contraseña debe tener al menos 8 caracteres</li>
          <li>Debes aceptar los términos y condiciones</li>
        </ul>
      </div>
    </div>
  </div>
);

export const CasosDeUso = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Casos de Uso</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Después de enviar formulario</h3>
        <Alert variant="success" icon="✓" title="¡Mensaje enviado!">
          Te responderemos en un plazo de 24-48 horas.
        </Alert>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Error de login</h3>
        <Alert variant="danger" icon="✕">
          Email o contraseña incorrectos. ¿<a href="#" className="ig-underline">Olvidaste tu contraseña</a>?
        </Alert>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Banner de mantenimiento</h3>
        <Alert
          variant="warning"
          icon="⚠"
          title="Mantenimiento programado"
          onClose={() => {}}
        >
          El sistema estará en mantenimiento el sábado de 2:00 a 6:00 AM (UTC).
        </Alert>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Nueva funcionalidad</h3>
        <Alert variant="info" icon="🎉" title="¡Nueva función disponible!">
          Ahora puedes exportar tus datos a CSV. <a href="#" className="ig-underline">Pruébalo</a>
        </Alert>
      </div>
    </div>
  </div>
);

export const Playground = {
  args: {
    variant: 'info',
    icon: 'ℹ',
    title: 'Título del alert',
    children: 'Este es el contenido descriptivo del alert.',
    onClose: undefined,
  },
};
