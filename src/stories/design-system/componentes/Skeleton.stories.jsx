import React from 'react';

export default {
  title: 'Componentes/Skeleton',
};

export const SkeletonBasico = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Skeleton Básico</h2>
    <p className="ig-text-body ig-mb-6">
      Los skeletons muestran un placeholder animado mientras carga el contenido.
    </p>

    <div className="ig-space-y-4 ig-max-w-md">
      <div className="ig-skeleton ig-h-4 ig-w-full"></div>
      <div className="ig-skeleton ig-h-4 ig-w-3/4"></div>
      <div className="ig-skeleton ig-h-4 ig-w-1/2"></div>
    </div>
  </div>
);

export const VariantesDeSkeleton = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Variantes de Skeleton</h2>

    <div className="ig-space-y-8">
      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Texto</h3>
        <div className="ig-space-y-2 ig-max-w-md">
          <div className="ig-skeleton ig-skeleton-title"></div>
          <div className="ig-skeleton ig-skeleton-text"></div>
          <div className="ig-skeleton ig-skeleton-text ig-w-4/5"></div>
          <div className="ig-skeleton ig-skeleton-text ig-w-3/5"></div>
        </div>
      </div>

      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Avatar</h3>
        <div className="ig-flex ig-gap-4">
          <div className="ig-skeleton ig-skeleton-avatar"></div>
          <div className="ig-skeleton ig-skeleton-avatar-lg"></div>
        </div>
      </div>

      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Imagen</h3>
        <div className="ig-skeleton ig-skeleton-image ig-w-64"></div>
      </div>

      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Botón</h3>
        <div className="ig-flex ig-gap-4">
          <div className="ig-skeleton ig-skeleton-button"></div>
          <div className="ig-skeleton ig-skeleton-button ig-w-32"></div>
        </div>
      </div>

      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Card</h3>
        <div className="ig-skeleton ig-skeleton-card ig-max-w-sm"></div>
      </div>
    </div>
  </div>
);

export const SkeletonCard = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Skeleton de Card</h2>

    <div className="ig-grid ig-grid-cols-1 ig-md:ig-grid-cols-2 ig-lg:ig-grid-cols-3 ig-gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="ig-card">
          <div className="ig-skeleton ig-h-40 ig-rounded-t-lg"></div>
          <div className="ig-card-body">
            <div className="ig-skeleton ig-skeleton-title ig-mb-4"></div>
            <div className="ig-space-y-2">
              <div className="ig-skeleton ig-skeleton-text"></div>
              <div className="ig-skeleton ig-skeleton-text ig-w-4/5"></div>
            </div>
            <div className="ig-flex ig-gap-2 ig-mt-4">
              <div className="ig-skeleton ig-skeleton-button"></div>
              <div className="ig-skeleton ig-skeleton-button"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonLista = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Skeleton de Lista</h2>

    <div className="ig-bg-surface ig-rounded-lg ig-border ig-border-default ig-divide-y ig-divide-subtle">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="ig-p-4 ig-flex ig-items-center ig-gap-4">
          <div className="ig-skeleton ig-skeleton-avatar"></div>
          <div className="ig-flex-1">
            <div className="ig-skeleton ig-h-4 ig-w-1/3 ig-mb-2"></div>
            <div className="ig-skeleton ig-h-3 ig-w-2/3"></div>
          </div>
          <div className="ig-skeleton ig-h-6 ig-w-16 ig-rounded-full"></div>
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonFormulario = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Skeleton de Formulario</h2>

    <div className="ig-bg-surface ig-p-6 ig-rounded-lg ig-border ig-border-default ig-max-w-md">
      <div className="ig-skeleton ig-h-6 ig-w-32 ig-mb-6"></div>

      <div className="ig-space-y-4">
        <div>
          <div className="ig-skeleton ig-h-4 ig-w-20 ig-mb-2"></div>
          <div className="ig-skeleton ig-h-10 ig-w-full ig-rounded"></div>
        </div>

        <div>
          <div className="ig-skeleton ig-h-4 ig-w-16 ig-mb-2"></div>
          <div className="ig-skeleton ig-h-10 ig-w-full ig-rounded"></div>
        </div>

        <div className="ig-grid ig-grid-cols-2 ig-gap-4">
          <div>
            <div className="ig-skeleton ig-h-4 ig-w-12 ig-mb-2"></div>
            <div className="ig-skeleton ig-h-10 ig-w-full ig-rounded"></div>
          </div>
          <div>
            <div className="ig-skeleton ig-h-4 ig-w-16 ig-mb-2"></div>
            <div className="ig-skeleton ig-h-10 ig-w-full ig-rounded"></div>
          </div>
        </div>

        <div className="ig-skeleton ig-h-10 ig-w-full ig-rounded ig-mt-6"></div>
      </div>
    </div>
  </div>
);

