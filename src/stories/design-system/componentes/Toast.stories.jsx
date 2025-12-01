import React from 'react';
import { Toast, ToastContainer } from '../../../components/Toast/Toast';
import { Button } from '../../../components/Button/Button';

export default {
  title: 'Componentes/Toast',
  component: Toast,
  argTypes: {
    variant: {
      control: 'select',
      options: ['success', 'warning', 'danger', 'info', 'brand', 'secondary'],
    },
  },
};

export const ToastBasico = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Toast Básico</h2>
    <p className="ig-text-body ig-mb-6">
      Los toasts muestran mensajes temporales. Normalmente se posicionan en una esquina de la pantalla.
    </p>

    <div className="ig-space-y-4 ig-max-w-sm">
      <Toast title="Notificación" onClose={() => {}}>
        Este es un mensaje de toast básico.
      </Toast>
    </div>
  </div>
);

export const VariantesDeToast = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Variantes de Toast</h2>

    <div className="ig-space-y-4 ig-max-w-sm">
      <Toast variant="success" icon="✓" title="Éxito" onClose={() => {}}>
        La operación se completó correctamente.
      </Toast>

      <Toast variant="warning" icon="⚠" title="Advertencia" onClose={() => {}}>
        Hay algo que deberías revisar.
      </Toast>

      <Toast variant="danger" icon="✕" title="Error" onClose={() => {}}>
        Algo salió mal. Intenta de nuevo.
      </Toast>

      <Toast variant="info" icon="ℹ" title="Información" onClose={() => {}}>
        Aquí hay información importante.
      </Toast>

      <Toast variant="brand" icon="★" title="Brand" onClose={() => {}}>
        Mensaje con estilo brand.
      </Toast>

      <Toast variant="secondary" icon="◆" title="Secondary" onClose={() => {}}>
        Mensaje con estilo secondary.
      </Toast>
    </div>
  </div>
);

export const ToastSimple = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Toast Simple (Solo Mensaje)</h2>

    <div className="ig-space-y-4 ig-max-w-sm">
      <Toast variant="success" icon="✓" onClose={() => {}}>
        Guardado correctamente
      </Toast>

      <Toast variant="danger" icon="✕" onClose={() => {}}>
        Error al guardar
      </Toast>

      <Toast variant="info" icon="ℹ">
        Copiado al portapapeles
      </Toast>
    </div>
  </div>
);

export const PosicionesToast = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Posiciones de Toast</h2>
    <p className="ig-text-body ig-mb-6">
      Usa <code className="ig-bg-muted ig-px-1 ig-rounded">position</code> en ToastContainer.
    </p>

    <div className="ig-relative ig-h-80 ig-bg-muted ig-rounded-lg ig-border ig-border-default">
      {/* Top Right */}
      <div className="ig-absolute ig-top-4 ig-right-4">
        <Toast variant="success" className="ig-w-48">
          <span className="ig-text-sm">Top Right</span>
        </Toast>
      </div>

      {/* Top Left */}
      <div className="ig-absolute ig-top-4 ig-left-4">
        <Toast variant="info" className="ig-w-48">
          <span className="ig-text-sm">Top Left</span>
        </Toast>
      </div>

      {/* Top Center */}
      <div className="ig-absolute ig-top-4 ig-left-1/2 ig--translate-x-1/2">
        <Toast variant="warning" className="ig-w-48">
          <span className="ig-text-sm">Top Center</span>
        </Toast>
      </div>

      {/* Bottom Right */}
      <div className="ig-absolute ig-bottom-4 ig-right-4">
        <Toast variant="brand" className="ig-w-48">
          <span className="ig-text-sm">Bottom Right</span>
        </Toast>
      </div>

      {/* Bottom Left */}
      <div className="ig-absolute ig-bottom-4 ig-left-4">
        <Toast variant="secondary" className="ig-w-48">
          <span className="ig-text-sm">Bottom Left</span>
        </Toast>
      </div>

      {/* Bottom Center */}
      <div className="ig-absolute ig-bottom-4 ig-left-1/2 ig--translate-x-1/2">
        <Toast variant="danger" className="ig-w-48">
          <span className="ig-text-sm">Bottom Center</span>
        </Toast>
      </div>
    </div>
  </div>
);

export const ToastConAccion = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Toast con Acción</h2>

    <div className="ig-space-y-4 ig-max-w-sm">
      <div className="ig-toast">
        <div className="ig-toast-content">
          <div className="ig-toast-title">Archivo eliminado</div>
          <div className="ig-toast-message">El archivo ha sido movido a la papelera.</div>
          <Button variant="outline" size="sm" className="ig-mt-2">Deshacer</Button>
        </div>
        <button className="ig-toast-close">&times;</button>
      </div>

      <div className="ig-toast ig-toast-info">
        <div className="ig-toast-icon">📧</div>
        <div className="ig-toast-content">
          <div className="ig-toast-title">Nuevo mensaje</div>
          <div className="ig-toast-message">Juan te ha enviado un mensaje.</div>
          <div className="ig-flex ig-gap-2 ig-mt-2">
            <Button variant="brand" size="sm">Ver</Button>
            <Button variant="outline" size="sm">Ignorar</Button>
          </div>
        </div>
        <button className="ig-toast-close">&times;</button>
      </div>
    </div>
  </div>
);

export const ToastApilados = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Toasts Apilados</h2>
    <p className="ig-text-body ig-mb-6">
      Los toasts se apilan verticalmente en el contenedor.
    </p>

    <div className="ig-relative ig-h-96 ig-bg-muted ig-rounded-lg ig-border ig-border-default ig-overflow-hidden">
      <div className="ig-absolute ig-top-4 ig-right-4 ig-space-y-3" style={{ width: '320px' }}>
        <Toast variant="success" icon="✓" title="Guardado" onClose={() => {}}>
          Cambios guardados correctamente.
        </Toast>

        <Toast variant="info" icon="ℹ" title="Sincronizando" onClose={() => {}}>
          Actualizando datos...
        </Toast>

        <Toast variant="warning" icon="⚠" title="Conexión lenta" onClose={() => {}}>
          Tu conexión parece inestable.
        </Toast>
      </div>
    </div>
  </div>
);

export const EstructuraContainer = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Estructura del Contenedor</h2>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Uso del componente Toast</h3>
      <pre className="ig-text-sm ig-text-body ig-bg-muted ig-p-4 ig-rounded ig-overflow-x-auto">
{`import { Toast, ToastContainer } from '../components/Toast/Toast';

// Toast individual
<Toast
  variant="success"
  icon="✓"
  title="Éxito"
  onClose={() => handleClose()}
>
  Mensaje del toast
</Toast>

// Contenedor de toasts
<ToastContainer position="top-right">
  {toasts.map(toast => (
    <Toast key={toast.id} {...toast} />
  ))}
</ToastContainer>`}
      </pre>

      <h3 className="ig-font-semibold ig-text-heading ig-mt-6 ig-mb-4">Variantes disponibles</h3>
      <div className="ig-flex ig-flex-wrap ig-gap-2">
        {['success', 'warning', 'danger', 'info', 'brand', 'secondary'].map((v) => (
          <code key={v} className="ig-bg-muted ig-px-2 ig-py-1 ig-rounded ig-text-sm">{v}</code>
        ))}
      </div>
    </div>
  </div>
);

export const Playground = {
  args: {
    variant: 'info',
    icon: 'ℹ',
    title: 'Título del Toast',
    children: 'Este es el mensaje del toast.',
    onClose: undefined,
  },
};
