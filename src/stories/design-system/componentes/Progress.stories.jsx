import React from 'react';

export default {
  title: 'Componentes/Progress',
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
        <div className="ig-progress ig-progress-brand">
          <div className="ig-progress-bar" style={{ width: '75%' }}></div>
        </div>
      </div>

      <div>
        <div className="ig-flex ig-justify-between ig-mb-2">
          <span className="ig-text-sm ig-text-body">Descarga</span>
          <span className="ig-text-sm ig-text-muted">45%</span>
        </div>
        <div className="ig-progress ig-progress-brand">
          <div className="ig-progress-bar" style={{ width: '45%' }}></div>
        </div>
      </div>

      <div>
        <div className="ig-flex ig-justify-between ig-mb-2">
          <span className="ig-text-sm ig-text-body">Completado</span>
          <span className="ig-text-sm ig-text-muted">100%</span>
        </div>
        <div className="ig-progress ig-progress-brand">
          <div className="ig-progress-bar" style={{ width: '100%' }}></div>
        </div>
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
        <div className="ig-progress ig-progress-brand">
          <div className="ig-progress-bar" style={{ width: '60%' }}></div>
        </div>
      </div>

      <div>
        <span className="ig-text-sm ig-text-muted ig-block ig-mb-2">Secondary (axis)</span>
        <div className="ig-progress ig-progress-secondary">
          <div className="ig-progress-bar" style={{ width: '50%' }}></div>
        </div>
      </div>

      <div>
        <span className="ig-text-sm ig-text-muted ig-block ig-mb-2">Success (laurus)</span>
        <div className="ig-progress ig-progress-success">
          <div className="ig-progress-bar" style={{ width: '80%' }}></div>
        </div>
      </div>

      <div>
        <span className="ig-text-sm ig-text-muted ig-block ig-mb-2">Warning (rutilus)</span>
        <div className="ig-progress ig-progress-warning">
          <div className="ig-progress-bar" style={{ width: '70%' }}></div>
        </div>
      </div>

      <div>
        <span className="ig-text-sm ig-text-muted ig-block ig-mb-2">Danger (malum)</span>
        <div className="ig-progress ig-progress-danger">
          <div className="ig-progress-bar" style={{ width: '40%' }}></div>
        </div>
      </div>

      <div>
        <span className="ig-text-sm ig-text-muted ig-block ig-mb-2">Info (axis)</span>
        <div className="ig-progress ig-progress-info">
          <div className="ig-progress-bar" style={{ width: '55%' }}></div>
        </div>
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
        <div className="ig-progress ig-progress-sm ig-progress-brand">
          <div className="ig-progress-bar" style={{ width: '60%' }}></div>
        </div>
      </div>

      <div>
        <span className="ig-text-sm ig-text-muted ig-block ig-mb-2">Normal (default)</span>
        <div className="ig-progress ig-progress-brand">
          <div className="ig-progress-bar" style={{ width: '60%' }}></div>
        </div>
      </div>

      <div>
        <span className="ig-text-sm ig-text-muted ig-block ig-mb-2">Grande (lg)</span>
        <div className="ig-progress ig-progress-lg ig-progress-brand">
          <div className="ig-progress-bar" style={{ width: '60%' }}></div>
        </div>
      </div>
    </div>
  </div>
);

export const ProgressIndeterminado = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Progress Indeterminado</h2>
    <p className="ig-text-body ig-mb-6">
      Usa <code className="ig-bg-muted ig-px-1 ig-rounded">ig-progress-indeterminate</code> cuando
      no conoces el progreso exacto.
    </p>

    <div className="ig-space-y-4 ig-max-w-lg">
      <div className="ig-progress ig-progress-brand ig-progress-indeterminate">
        <div className="ig-progress-bar" style={{ width: '30%' }}></div>
      </div>

      <div className="ig-progress ig-progress-secondary ig-progress-indeterminate">
        <div className="ig-progress-bar" style={{ width: '30%' }}></div>
      </div>

      <div className="ig-progress ig-progress-success ig-progress-indeterminate">
        <div className="ig-progress-bar" style={{ width: '30%' }}></div>
      </div>
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
            <div className="ig-progress ig-progress-brand">
              <div className="ig-progress-bar" style={{ width: '46%' }}></div>
            </div>
          </div>
          <button className="ig-btn ig-btn-outline ig-btn-sm">✕</button>
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
          <div className="ig-progress ig-progress-lg ig-progress-success">
            <div className="ig-progress-bar" style={{ width: '50%' }}></div>
          </div>
          <div className="ig-flex ig-justify-between ig-text-xs ig-text-muted">
            <span className="ig-text-success">✓ Datos</span>
            <span className="ig-text-brand ig-font-semibold">● Verificación</span>
            <span>○ Pago</span>
            <span>○ Confirmación</span>
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
            <div className="ig-progress ig-progress-sm ig-progress-brand">
              <div className="ig-progress-bar" style={{ width: '42%' }}></div>
            </div>
          </div>
          <div>
            <div className="ig-flex ig-justify-between ig-mb-1">
              <span className="ig-text-sm ig-text-body">Imágenes</span>
              <span className="ig-text-sm ig-text-muted">2.8 GB</span>
            </div>
            <div className="ig-progress ig-progress-sm ig-progress-secondary">
              <div className="ig-progress-bar" style={{ width: '28%' }}></div>
            </div>
          </div>
          <div>
            <div className="ig-flex ig-justify-between ig-mb-1">
              <span className="ig-text-sm ig-text-body">Videos</span>
              <span className="ig-text-sm ig-text-muted">1.5 GB</span>
            </div>
            <div className="ig-progress ig-progress-sm ig-progress-success">
              <div className="ig-progress-bar" style={{ width: '15%' }}></div>
            </div>
          </div>
          <div className="ig-pt-2 ig-border-t ig-border-subtle">
            <div className="ig-flex ig-justify-between ig-mb-1">
              <span className="ig-text-sm ig-font-medium ig-text-body">Total</span>
              <span className="ig-text-sm ig-text-muted">8.5 GB / 10 GB</span>
            </div>
            <div className="ig-progress ig-progress-warning">
              <div className="ig-progress-bar" style={{ width: '85%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Cargando contenido */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Cargando Contenido</h3>
        <div className="ig-text-center ig-py-4">
          <p className="ig-text-body ig-mb-4">Procesando datos...</p>
          <div className="ig-progress ig-progress-brand ig-progress-indeterminate ig-max-w-xs ig-mx-auto">
            <div className="ig-progress-bar" style={{ width: '30%' }}></div>
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
