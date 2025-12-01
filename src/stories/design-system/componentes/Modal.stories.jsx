import React from 'react';

export default {
  title: 'Componentes/Modal',
};

export const ModalBasico = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Modal Básico</h2>
    <p className="ig-text-body ig-mb-6">
      Los modales usan posición fija. Aquí se muestra su estructura estática.
    </p>

    <div className="ig-relative ig-h-96 ig-bg-muted ig-rounded-lg ig-overflow-hidden">
      {/* Backdrop simulado */}
      <div className="ig-absolute ig-inset-0 ig-bg-base/80"></div>

      {/* Modal */}
      <div className="ig-absolute ig-inset-0 ig-flex ig-items-center ig-justify-center ig-p-4">
        <div className="ig-modal ig-modal-md">
          <div className="ig-modal-header">
            <h3>Título del Modal</h3>
            <button className="ig-modal-close">&times;</button>
          </div>
          <div className="ig-modal-body">
            <p className="ig-text-body">
              Este es el contenido del modal. Puede contener cualquier tipo de contenido,
              incluyendo formularios, texto, imágenes, etc.
            </p>
          </div>
          <div className="ig-modal-footer">
            <button className="ig-btn ig-btn-outline">Cancelar</button>
            <button className="ig-btn ig-btn-brand">Aceptar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const TamanosDeModal = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tamaños de Modal</h2>

    <div className="ig-space-y-6">
      {[
        { clase: 'ig-modal-sm', nombre: 'Pequeño (sm)', ancho: 'max-width: 24rem' },
        { clase: 'ig-modal-md', nombre: 'Mediano (md)', ancho: 'max-width: 32rem' },
        { clase: 'ig-modal-lg', nombre: 'Grande (lg)', ancho: 'max-width: 48rem' },
        { clase: 'ig-modal-xl', nombre: 'Extra Grande (xl)', ancho: 'max-width: 64rem' },
      ].map(({ clase, nombre, ancho }) => (
        <div key={clase} className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
          <code className="ig-text-sm ig-text-muted ig-block ig-mb-3">{clase} - {ancho}</code>
          <div className={`ig-modal ${clase}`} style={{ position: 'relative' }}>
            <div className="ig-modal-header">
              <h3>{nombre}</h3>
              <button className="ig-modal-close">&times;</button>
            </div>
            <div className="ig-modal-body">
              <p className="ig-text-body">Contenido del modal {nombre.toLowerCase()}.</p>
            </div>
            <div className="ig-modal-footer">
              <button className="ig-btn ig-btn-outline ig-btn-sm">Cancelar</button>
              <button className="ig-btn ig-btn-brand ig-btn-sm">Aceptar</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const ModalConFormulario = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Modal con Formulario</h2>

    <div className="ig-relative ig-bg-muted ig-rounded-lg ig-p-4">
      <div className="ig-modal ig-modal-md" style={{ position: 'relative' }}>
        <div className="ig-modal-header">
          <h3>Crear nueva cuenta</h3>
          <button className="ig-modal-close">&times;</button>
        </div>
        <div className="ig-modal-body">
          <form className="ig-space-y-4">
            <div className="ig-grid ig-grid-cols-2 ig-gap-4">
              <div>
                <label className="ig-form-label">Nombre</label>
                <input type="text" className="ig-input" placeholder="Juan" />
              </div>
              <div>
                <label className="ig-form-label">Apellido</label>
                <input type="text" className="ig-input" placeholder="Pérez" />
              </div>
            </div>
            <div>
              <label className="ig-form-label">Email</label>
              <input type="email" className="ig-input" placeholder="juan@ejemplo.com" />
            </div>
            <div>
              <label className="ig-form-label">Contraseña</label>
              <input type="password" className="ig-input" placeholder="••••••••" />
            </div>
            <label className="ig-checkbox">
              <input type="checkbox" />
              <span className="ig-checkbox-mark"></span>
              Acepto los términos y condiciones
            </label>
          </form>
        </div>
        <div className="ig-modal-footer">
          <button className="ig-btn ig-btn-outline">Cancelar</button>
          <button className="ig-btn ig-btn-brand">Crear cuenta</button>
        </div>
      </div>
    </div>
  </div>
);

export const ModalDeConfirmacion = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Modal de Confirmación</h2>

    <div className="ig-grid ig-grid-cols-1 md:ig-grid-cols-2 ig-gap-6">
      {/* Confirmación de eliminar */}
      <div className="ig-bg-muted ig-rounded-lg ig-p-4">
        <div className="ig-modal ig-modal-sm" style={{ position: 'relative' }}>
          <div className="ig-modal-header">
            <h3>Eliminar elemento</h3>
            <button className="ig-modal-close">&times;</button>
          </div>
          <div className="ig-modal-body ig-text-center">
            <div className="ig-w-16 ig-h-16 ig-bg-danger/20 ig-rounded-full ig-flex ig-items-center ig-justify-center ig-mx-auto ig-mb-4">
              <span className="ig-text-3xl ig-text-danger">⚠</span>
            </div>
            <p className="ig-text-body">
              ¿Estás seguro de que deseas eliminar este elemento?
              Esta acción no se puede deshacer.
            </p>
          </div>
          <div className="ig-modal-footer ig-justify-center">
            <button className="ig-btn ig-btn-outline">Cancelar</button>
            <button className="ig-btn ig-btn-danger">Eliminar</button>
          </div>
        </div>
      </div>

      {/* Confirmación de éxito */}
      <div className="ig-bg-muted ig-rounded-lg ig-p-4">
        <div className="ig-modal ig-modal-sm" style={{ position: 'relative' }}>
          <div className="ig-modal-header">
            <h3>Operación exitosa</h3>
            <button className="ig-modal-close">&times;</button>
          </div>
          <div className="ig-modal-body ig-text-center">
            <div className="ig-w-16 ig-h-16 ig-bg-success/20 ig-rounded-full ig-flex ig-items-center ig-justify-center ig-mx-auto ig-mb-4">
              <span className="ig-text-3xl ig-text-success">✓</span>
            </div>
            <h4 className="ig-text-lg ig-font-semibold ig-text-heading ig-mb-2">¡Guardado!</h4>
            <p className="ig-text-body">
              Los cambios se han guardado correctamente.
            </p>
          </div>
          <div className="ig-modal-footer ig-justify-center">
            <button className="ig-btn ig-btn-success">Continuar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const DialogNativo = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Dialog Nativo HTML</h2>
    <p className="ig-text-body ig-mb-6">
      El elemento <code className="ig-bg-muted ig-px-1 ig-rounded">&lt;dialog&gt;</code> es
      semántico y accesible. Se puede usar con las mismas clases de modal.
    </p>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <pre className="ig-text-sm ig-text-body ig-bg-muted ig-p-4 ig-rounded ig-overflow-x-auto">
{`<dialog class="ig-modal ig-modal-md" open>
  <div class="ig-modal-header">
    <h3>Título</h3>
    <button class="ig-modal-close" onclick="this.closest('dialog').close()">
      &times;
    </button>
  </div>
  <div class="ig-modal-body">
    Contenido...
  </div>
  <div class="ig-modal-footer">
    <button class="ig-btn ig-btn-outline" onclick="this.closest('dialog').close()">
      Cerrar
    </button>
  </div>
</dialog>`}
      </pre>
    </div>
  </div>
);

export const ModalConScroll = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Modal con Scroll</h2>

    <div className="ig-bg-muted ig-rounded-lg ig-p-4">
      <div className="ig-modal ig-modal-md" style={{ position: 'relative', maxHeight: '400px' }}>
        <div className="ig-modal-header">
          <h3>Términos y Condiciones</h3>
          <button className="ig-modal-close">&times;</button>
        </div>
        <div className="ig-modal-body ig-overflow-y-auto" style={{ maxHeight: '250px' }}>
          <div className="ig-space-y-4">
            <h4 className="ig-font-semibold ig-text-heading">1. Introducción</h4>
            <p className="ig-text-body">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
              tempor incididunt ut labore et dolore magna aliqua.
            </p>
            <h4 className="ig-font-semibold ig-text-heading">2. Uso del Servicio</h4>
            <p className="ig-text-body">
              Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi
              ut aliquip ex ea commodo consequat.
            </p>
            <h4 className="ig-font-semibold ig-text-heading">3. Privacidad</h4>
            <p className="ig-text-body">
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
              dolore eu fugiat nulla pariatur.
            </p>
            <h4 className="ig-font-semibold ig-text-heading">4. Limitaciones</h4>
            <p className="ig-text-body">
              Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia
              deserunt mollit anim id est laborum.
            </p>
            <h4 className="ig-font-semibold ig-text-heading">5. Contacto</h4>
            <p className="ig-text-body">
              Si tienes preguntas sobre estos términos, contáctanos en support@ejemplo.com
            </p>
          </div>
        </div>
        <div className="ig-modal-footer">
          <button className="ig-btn ig-btn-outline">Rechazar</button>
          <button className="ig-btn ig-btn-brand">Aceptar</button>
        </div>
      </div>
    </div>
  </div>
);
