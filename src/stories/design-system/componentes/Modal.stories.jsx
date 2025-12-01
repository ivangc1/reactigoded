import React, { useState } from 'react';
import { Modal } from '../../../components/Modal/Modal';
import { Button } from '../../../components/Button/Button';
import { Input, Label } from '../../../components/Input/Input';
import { Checkbox } from '../../../components/Checkbox/Checkbox';

export default {
  title: 'Componentes/Modal',
  component: Modal,
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', 'full'],
    },
  },
};

export const ModalInteractivo = () => {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Modal Interactivo</h2>

      <Button variant="brand" onClick={() => setOpen(true)}>
        Abrir Modal
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Título del Modal"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="brand" onClick={() => setOpen(false)}>Aceptar</Button>
          </>
        }
      >
        <p className="ig-text-body">
          Este es el contenido del modal. Puede contener cualquier tipo de contenido,
          incluyendo formularios, texto, imágenes, etc.
        </p>
      </Modal>
    </div>
  );
};

export const ModalBasico = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Modal Básico (Estático)</h2>
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
            <Button variant="outline">Cancelar</Button>
            <Button variant="brand">Aceptar</Button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const TamanosDeModal = () => {
  const [openSize, setOpenSize] = useState(null);

  return (
    <div>
      <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tamaños de Modal</h2>

      <div className="ig-flex ig-flex-wrap ig-gap-4 ig-mb-6">
        {['sm', 'md', 'lg', 'xl'].map((size) => (
          <Button key={size} variant="outline" onClick={() => setOpenSize(size)}>
            Modal {size.toUpperCase()}
          </Button>
        ))}
      </div>

      {['sm', 'md', 'lg', 'xl'].map((size) => (
        <Modal
          key={size}
          open={openSize === size}
          onClose={() => setOpenSize(null)}
          size={size}
          title={`Modal ${size.toUpperCase()}`}
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setOpenSize(null)}>Cancelar</Button>
              <Button variant="brand" size="sm" onClick={() => setOpenSize(null)}>Aceptar</Button>
            </>
          }
        >
          <p className="ig-text-body">Contenido del modal tamaño {size}.</p>
        </Modal>
      ))}
    </div>
  );
};

export const ModalConFormulario = () => {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Modal con Formulario</h2>

      <Button variant="brand" onClick={() => setOpen(true)}>
        Crear cuenta
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Crear nueva cuenta"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="brand" onClick={() => setOpen(false)}>Crear cuenta</Button>
          </>
        }
      >
        <form className="ig-space-y-4">
          <div className="ig-grid ig-grid-cols-2 ig-gap-4">
            <div>
              <Label>Nombre</Label>
              <Input placeholder="Juan" />
            </div>
            <div>
              <Label>Apellido</Label>
              <Input placeholder="Pérez" />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" placeholder="juan@ejemplo.com" />
          </div>
          <div>
            <Label>Contraseña</Label>
            <Input type="password" placeholder="••••••••" />
          </div>
          <Checkbox>
            Acepto los términos y condiciones
          </Checkbox>
        </form>
      </Modal>
    </div>
  );
};

export const ModalDeConfirmacion = () => {
  const [openDelete, setOpenDelete] = useState(false);
  const [openSuccess, setOpenSuccess] = useState(false);

  return (
    <div>
      <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Modal de Confirmación</h2>

      <div className="ig-flex ig-gap-4">
        <Button variant="danger" onClick={() => setOpenDelete(true)}>
          Eliminar elemento
        </Button>
        <Button variant="success" onClick={() => setOpenSuccess(true)}>
          Mostrar éxito
        </Button>
      </div>

      {/* Modal de eliminar */}
      <Modal
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        size="sm"
        title="Eliminar elemento"
        footer={
          <div className="ig-flex ig-justify-center ig-gap-3">
            <Button variant="outline" onClick={() => setOpenDelete(false)}>Cancelar</Button>
            <Button variant="danger" onClick={() => setOpenDelete(false)}>Eliminar</Button>
          </div>
        }
      >
        <div className="ig-text-center">
          <div className="ig-w-16 ig-h-16 ig-bg-danger/20 ig-rounded-full ig-flex ig-items-center ig-justify-center ig-mx-auto ig-mb-4">
            <span className="ig-text-3xl ig-text-danger">⚠</span>
          </div>
          <p className="ig-text-body">
            ¿Estás seguro de que deseas eliminar este elemento?
            Esta acción no se puede deshacer.
          </p>
        </div>
      </Modal>

      {/* Modal de éxito */}
      <Modal
        open={openSuccess}
        onClose={() => setOpenSuccess(false)}
        size="sm"
        title="Operación exitosa"
        footer={
          <div className="ig-flex ig-justify-center">
            <Button variant="success" onClick={() => setOpenSuccess(false)}>Continuar</Button>
          </div>
        }
      >
        <div className="ig-text-center">
          <div className="ig-w-16 ig-h-16 ig-bg-success/20 ig-rounded-full ig-flex ig-items-center ig-justify-center ig-mx-auto ig-mb-4">
            <span className="ig-text-3xl ig-text-success">✓</span>
          </div>
          <h4 className="ig-text-lg ig-font-semibold ig-text-heading ig-mb-2">¡Guardado!</h4>
          <p className="ig-text-body">
            Los cambios se han guardado correctamente.
          </p>
        </div>
      </Modal>
    </div>
  );
};

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

export const ModalConScroll = () => {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Modal con Scroll</h2>

      <Button variant="brand" onClick={() => setOpen(true)}>
        Abrir términos y condiciones
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Términos y Condiciones"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Rechazar</Button>
            <Button variant="brand" onClick={() => setOpen(false)}>Aceptar</Button>
          </>
        }
      >
        <div className="ig-max-h-64 ig-overflow-y-auto ig-space-y-4">
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
      </Modal>
    </div>
  );
};

export const Playground = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="brand" onClick={() => setOpen(true)}>
          Abrir Modal
        </Button>
        <Modal
          {...args}
          open={open}
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button variant="brand" onClick={() => setOpen(false)}>Aceptar</Button>
            </>
          }
        />
      </>
    );
  },
  args: {
    title: 'Modal de Prueba',
    size: 'md',
    children: 'Usa los controles para cambiar las propiedades del modal.',
  },
};
