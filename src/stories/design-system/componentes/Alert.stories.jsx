import React from 'react';

export default {
  title: 'Componentes/Alert',
};

export const Variantes = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Variantes de Alert</h2>

    <div className="ig-space-y-4">
      <div className="ig-alert ig-alert-success">
        <span className="ig-alert-icon">✓</span>
        <div>
          <div className="ig-alert-title">¡Operación exitosa!</div>
          <div className="ig-alert-description">Los cambios se han guardado correctamente.</div>
        </div>
      </div>

      <div className="ig-alert ig-alert-warning">
        <span className="ig-alert-icon">⚠</span>
        <div>
          <div className="ig-alert-title">Advertencia</div>
          <div className="ig-alert-description">Tu sesión expirará en 5 minutos.</div>
        </div>
      </div>

      <div className="ig-alert ig-alert-danger">
        <span className="ig-alert-icon">✕</span>
        <div>
          <div className="ig-alert-title">Error</div>
          <div className="ig-alert-description">No se pudo completar la operación. Por favor, intenta de nuevo.</div>
        </div>
      </div>

      <div className="ig-alert ig-alert-info">
        <span className="ig-alert-icon">ℹ</span>
        <div>
          <div className="ig-alert-title">Información</div>
          <div className="ig-alert-description">Hay actualizaciones disponibles para tu cuenta.</div>
        </div>
      </div>
    </div>
  </div>
);

export const AlertSimple = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Alert Simple (solo descripción)</h2>

    <div className="ig-space-y-4">
      <div className="ig-alert ig-alert-success">
        <span className="ig-alert-icon">✓</span>
        <div className="ig-alert-description">Archivo subido correctamente.</div>
      </div>

      <div className="ig-alert ig-alert-warning">
        <span className="ig-alert-icon">⚠</span>
        <div className="ig-alert-description">Recuerda guardar tus cambios antes de salir.</div>
      </div>

      <div className="ig-alert ig-alert-danger">
        <span className="ig-alert-icon">✕</span>
        <div className="ig-alert-description">Error de conexión. Verifica tu red.</div>
      </div>

      <div className="ig-alert ig-alert-info">
        <span className="ig-alert-icon">ℹ</span>
        <div className="ig-alert-description">Nueva versión disponible: v2.5.0</div>
      </div>
    </div>
  </div>
);

export const AlertConBotonCerrar = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Alert con Botón de Cerrar</h2>

    <div className="ig-space-y-4">
      <div className="ig-alert ig-alert-success">
        <span className="ig-alert-icon">✓</span>
        <div className="ig-flex-1">
          <div className="ig-alert-title">¡Cuenta creada!</div>
          <div className="ig-alert-description">Tu cuenta ha sido creada exitosamente.</div>
        </div>
        <button className="ig-alert-close">×</button>
      </div>

      <div className="ig-alert ig-alert-warning">
        <span className="ig-alert-icon">⚠</span>
        <div className="ig-flex-1">
          <div className="ig-alert-description">Este mensaje puede ser descartado.</div>
        </div>
        <button className="ig-alert-close">×</button>
      </div>
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
            <button className="ig-btn ig-btn-secondary ig-btn-sm">Actualizar ahora</button>
            <button className="ig-btn ig-btn-ghost ig-btn-sm">Más tarde</button>
          </div>
        </div>
      </div>

      <div className="ig-alert ig-alert-danger">
        <span className="ig-alert-icon">✕</span>
        <div className="ig-flex-1">
          <div className="ig-alert-title">Error de sincronización</div>
          <div className="ig-alert-description">No se pudieron sincronizar los datos con el servidor.</div>
          <div className="ig-flex ig-gap-2 ig-mt-3">
            <button className="ig-btn ig-btn-danger ig-btn-sm">Reintentar</button>
            <button className="ig-btn ig-btn-ghost ig-btn-sm">Ver detalles</button>
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
      {/* Confirmación de formulario */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Después de enviar formulario</h3>
        <div className="ig-alert ig-alert-success">
          <span className="ig-alert-icon">✓</span>
          <div>
            <div className="ig-alert-title">¡Mensaje enviado!</div>
            <div className="ig-alert-description">Te responderemos en un plazo de 24-48 horas.</div>
          </div>
        </div>
      </div>

      {/* Error de autenticación */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Error de login</h3>
        <div className="ig-alert ig-alert-danger">
          <span className="ig-alert-icon">✕</span>
          <div className="ig-alert-description">
            Email o contraseña incorrectos. ¿<a href="#" className="ig-underline">Olvidaste tu contraseña</a>?
          </div>
        </div>
      </div>

      {/* Banner informativo */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Banner de mantenimiento</h3>
        <div className="ig-alert ig-alert-warning">
          <span className="ig-alert-icon">⚠</span>
          <div className="ig-flex-1">
            <div className="ig-alert-title">Mantenimiento programado</div>
            <div className="ig-alert-description">
              El sistema estará en mantenimiento el sábado de 2:00 a 6:00 AM (UTC).
            </div>
          </div>
          <button className="ig-alert-close">×</button>
        </div>
      </div>

      {/* Notificación de funcionalidad */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Nueva funcionalidad</h3>
        <div className="ig-alert ig-alert-info">
          <span className="ig-alert-icon">🎉</span>
          <div className="ig-flex-1">
            <div className="ig-alert-title">¡Nueva función disponible!</div>
            <div className="ig-alert-description">
              Ahora puedes exportar tus datos a CSV. <a href="#" className="ig-underline">Pruébalo</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
