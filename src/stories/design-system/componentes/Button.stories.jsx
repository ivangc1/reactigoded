import React from 'react';
import { Button } from '../../../components/Button/Button';

export default {
  title: 'Componentes/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['brand', 'secondary', 'success', 'warning', 'danger', 'info', 'outline', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', undefined, 'lg', 'xl'],
    },
  },
};

export const Variantes = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Variantes de Botón</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Colores Sólidos</h3>
        <div className="ig-flex ig-flex-wrap ig-gap-3">
          <Button variant="brand">Brand</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="success">Success</Button>
          <Button variant="warning">Warning</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="info">Info</Button>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Outline, Ghost y Link</h3>
        <div className="ig-flex ig-flex-wrap ig-gap-3">
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Outline con colores (CSS)</h3>
        <div className="ig-flex ig-flex-wrap ig-gap-3">
          <button className="ig-btn ig-btn-outline-brand">Outline Brand</button>
          <button className="ig-btn ig-btn-outline-secondary">Outline Secondary</button>
          <button className="ig-btn ig-btn-outline-success">Outline Success</button>
          <button className="ig-btn ig-btn-outline-warning">Outline Warning</button>
          <button className="ig-btn ig-btn-outline-danger">Outline Danger</button>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Ghost con colores (CSS)</h3>
        <div className="ig-flex ig-flex-wrap ig-gap-3">
          <button className="ig-btn ig-btn-ghost-brand">Ghost Brand</button>
          <button className="ig-btn ig-btn-ghost-secondary">Ghost Secondary</button>
          <button className="ig-btn ig-btn-ghost-success">Ghost Success</button>
          <button className="ig-btn ig-btn-ghost-warning">Ghost Warning</button>
          <button className="ig-btn ig-btn-ghost-danger">Ghost Danger</button>
        </div>
      </div>
    </div>
  </div>
);

export const Tamanos = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tamaños de Botón</h2>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <div className="ig-flex ig-flex-wrap ig-items-end ig-gap-3">
        <Button variant="brand" size="xs">Extra Pequeño</Button>
        <Button variant="brand" size="sm">Pequeño</Button>
        <Button variant="brand">Normal</Button>
        <Button variant="brand" size="lg">Grande</Button>
        <Button variant="brand" size="xl">Extra Grande</Button>
      </div>
    </div>

    <div className="ig-mt-6 ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Props disponibles</h3>
      <div className="ig-grid ig-grid-cols-2 ig-md:ig-grid-cols-5 ig-gap-2 ig-text-sm">
        <code className="ig-text-muted">size="xs"</code>
        <code className="ig-text-muted">size="sm"</code>
        <code className="ig-text-muted">(default)</code>
        <code className="ig-text-muted">size="lg"</code>
        <code className="ig-text-muted">size="xl"</code>
      </div>
    </div>
  </div>
);

export const Estados = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Estados de Botón</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Normal vs Disabled</h3>
        <div className="ig-flex ig-flex-wrap ig-gap-3">
          <Button variant="brand">Normal</Button>
          <Button variant="brand" disabled>Disabled</Button>
          <Button variant="secondary">Normal</Button>
          <Button variant="secondary" disabled>Disabled</Button>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Con Loading</h3>
        <div className="ig-flex ig-flex-wrap ig-gap-3">
          <Button variant="brand" loading>Cargando...</Button>
          <Button variant="secondary" loading>Procesando</Button>
        </div>
      </div>
    </div>
  </div>
);

export const Modificadores = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Modificadores</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">block (ancho completo)</h3>
        <Button variant="brand" block>Botón Block</Button>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">icon (cuadrado)</h3>
        <div className="ig-flex ig-flex-wrap ig-gap-3">
          <Button variant="brand" icon size="sm">✕</Button>
          <Button variant="brand" icon>✓</Button>
          <Button variant="brand" icon size="lg">+</Button>
          <Button variant="outline" icon>⋮</Button>
          <Button variant="ghost" icon>☰</Button>
        </div>
      </div>
    </div>
  </div>
);

export const ConIconos = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Botones con Iconos</h2>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <div className="ig-flex ig-flex-wrap ig-gap-3">
        <Button variant="brand">
          <span>→</span>
          Siguiente
        </Button>
        <Button variant="brand">
          ←
          <span>Anterior</span>
        </Button>
        <Button variant="success">
          ✓
          <span>Guardar</span>
        </Button>
        <Button variant="danger">
          🗑
          <span>Eliminar</span>
        </Button>
        <Button variant="outline">
          ↓
          <span>Descargar</span>
        </Button>
      </div>
    </div>
  </div>
);

export const GrupoDeBotones = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Grupo de Botones</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Horizontal</h3>
        <div className="ig-inline-flex ig-rounded-lg ig-overflow-hidden ig-border ig-border-default">
          <Button variant="ghost" className="ig-rounded-none ig-border-r ig-border-default">Izquierda</Button>
          <Button variant="ghost" className="ig-rounded-none ig-border-r ig-border-default">Centro</Button>
          <Button variant="ghost" className="ig-rounded-none">Derecha</Button>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Con uno activo</h3>
        <div className="ig-inline-flex ig-rounded-lg ig-overflow-hidden ig-border ig-border-default">
          <Button variant="brand" className="ig-rounded-none">Día</Button>
          <Button variant="ghost" className="ig-rounded-none ig-border-l ig-border-default">Semana</Button>
          <Button variant="ghost" className="ig-rounded-none ig-border-l ig-border-default">Mes</Button>
        </div>
      </div>
    </div>
  </div>
);

export const CasosDeUso = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Casos de Uso Comunes</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Formulario - Acciones primaria y secundaria</h3>
        <div className="ig-flex ig-gap-3">
          <Button variant="brand">Guardar cambios</Button>
          <Button variant="ghost">Cancelar</Button>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Modal de confirmación</h3>
        <div className="ig-flex ig-gap-3">
          <Button variant="danger">Eliminar</Button>
          <Button variant="outline">Cancelar</Button>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">CTA Hero</h3>
        <div className="ig-flex ig-gap-3">
          <Button variant="brand" size="lg">Empezar gratis</Button>
          <Button variant="outline" size="lg">Ver demo</Button>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Acciones de tabla</h3>
        <div className="ig-flex ig-gap-2">
          <Button variant="ghost" size="sm">Editar</Button>
          <button className="ig-btn ig-btn-ghost-danger ig-btn-sm">Eliminar</button>
        </div>
      </div>
    </div>
  </div>
);

// Story interactiva con controls de Storybook
export const Playground = {
  args: {
    children: 'Botón de ejemplo',
    variant: 'brand',
    size: undefined,
    loading: false,
    block: false,
    icon: false,
    disabled: false,
  },
};
