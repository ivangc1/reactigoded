import React from 'react';

export default {
  title: 'Componentes/Toast',
};

export const ToastBasico = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Toast Básico</h2>
    <p className="ig-text-body ig-mb-6">
      Los toasts muestran mensajes temporales. Normalmente se posicionan en una esquina de la pantalla.
    </p>

    <div className="ig-space-y-4 ig-max-w-sm">
      <div className="ig-toast">
        <div className="ig-toast-content">
          <div className="ig-toast-title">Notificación</div>
          <div className="ig-toast-message">Este es un mensaje de toast básico.</div>
        </div>
        <button className="ig-toast-close">&times;</button>
      </div>
    </div>
  </div>
);

export const VariantesDeToast = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Variantes de Toast</h2>

    <div className="ig-space-y-4 ig-max-w-sm">
      <div className="ig-toast ig-toast-success">
        <div className="ig-toast-icon">✓</div>
        <div className="ig-toast-content">
          <div className="ig-toast-title">Éxito</div>
          <div className="ig-toast-message">La operación se completó correctamente.</div>
        </div>
        <button className="ig-toast-close">&times;</button>
      </div>

      <div className="ig-toast ig-toast-warning">
        <div className="ig-toast-icon">⚠</div>
        <div className="ig-toast-content">
          <div className="ig-toast-title">Advertencia</div>
          <div className="ig-toast-message">Hay algo que deberías revisar.</div>
        </div>
        <button className="ig-toast-close">&times;</button>
      </div>

      <div className="ig-toast ig-toast-danger">
        <div className="ig-toast-icon">✕</div>
        <div className="ig-toast-content">
          <div className="ig-toast-title">Error</div>
          <div className="ig-toast-message">Algo salió mal. Intenta de nuevo.</div>
        </div>
        <button className="ig-toast-close">&times;</button>
      </div>

      <div className="ig-toast ig-toast-info">
        <div className="ig-toast-icon">ℹ</div>
        <div className="ig-toast-content">
          <div className="ig-toast-title">Información</div>
          <div className="ig-toast-message">Aquí hay información importante.</div>
        </div>
        <button className="ig-toast-close">&times;</button>
      </div>

      <div className="ig-toast ig-toast-brand">
        <div className="ig-toast-icon">★</div>
        <div className="ig-toast-content">
          <div className="ig-toast-title">Brand</div>
          <div className="ig-toast-message">Mensaje con estilo brand.</div>
        </div>
        <button className="ig-toast-close">&times;</button>
      </div>
    </div>
  </div>
);

export const ToastSimple = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Toast Simple (Solo Mensaje)</h2>

    <div className="ig-space-y-4 ig-max-w-sm">
      <div className="ig-toast ig-toast-success">
        <div className="ig-toast-icon">✓</div>
        <div className="ig-toast-content">
          <div className="ig-toast-message">Guardado correctamente</div>
        </div>
        <button className="ig-toast-close">&times;</button>
      </div>

      <div className="ig-toast ig-toast-danger">
        <div className="ig-toast-icon">✕</div>
        <div className="ig-toast-content">
          <div className="ig-toast-message">Error al guardar</div>
        </div>
        <button className="ig-toast-close">&times;</button>
      </div>

      <div className="ig-toast ig-toast-info">
        <div className="ig-toast-icon">ℹ</div>
        <div className="ig-toast-content">
          <div className="ig-toast-message">Copiado al portapapeles</div>
        </div>
      </div>
    </div>
  </div>
);

