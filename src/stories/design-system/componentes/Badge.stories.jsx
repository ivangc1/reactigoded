import React from 'react';

export default {
  title: 'Componentes/Badge',
};

export const VariantesDeColor = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Variantes de Badge</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-3">
      <span className="ig-badge ig-badge-brand">Brand</span>
      <span className="ig-badge ig-badge-secondary">Secondary</span>
      <span className="ig-badge ig-badge-success">Success</span>
      <span className="ig-badge ig-badge-warning">Warning</span>
      <span className="ig-badge ig-badge-danger">Danger</span>
      <span className="ig-badge ig-badge-info">Info</span>
    </div>
  </div>
);

export const BadgeOutline = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Badge Outline</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-3">
      <span className="ig-badge ig-badge-outline-brand">Brand</span>
      <span className="ig-badge ig-badge-outline-secondary">Secondary</span>
      <span className="ig-badge ig-badge-outline-success">Success</span>
      <span className="ig-badge ig-badge-outline-warning">Warning</span>
      <span className="ig-badge ig-badge-outline-danger">Danger</span>
      <span className="ig-badge ig-badge-outline-info">Info</span>
    </div>
  </div>
);

export const BadgeConPunto = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Badge con Punto Indicador</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-3">
      <span className="ig-badge ig-badge-brand">
        <span className="ig-badge-dot"></span>
        En línea
      </span>
      <span className="ig-badge ig-badge-success">
        <span className="ig-badge-dot"></span>
        Activo
      </span>
      <span className="ig-badge ig-badge-warning">
        <span className="ig-badge-dot"></span>
        Pendiente
      </span>
      <span className="ig-badge ig-badge-danger">
        <span className="ig-badge-dot"></span>
        Error
      </span>
    </div>
  </div>
);

export const Tamanos = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tamaños de Badge</h2>

    <div className="ig-flex ig-flex-wrap ig-items-center ig-gap-3">
      <span className="ig-badge ig-badge-brand ig-badge-sm">Pequeño</span>
      <span className="ig-badge ig-badge-brand">Normal</span>
      <span className="ig-badge ig-badge-brand ig-badge-lg">Grande</span>
    </div>
  </div>
);

export const BadgeRedondo = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Badge Redondo (Pill)</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-3">
      <span className="ig-badge ig-badge-brand ig-badge-pill">12</span>
      <span className="ig-badge ig-badge-danger ig-badge-pill">99+</span>
      <span className="ig-badge ig-badge-success ig-badge-pill">✓</span>
      <span className="ig-badge ig-badge-warning ig-badge-pill">!</span>
    </div>
  </div>
);

export const BadgeConIcono = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Badge con Icono</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-3">
      <span className="ig-badge ig-badge-success">
        ✓ Completado
      </span>
      <span className="ig-badge ig-badge-warning">
        ⏳ Pendiente
      </span>
      <span className="ig-badge ig-badge-danger">
        ✕ Error
      </span>
      <span className="ig-badge ig-badge-info">
        ℹ Info
      </span>
      <span className="ig-badge ig-badge-brand">
        ⭐ Nuevo
      </span>
    </div>
  </div>
);

export const CasosDeUso = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Casos de Uso</h2>

    <div className="ig-space-y-6">
      {/* Estados de pedido */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Estados de Pedido</h3>
        <div className="ig-space-y-2">
          <div className="ig-flex ig-justify-between ig-items-center ig-p-2 ig-bg-muted ig-rounded">
            <span className="ig-text-body">Pedido #1234</span>
            <span className="ig-badge ig-badge-warning">Pendiente</span>
          </div>
          <div className="ig-flex ig-justify-between ig-items-center ig-p-2 ig-bg-muted ig-rounded">
            <span className="ig-text-body">Pedido #1235</span>
            <span className="ig-badge ig-badge-info">En proceso</span>
          </div>
          <div className="ig-flex ig-justify-between ig-items-center ig-p-2 ig-bg-muted ig-rounded">
            <span className="ig-text-body">Pedido #1236</span>
            <span className="ig-badge ig-badge-success">Entregado</span>
          </div>
          <div className="ig-flex ig-justify-between ig-items-center ig-p-2 ig-bg-muted ig-rounded">
            <span className="ig-text-body">Pedido #1237</span>
            <span className="ig-badge ig-badge-danger">Cancelado</span>
          </div>
        </div>
      </div>

      {/* Notificaciones */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Botón con Notificación</h3>
        <div className="ig-flex ig-gap-4">
          <button className="ig-btn ig-btn-outline ig-relative">
            Mensajes
            <span className="ig-badge ig-badge-danger ig-badge-pill ig-absolute ig--top-2 ig--right-2">5</span>
          </button>
          <button className="ig-btn ig-btn-outline ig-relative">
            Alertas
            <span className="ig-badge ig-badge-warning ig-badge-pill ig-absolute ig--top-2 ig--right-2">12</span>
          </button>
        </div>
      </div>

      {/* Tags en artículo */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Tags de Artículo</h3>
        <div className="ig-flex ig-flex-wrap ig-gap-2">
          <span className="ig-badge ig-badge-outline-brand">React</span>
          <span className="ig-badge ig-badge-outline-brand">CSS</span>
          <span className="ig-badge ig-badge-outline-brand">TypeScript</span>
          <span className="ig-badge ig-badge-outline-secondary">Frontend</span>
        </div>
      </div>

      {/* Usuarios en línea */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Estado de Usuario</h3>
        <div className="ig-space-y-2">
          <div className="ig-flex ig-items-center ig-gap-3">
            <div className="ig-w-8 ig-h-8 ig-bg-brand ig-rounded-full"></div>
            <span className="ig-text-body">Juan Pérez</span>
            <span className="ig-badge ig-badge-success ig-badge-sm">
              <span className="ig-badge-dot"></span>
              En línea
            </span>
          </div>
          <div className="ig-flex ig-items-center ig-gap-3">
            <div className="ig-w-8 ig-h-8 ig-bg-secondary ig-rounded-full"></div>
            <span className="ig-text-body">María García</span>
            <span className="ig-badge ig-badge-warning ig-badge-sm">
              <span className="ig-badge-dot"></span>
              Ausente
            </span>
          </div>
          <div className="ig-flex ig-items-center ig-gap-3">
            <div className="ig-w-8 ig-h-8 ig-bg-danger ig-rounded-full"></div>
            <span className="ig-text-body">Carlos López</span>
            <span className="ig-badge ig-badge-outline-brand ig-badge-sm">
              Desconectado
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);