export const SkeletonPerfil = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Skeleton de Perfil</h2>

    <div className="ig-bg-surface ig-rounded-lg ig-border ig-border-default ig-overflow-hidden ig-max-w-sm">
      {/* Cover */}
      <div className="ig-skeleton ig-h-24"></div>

      {/* Contenido */}
      <div className="ig-p-4 ig-pt-12 ig-relative">
        {/* Avatar */}
        <div className="ig-absolute ig--top-8 ig-left-4">
          <div className="ig-skeleton ig-w-16 ig-h-16 ig-rounded-full ig-border-4 ig-border-surface"></div>
        </div>

        {/* Info */}
        <div className="ig-space-y-3 ig-mt-4">
          <div className="ig-skeleton ig-h-5 ig-w-32"></div>
          <div className="ig-skeleton ig-h-4 ig-w-24"></div>
          <div className="ig-skeleton ig-h-4 ig-w-full"></div>
          <div className="ig-skeleton ig-h-4 ig-w-3/4"></div>
        </div>

        {/* Stats */}
        <div className="ig-flex ig-gap-4 ig-mt-4">
          <div className="ig-skeleton ig-h-8 ig-w-16"></div>
          <div className="ig-skeleton ig-h-8 ig-w-16"></div>
          <div className="ig-skeleton ig-h-8 ig-w-16"></div>
        </div>

        {/* Botones */}
        <div className="ig-flex ig-gap-2 ig-mt-4">
          <div className="ig-skeleton ig-h-9 ig-flex-1 ig-rounded"></div>
          <div className="ig-skeleton ig-h-9 ig-flex-1 ig-rounded"></div>
        </div>
      </div>
    </div>
  </div>
);

export const SkeletonTabla = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Skeleton de Tabla</h2>

    <div className="ig-bg-surface ig-rounded-lg ig-border ig-border-default ig-overflow-hidden">
      {/* Header */}
      <div className="ig-bg-muted ig-p-4 ig-flex ig-gap-4">
        <div className="ig-skeleton ig-h-4 ig-w-8"></div>
        <div className="ig-skeleton ig-h-4 ig-flex-1"></div>
        <div className="ig-skeleton ig-h-4 ig-w-24"></div>
        <div className="ig-skeleton ig-h-4 ig-w-20"></div>
        <div className="ig-skeleton ig-h-4 ig-w-16"></div>
      </div>

      {/* Rows */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="ig-p-4 ig-flex ig-gap-4 ig-border-t ig-border-subtle">
          <div className="ig-skeleton ig-h-4 ig-w-8"></div>
          <div className="ig-skeleton ig-h-4 ig-flex-1"></div>
          <div className="ig-skeleton ig-h-4 ig-w-24"></div>
          <div className="ig-skeleton ig-h-4 ig-w-20"></div>
          <div className="ig-skeleton ig-h-4 ig-w-16"></div>
        </div>
      ))}
    </div>
  </div>
);

export const ComparacionContenido = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Comparación: Skeleton vs Contenido</h2>

    <div className="ig-grid ig-grid-cols-1 ig-md:ig-grid-cols-2 ig-gap-8">
      {/* Skeleton */}
      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Cargando...</h3>
        <div className="ig-card">
          <div className="ig-card-body">
            <div className="ig-flex ig-items-center ig-gap-4 ig-mb-4">
              <div className="ig-skeleton ig-skeleton-avatar"></div>
              <div className="ig-flex-1">
                <div className="ig-skeleton ig-h-4 ig-w-24 ig-mb-2"></div>
                <div className="ig-skeleton ig-h-3 ig-w-16"></div>
              </div>
            </div>
            <div className="ig-space-y-2">
              <div className="ig-skeleton ig-skeleton-text"></div>
              <div className="ig-skeleton ig-skeleton-text ig-w-4/5"></div>
              <div className="ig-skeleton ig-skeleton-text ig-w-3/5"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido real */}
      <div>
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Cargado</h3>
        <div className="ig-card">
          <div className="ig-card-body">
            <div className="ig-flex ig-items-center ig-gap-4 ig-mb-4">
              <div className="ig-avatar ig-bg-brand ig-text-on-brand">JP</div>
              <div>
                <div className="ig-font-medium ig-text-body">Juan Pérez</div>
                <div className="ig-text-sm ig-text-muted">Admin</div>
              </div>
            </div>
            <p className="ig-text-body">
              Este es el contenido real que se muestra después de que los datos
              han terminado de cargar. El skeleton proporciona una mejor experiencia
              de usuario durante la carga.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);