export const PosicionesToast = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Posiciones de Toast</h2>
    <p className="ig-text-body ig-mb-6">
      Usa <code className="ig-bg-muted ig-px-1 ig-rounded">ig-toast-container</code> con clases de posición.
    </p>

    <div className="ig-relative ig-h-80 ig-bg-muted ig-rounded-lg ig-border ig-border-default">
      {/* Top Right */}
      <div className="ig-absolute ig-top-4 ig-right-4">
        <div className="ig-toast ig-toast-success" style={{ width: '200px' }}>
          <div className="ig-toast-content">
            <div className="ig-toast-message ig-text-sm">Top Right</div>
          </div>
        </div>
      </div>

      {/* Top Left */}
      <div className="ig-absolute ig-top-4 ig-left-4">
        <div className="ig-toast ig-toast-info" style={{ width: '200px' }}>
          <div className="ig-toast-content">
            <div className="ig-toast-message ig-text-sm">Top Left</div>
          </div>
        </div>
      </div>

      {/* Top Center */}
      <div className="ig-absolute ig-top-4 ig-left-1/2 ig--translate-x-1/2">
        <div className="ig-toast ig-toast-warning" style={{ width: '200px' }}>
          <div className="ig-toast-content">
            <div className="ig-toast-message ig-text-sm">Top Center</div>
          </div>
        </div>
      </div>

      {/* Bottom Right */}
      <div className="ig-absolute ig-bottom-4 ig-right-4">
        <div className="ig-toast ig-toast-brand" style={{ width: '200px' }}>
          <div className="ig-toast-content">
            <div className="ig-toast-message ig-text-sm">Bottom Right</div>
          </div>
        </div>
      </div>

      {/* Bottom Left */}
      <div className="ig-absolute ig-bottom-4 ig-left-4">
        <div className="ig-toast ig-toast-secondary" style={{ width: '200px' }}>
          <div className="ig-toast-content">
            <div className="ig-toast-message ig-text-sm">Bottom Left</div>
          </div>
        </div>
      </div>

      {/* Bottom Center */}
      <div className="ig-absolute ig-bottom-4 ig-left-1/2 ig--translate-x-1/2">
        <div className="ig-toast ig-toast-danger" style={{ width: '200px' }}>
          <div className="ig-toast-content">
            <div className="ig-toast-message ig-text-sm">Bottom Center</div>
          </div>
        </div>
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
          <button className="ig-btn ig-btn-sm ig-btn-outline ig-mt-2">Deshacer</button>
        </div>
        <button className="ig-toast-close">&times;</button>
      </div>

      <div className="ig-toast ig-toast-info">
        <div className="ig-toast-icon">📧</div>
        <div className="ig-toast-content">
          <div className="ig-toast-title">Nuevo mensaje</div>
          <div className="ig-toast-message">Juan te ha enviado un mensaje.</div>
          <div className="ig-flex ig-gap-2 ig-mt-2">
            <button className="ig-btn ig-btn-sm ig-btn-brand">Ver</button>
            <button className="ig-btn ig-btn-sm ig-btn-outline">Ignorar</button>
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
      {/* Simulación de toast container */}
      <div className="ig-absolute ig-top-4 ig-right-4 ig-space-y-3" style={{ width: '320px' }}>
        <div className="ig-toast ig-toast-success ig-animate-slide-in-right">
          <div className="ig-toast-icon">✓</div>
          <div className="ig-toast-content">
            <div className="ig-toast-title">Guardado</div>
            <div className="ig-toast-message">Cambios guardados correctamente.</div>
          </div>
          <button className="ig-toast-close">&times;</button>
        </div>

        <div className="ig-toast ig-toast-info ig-animate-slide-in-right">
          <div className="ig-toast-icon">ℹ</div>
          <div className="ig-toast-content">
            <div className="ig-toast-title">Sincronizando</div>
            <div className="ig-toast-message">Actualizando datos...</div>
          </div>
          <button className="ig-toast-close">&times;</button>
        </div>

        <div className="ig-toast ig-toast-warning ig-animate-slide-in-right">
          <div className="ig-toast-icon">⚠</div>
          <div className="ig-toast-content">
            <div className="ig-toast-title">Conexión lenta</div>
            <div className="ig-toast-message">Tu conexión parece inestable.</div>
          </div>
          <button className="ig-toast-close">&times;</button>
        </div>
      </div>
    </div>
  </div>
);

export const EstructuraContainer = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Estructura del Contenedor</h2>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Clases de posición</h3>
      <pre className="ig-text-sm ig-text-body ig-bg-muted ig-p-4 ig-rounded ig-overflow-x-auto">
{`<!-- Contenedor fijo en la pantalla -->
<div class="ig-toast-container ig-toast-top-right">
  <div class="ig-toast ig-toast-success">
    ...
  </div>
</div>

<!-- Posiciones disponibles -->
ig-toast-top-right
ig-toast-top-left
ig-toast-top-center
ig-toast-bottom-right
ig-toast-bottom-left
ig-toast-bottom-center`}
      </pre>

      <h3 className="ig-font-semibold ig-text-heading ig-mt-6 ig-mb-4">Estructura de un Toast</h3>
      <pre className="ig-text-sm ig-text-body ig-bg-muted ig-p-4 ig-rounded ig-overflow-x-auto">
{`<div class="ig-toast ig-toast-success">
  <div class="ig-toast-icon">✓</div>
  <div class="ig-toast-content">
    <div class="ig-toast-title">Título</div>
    <div class="ig-toast-message">Mensaje</div>
  </div>
  <button class="ig-toast-close">&times;</button>
</div>`}
      </pre>
    </div>
  </div>
);
