import React from 'react';
import { Progress } from '../../../components/Progress/Progress';
import { Button } from '../../../components/Button/Button';

export default {
  title: 'Componentes/Progress',
  component: Progress,
  argTypes: {
    variant: {
      control: 'select',
      options: ['brand', 'secondary', 'success', 'warning', 'danger', 'info'],
    },
    size: {
      control: 'select',
      options: ['sm', undefined, 'lg'],
    },
  },
};

export const ProgressBasico = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Progress Básico</h2>

    <div className="ig-space-y-6 ig-max-w-lg">
      <div>
        <div className="ig-flex ig-justify-between ig-mb-2">
          <span className="ig-text-sm ig-text-body">Progreso</span>
          <span className="ig-text-sm ig-text-muted">75%</span>
        </div>
        <Progress value={75} variant="brand" />
      </div>

      <div>
        <div className="ig-flex ig-justify-between ig-mb-2">
          <span className="ig-text-sm ig-text-body">Descarga</span>
          <span className="ig-text-sm ig-text-muted">45%</span>
        </div>
        <Progress value={45} variant="brand" />
      </div>

      <div>
        <div className="ig-flex ig-justify-between ig-mb-2">
          <span className="ig-text-sm ig-text-body">Completado</span>
          <span className="ig-text-sm ig-text-muted">100%</span>
        </div>
        <Progress value={100} variant="brand" />
      </div>
    </div>
  </div>
);

export const VariantesDeColor = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Variantes de Color</h2>

    <div className="ig-space-y-4 ig-max-w-lg">
      <div>
        <span className="ig-text-sm ig-text-muted ig-block ig-mb-2">Brand (vitreus)</span>
        <Progress value={60} variant="brand" />
      </div>

      <div>
        <span className="ig-text-sm ig-text-muted ig-block ig-mb-2">Secondary (axis)</span>
        <Progress value={50} variant="secondary" />
      </div>

      <div>
        <span className="ig-text-sm ig-text-muted ig-block ig-mb-2">Success (laurus)</span>
        <Progress value={80} variant="success" />
      </div>

      <div>
        <span className="ig-text-sm ig-text-muted ig-block ig-mb-2">Warning (rutilus)</span>
        <Progress value={70} variant="warning" />
      </div>

      <div>
        <span className="ig-text-sm ig-text-muted ig-block ig-mb-2">Danger (malum)</span>
        <Progress value={40} variant="danger" />
      </div>

      <div>
        <span className="ig-text-sm ig-text-muted ig-block ig-mb-2">Info (axis)</span>
        <Progress value={55} variant="info" />
      </div>
    </div>
  </div>
);

export const Tamanos = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tamaños</h2>

    <div className="ig-space-y-6 ig-max-w-lg">
      <div>
        <span className="ig-text-sm ig-text-muted ig-block ig-mb-2">Pequeño (sm)</span>
        <Progress value={60} size="sm" variant="brand" />
      </div>

      <div>
        <span className="ig-text-sm ig-text-muted ig-block ig-mb-2">Normal (default)</span>
        <Progress value={60} variant="brand" />
      </div>

      <div>
        <span className="ig-text-sm ig-text-muted ig-block ig-mb-2">Grande (lg)</span>
        <Progress value={60} size="lg" variant="brand" />
      </div>
    </div>
  </div>
);

export const ProgressIndeterminado = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Progress Indeterminado</h2>
    <p className="ig-text-body ig-mb-6">
      Usa <code className="ig-bg-muted ig-px-1 ig-rounded">indeterminate</code> cuando
      no conoces el progreso exacto.
    </p>

    <div className="ig-space-y-4 ig-max-w-lg">
      <Progress indeterminate variant="brand" />
      <Progress indeterminate variant="secondary" />
      <Progress indeterminate variant="success" />
    </div>
  </div>
);

