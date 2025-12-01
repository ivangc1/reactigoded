import React from 'react';
import { Spinner } from '../../../components/Spinner/Spinner';
import { Button } from '../../../components/Button/Button';

export default {
  title: 'Componentes/Spinner',
  component: Spinner,
  argTypes: {
    variant: {
      control: 'select',
      options: ['brand', 'secondary', 'success', 'warning', 'danger', 'info'],
    },
    size: {
      control: 'select',
      options: ['sm', undefined, 'lg', 'xl'],
    },
  },
};

export const SpinnerBasico = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Spinner Básico</h2>

    <div className="ig-flex ig-gap-8 ig-items-center">
      <Spinner />
      <span className="ig-text-body">Cargando...</span>
    </div>
  </div>
);

export const VariantesDeColor = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Variantes de Color</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-8 ig-items-center">
      <div className="ig-text-center">
        <Spinner variant="brand" className="ig-mb-2" />
        <span className="ig-text-sm ig-text-muted ig-block">Brand</span>
      </div>
      <div className="ig-text-center">
        <Spinner variant="secondary" className="ig-mb-2" />
        <span className="ig-text-sm ig-text-muted ig-block">Secondary</span>
      </div>
      <div className="ig-text-center">
        <Spinner variant="success" className="ig-mb-2" />
        <span className="ig-text-sm ig-text-muted ig-block">Success</span>
      </div>
      <div className="ig-text-center">
        <Spinner variant="warning" className="ig-mb-2" />
        <span className="ig-text-sm ig-text-muted ig-block">Warning</span>
      </div>
      <div className="ig-text-center">
        <Spinner variant="danger" className="ig-mb-2" />
        <span className="ig-text-sm ig-text-muted ig-block">Danger</span>
      </div>
      <div className="ig-text-center">
        <Spinner variant="info" className="ig-mb-2" />
        <span className="ig-text-sm ig-text-muted ig-block">Info</span>
      </div>
    </div>
  </div>
);

export const Tamanos = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tamaños</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-8 ig-items-end">
      <div className="ig-text-center">
        <Spinner size="sm" variant="brand" className="ig-mb-2" />
        <span className="ig-text-sm ig-text-muted ig-block">sm (1rem)</span>
      </div>
      <div className="ig-text-center">
        <Spinner variant="brand" className="ig-mb-2" />
        <span className="ig-text-sm ig-text-muted ig-block">default (1.5rem)</span>
      </div>
      <div className="ig-text-center">
        <Spinner size="lg" variant="brand" className="ig-mb-2" />
        <span className="ig-text-sm ig-text-muted ig-block">lg (2rem)</span>
      </div>
      <div className="ig-text-center">
        <Spinner size="xl" variant="brand" className="ig-mb-2" />
        <span className="ig-text-sm ig-text-muted ig-block">xl (3rem)</span>
      </div>
    </div>
  </div>
);

export const SpinnerEnBoton = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Spinner en Botón</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-4">
      <Button variant="brand" loading>Cargando...</Button>
      <Button variant="secondary" loading>Procesando</Button>
      <Button variant="outline" loading>Guardando</Button>
    </div>
  </div>
);

export const SpinnerConTexto = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Spinner con Texto</h2>

    <div className="ig-space-y-6">
      <div className="ig-flex ig-items-center ig-gap-3">
        <Spinner variant="brand" />
        <span className="ig-text-body">Cargando datos...</span>
      </div>

      <div className="ig-flex ig-flex-col ig-items-center ig-gap-3">
        <Spinner size="lg" variant="secondary" />
        <span className="ig-text-body">Por favor espera</span>
      </div>
    </div>
  </div>
);

export const EstadoDeCarga = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Estado de Carga</h2>

    <div className="ig-space-y-6">
      {/* Card con loading */}
      <div className="ig-card ig-relative">
        <div className="ig-card-body ig-flex ig-items-center ig-justify-center ig-h-32">
          <div className="ig-text-center">
            <Spinner size="lg" variant="brand" className="ig-mb-3" />
            <p className="ig-text-muted">Cargando contenido...</p>
          </div>
        </div>
      </div>

      {/* Página completa */}
      <div className="ig-bg-surface ig-rounded-lg ig-border ig-border-default ig-h-48 ig-flex ig-items-center ig-justify-center">
        <div className="ig-text-center">
          <Spinner size="xl" variant="brand" className="ig-mb-4" />
          <h3 className="ig-text-lg ig-font-semibold ig-text-heading">Cargando aplicación</h3>
          <p className="ig-text-sm ig-text-muted">Esto puede tomar unos segundos...</p>
        </div>
      </div>
    </div>
  </div>
);

export const SpinnerOverlay = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Spinner con Overlay</h2>

    <div className="ig-relative ig-h-48 ig-bg-surface ig-rounded-lg ig-border ig-border-default ig-overflow-hidden">
      {/* Contenido de fondo */}
      <div className="ig-p-4">
        <h3 className="ig-font-semibold ig-text-heading">Contenido de ejemplo</h3>
        <p className="ig-text-body">Este contenido está detrás del overlay.</p>
      </div>

      {/* Overlay con spinner */}
      <div className="ig-absolute ig-inset-0 ig-bg-base/80 ig-flex ig-items-center ig-justify-center">
        <div className="ig-text-center">
          <Spinner size="lg" variant="brand" className="ig-mb-3" />
          <p className="ig-text-body">Guardando cambios...</p>
        </div>
      </div>
    </div>
  </div>
);

export const Playground = {
  args: {
    variant: 'brand',
    size: undefined,
  },
};
