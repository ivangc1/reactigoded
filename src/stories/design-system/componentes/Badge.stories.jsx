import React from 'react';
import { Badge } from '../../../components/Badge/Badge';
import { Button } from '../../../components/Button/Button';

export default {
  title: 'Componentes/Badge',
  component: Badge,
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

export const VariantesDeColor = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Variantes de Badge</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-3">
      <Badge variant="brand">Brand</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="danger">Danger</Badge>
      <Badge variant="info">Info</Badge>
    </div>
  </div>
);

export const BadgeOutline = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Badge Outline</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-3">
      <Badge variant="brand" outline>Brand</Badge>
      <Badge variant="secondary" outline>Secondary</Badge>
      <Badge variant="success" outline>Success</Badge>
      <Badge variant="warning" outline>Warning</Badge>
      <Badge variant="danger" outline>Danger</Badge>
      <Badge variant="info" outline>Info</Badge>
    </div>
  </div>
);

export const BadgeConPunto = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Badge con Punto Indicador</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-3">
      <Badge variant="brand" dot>En línea</Badge>
      <Badge variant="success" dot>Activo</Badge>
      <Badge variant="warning" dot>Pendiente</Badge>
      <Badge variant="danger" dot>Error</Badge>
    </div>
  </div>
);

export const Tamanos = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tamaños de Badge</h2>

    <div className="ig-flex ig-flex-wrap ig-items-center ig-gap-3">
      <Badge variant="brand" size="sm">Pequeño</Badge>
      <Badge variant="brand">Normal</Badge>
      <Badge variant="brand" size="lg">Grande</Badge>
    </div>
  </div>
);

export const BadgeRedondo = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Badge Redondo (Pill)</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-3">
      <Badge variant="brand" pill>12</Badge>
      <Badge variant="danger" pill>99+</Badge>
      <Badge variant="success" pill>✓</Badge>
      <Badge variant="warning" pill>!</Badge>
    </div>
  </div>
);

export const BadgeConIcono = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Badge con Icono</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-3">
      <Badge variant="success">✓ Completado</Badge>
      <Badge variant="warning">⏳ Pendiente</Badge>
      <Badge variant="danger">✕ Error</Badge>
      <Badge variant="info">ℹ Info</Badge>
      <Badge variant="brand">⭐ Nuevo</Badge>
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
            <Badge variant="warning">Pendiente</Badge>
          </div>
          <div className="ig-flex ig-justify-between ig-items-center ig-p-2 ig-bg-muted ig-rounded">
            <span className="ig-text-body">Pedido #1235</span>
            <Badge variant="info">En proceso</Badge>
          </div>
          <div className="ig-flex ig-justify-between ig-items-center ig-p-2 ig-bg-muted ig-rounded">
            <span className="ig-text-body">Pedido #1236</span>
            <Badge variant="success">Entregado</Badge>
          </div>
          <div className="ig-flex ig-justify-between ig-items-center ig-p-2 ig-bg-muted ig-rounded">
            <span className="ig-text-body">Pedido #1237</span>
            <Badge variant="danger">Cancelado</Badge>
          </div>
        </div>
      </div>

      {/* Notificaciones */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Botón con Notificación</h3>
        <div className="ig-flex ig-gap-4">
          <Button variant="outline" className="ig-relative">
            Mensajes
            <Badge variant="danger" pill className="ig-absolute ig--top-2 ig--right-2">5</Badge>
          </Button>
          <Button variant="outline" className="ig-relative">
            Alertas
            <Badge variant="warning" pill className="ig-absolute ig--top-2 ig--right-2">12</Badge>
          </Button>
        </div>
      </div>

      {/* Tags en artículo */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Tags de Artículo</h3>
        <div className="ig-flex ig-flex-wrap ig-gap-2">
          <Badge variant="brand" outline>React</Badge>
          <Badge variant="brand" outline>CSS</Badge>
          <Badge variant="brand" outline>TypeScript</Badge>
          <Badge variant="secondary" outline>Frontend</Badge>
        </div>
      </div>

      {/* Usuarios en línea */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Estado de Usuario</h3>
        <div className="ig-space-y-2">
          <div className="ig-flex ig-items-center ig-gap-3">
            <div className="ig-w-8 ig-h-8 ig-bg-brand ig-rounded-full"></div>
            <span className="ig-text-body">Juan Pérez</span>
            <Badge variant="success" size="sm" dot>En línea</Badge>
          </div>
          <div className="ig-flex ig-items-center ig-gap-3">
            <div className="ig-w-8 ig-h-8 ig-bg-secondary ig-rounded-full"></div>
            <span className="ig-text-body">María García</span>
            <Badge variant="warning" size="sm" dot>Ausente</Badge>
          </div>
          <div className="ig-flex ig-items-center ig-gap-3">
            <div className="ig-w-8 ig-h-8 ig-bg-danger ig-rounded-full"></div>
            <span className="ig-text-body">Carlos López</span>
            <Badge variant="brand" size="sm" outline>Desconectado</Badge>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const Playground = {
  args: {
    children: 'Badge',
    variant: 'brand',
    size: undefined,
    pill: false,
    dot: false,
    outline: false,
  },
};