export const CasosDeUso = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Casos de Uso</h2>

    <div className="ig-space-y-6">
      {/* Descarga de archivo */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Descarga de Archivo</h3>
        <div className="ig-flex ig-items-center ig-gap-4">
          <span className="ig-text-2xl">📄</span>
          <div className="ig-flex-1">
            <div className="ig-flex ig-justify-between ig-mb-1">
              <span className="ig-text-sm ig-text-body">documento.pdf</span>
              <span className="ig-text-sm ig-text-muted">2.4 MB / 5.2 MB</span>
            </div>
            <Progress value={46} variant="brand" />
          </div>
          <Button variant="outline" size="sm">✕</Button>
        </div>
      </div>

      {/* Pasos de un proceso */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Proceso de Registro</h3>
        <div className="ig-space-y-4">
          <div className="ig-flex ig-justify-between ig-text-sm">
            <span className="ig-text-body">Paso 2 de 4</span>
            <span className="ig-text-muted">50% completado</span>
          </div>
          <Progress value={50} size="lg" variant="success" />
          <div className="ig-flex ig-justify-between ig-text-xs ig-text-muted">
            <span className="ig-text-success">✓ Datos</span>
            <span className="ig-text-brand ig-font-semibold">Verificación</span>
            <span>Pago</span>
            <span>Confirmación</span>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Uso de Almacenamiento</h3>
        <div className="ig-space-y-4">
          <div>
            <div className="ig-flex ig-justify-between ig-mb-1">
              <span className="ig-text-sm ig-text-body">Documentos</span>
              <span className="ig-text-sm ig-text-muted">4.2 GB</span>
            </div>
            <Progress value={42} size="sm" variant="brand" />
          </div>
          <div>
            <div className="ig-flex ig-justify-between ig-mb-1">
              <span className="ig-text-sm ig-text-body">Imágenes</span>
              <span className="ig-text-sm ig-text-muted">2.8 GB</span>
            </div>
            <Progress value={28} size="sm" variant="secondary" />
          </div>
          <div>
            <div className="ig-flex ig-justify-between ig-mb-1">
              <span className="ig-text-sm ig-text-body">Videos</span>
              <span className="ig-text-sm ig-text-muted">1.5 GB</span>
            </div>
            <Progress value={15} size="sm" variant="success" />
          </div>
          <div className="ig-pt-2 ig-border-t ig-border-subtle">
            <div className="ig-flex ig-justify-between ig-mb-1">
              <span className="ig-text-sm ig-font-medium ig-text-body">Total</span>
              <span className="ig-text-sm ig-text-muted">8.5 GB / 10 GB</span>
            </div>
            <Progress value={85} variant="warning" />
          </div>
        </div>
      </div>

      {/* Cargando contenido */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Cargando Contenido</h3>
        <div className="ig-text-center ig-py-4">
          <p className="ig-text-body ig-mb-4">Procesando datos...</p>
          <div className="ig-max-w-xs ig-mx-auto">
            <Progress indeterminate variant="brand" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const ProgressCircular = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Progress Circular (CSS)</h2>
    <p className="ig-text-body ig-mb-6">
      Ejemplo de progress circular usando conic-gradient y variables CSS.
    </p>

    <div className="ig-flex ig-flex-wrap ig-gap-8 ig-items-center ig-justify-center">
      {[25, 50, 75, 100].map((percent) => (
        <div key={percent} className="ig-text-center">
          <div
            className="ig-w-20 ig-h-20 ig-rounded-full ig-flex ig-items-center ig-justify-center ig-relative"
            style={{
              background: `conic-gradient(var(--ig-vitreus) ${percent * 3.6}deg, var(--ig-neutral-200) ${percent * 3.6}deg)`
            }}
          >
            <div className="ig-w-16 ig-h-16 ig-bg-surface ig-rounded-full ig-flex ig-items-center ig-justify-center">
              <span className="ig-font-semibold ig-text-heading">{percent}%</span>
            </div>
          </div>
          <span className="ig-text-sm ig-text-muted ig-mt-2 ig-block">{percent}%</span>
        </div>
      ))}
    </div>
  </div>
);

export const Playground = {
  args: {
    value: 50,
    variant: 'brand',
    size: undefined,
    indeterminate: false,
  },
};
