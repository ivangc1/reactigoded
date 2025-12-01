import React from 'react';

export default {
  title: 'Componentes/Card',
};

export const CardBasica = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Card Básica</h2>

    <div className="ig-grid ig-grid-cols-1 md:ig-grid-cols-2 ig-gap-6">
      <div className="ig-card">
        <div className="ig-card-body">
          <h3 className="ig-text-lg ig-font-semibold ig-text-heading ig-mb-2">Título de la card</h3>
          <p className="ig-text-body">
            Contenido básico de la card. Las cards son contenedores para agrupar información relacionada.
          </p>
        </div>
      </div>

      <div className="ig-card">
        <div className="ig-card-header">Cabecera</div>
        <div className="ig-card-body">
          <p className="ig-text-body">Contenido con header y footer separados.</p>
        </div>
        <div className="ig-card-footer">
          <button className="ig-btn ig-btn-brand ig-btn-sm">Acción</button>
        </div>
      </div>
    </div>
  </div>
);

export const VariantesDeColor = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Variantes de Color</h2>
    <p className="ig-text-body ig-mb-6">Cards con borde izquierdo acentuado.</p>

    <div className="ig-grid ig-grid-cols-1 md:ig-grid-cols-2 lg:ig-grid-cols-3 ig-gap-4">
      <div className="ig-card ig-card-brand">
        <div className="ig-card-body">
          <h4 className="ig-font-semibold ig-text-heading">Card Brand</h4>
          <p className="ig-text-body ig-text-sm">ig-card-brand</p>
        </div>
      </div>

      <div className="ig-card ig-card-secondary">
        <div className="ig-card-body">
          <h4 className="ig-font-semibold ig-text-heading">Card Secondary</h4>
          <p className="ig-text-body ig-text-sm">ig-card-secondary</p>
        </div>
      </div>

      <div className="ig-card ig-card-success">
        <div className="ig-card-body">
          <h4 className="ig-font-semibold ig-text-heading">Card Success</h4>
          <p className="ig-text-body ig-text-sm">ig-card-success</p>
        </div>
      </div>

      <div className="ig-card ig-card-warning">
        <div className="ig-card-body">
          <h4 className="ig-font-semibold ig-text-heading">Card Warning</h4>
          <p className="ig-text-body ig-text-sm">ig-card-warning</p>
        </div>
      </div>

      <div className="ig-card ig-card-danger">
        <div className="ig-card-body">
          <h4 className="ig-font-semibold ig-text-heading">Card Danger</h4>
          <p className="ig-text-body ig-text-sm">ig-card-danger</p>
        </div>
      </div>

      <div className="ig-card ig-card-info">
        <div className="ig-card-body">
          <h4 className="ig-font-semibold ig-text-heading">Card Info</h4>
          <p className="ig-text-body ig-text-sm">ig-card-info</p>
        </div>
      </div>
    </div>
  </div>
);

export const VariantesDeEstilo = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Variantes de Estilo</h2>

    <div className="ig-grid ig-grid-cols-1 md:ig-grid-cols-2 ig-gap-6">
      <div className="ig-card ig-card-bordered">
        <div className="ig-card-body">
          <h4 className="ig-font-semibold ig-text-heading">Card Bordered</h4>
          <p className="ig-text-body ig-text-sm">Borde estándar (ig-card-bordered)</p>
        </div>
      </div>

      <div className="ig-card ig-card-elevated">
        <div className="ig-card-body">
          <h4 className="ig-font-semibold ig-text-heading">Card Elevated</h4>
          <p className="ig-text-body ig-text-sm">Con sombra (ig-card-elevated)</p>
        </div>
      </div>

      <div className="ig-card ig-card-glass">
        <div className="ig-card-body">
          <h4 className="ig-font-semibold ig-text-heading">Card Glass</h4>
          <p className="ig-text-body ig-text-sm">Efecto glassmorphism (ig-card-glass)</p>
        </div>
      </div>

      <div className="ig-card ig-card-interactive">
        <div className="ig-card-body">
          <h4 className="ig-font-semibold ig-text-heading">Card Interactive</h4>
          <p className="ig-text-body ig-text-sm">Hover con sombra (ig-card-interactive)</p>
        </div>
      </div>
    </div>
  </div>
);

export const CardsFilled = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Cards con Fondo Tintado</h2>

    <div className="ig-grid ig-grid-cols-1 md:ig-grid-cols-2 lg:ig-grid-cols-3 ig-gap-4">
      <div className="ig-card ig-card-brand-filled">
        <div className="ig-card-body">
          <h4 className="ig-font-semibold ig-text-heading">Brand Filled</h4>
          <p className="ig-text-body ig-text-sm">Fondo tintado con vitreus</p>
        </div>
      </div>

      <div className="ig-card ig-card-success-filled">
        <div className="ig-card-body">
          <h4 className="ig-font-semibold ig-text-heading">Success Filled</h4>
          <p className="ig-text-body ig-text-sm">Fondo tintado con laurus</p>
        </div>
      </div>

      <div className="ig-card ig-card-warning-filled">
        <div className="ig-card-body">
          <h4 className="ig-font-semibold ig-text-heading">Warning Filled</h4>
          <p className="ig-text-body ig-text-sm">Fondo tintado con rutilus</p>
        </div>
      </div>

      <div className="ig-card ig-card-danger-filled">
        <div className="ig-card-body">
          <h4 className="ig-font-semibold ig-text-heading">Danger Filled</h4>
          <p className="ig-text-body ig-text-sm">Fondo tintado con malum</p>
        </div>
      </div>
    </div>
  </div>
);

export const CardConImagen = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Card con Imagen</h2>

    <div className="ig-grid ig-grid-cols-1 md:ig-grid-cols-3 ig-gap-6">
      <div className="ig-card">
        <div className="ig-card-image ig-card-image-top ig-h-40 ig-bg-muted ig-flex ig-items-center ig-justify-center">
          <span className="ig-text-4xl">🖼️</span>
        </div>
        <div className="ig-card-body">
          <h4 className="ig-font-semibold ig-text-heading">Título del artículo</h4>
          <p className="ig-text-body ig-text-sm">Descripción breve del contenido.</p>
        </div>
      </div>

      <div className="ig-card">
        <div className="ig-card-image ig-card-image-top ig-h-40 ig-bg-gradient-brand ig-flex ig-items-center ig-justify-center">
          <span className="ig-text-4xl">📦</span>
        </div>
        <div className="ig-card-body">
          <h4 className="ig-font-semibold ig-text-heading">Producto destacado</h4>
          <p className="ig-text-body ig-text-sm">Lorem ipsum dolor sit amet.</p>
        </div>
        <div className="ig-card-footer">
          <button className="ig-btn ig-btn-brand ig-btn-sm ig-btn-block">Ver más</button>
        </div>
      </div>

      <div className="ig-card ig-card-interactive">
        <div className="ig-card-image ig-card-image-top ig-h-40 ig-bg-gradient-secondary ig-flex ig-items-center ig-justify-center">
          <span className="ig-text-4xl">🎯</span>
        </div>
        <div className="ig-card-body">
          <h4 className="ig-font-semibold ig-text-heading">Card clickeable</h4>
          <p className="ig-text-body ig-text-sm">Hover para ver el efecto.</p>
        </div>
      </div>
    </div>
  </div>
);

export const CardHorizontal = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Card Horizontal</h2>

    <div className="ig-card ig-max-w-xl">
      <div className="ig-flex">
        <div className="ig-w-1/3 ig-bg-muted ig-flex ig-items-center ig-justify-center ig-rounded-l-lg">
          <span className="ig-text-4xl">📸</span>
        </div>
        <div className="ig-flex-1">
          <div className="ig-card-body">
            <h4 className="ig-font-semibold ig-text-heading">Layout horizontal</h4>
            <p className="ig-text-body ig-text-sm ig-mb-2">
              Combina flexbox con la card para layouts horizontales.
            </p>
            <button className="ig-btn ig-btn-brand ig-btn-sm">Acción</button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const EjemplosReales = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Ejemplos Reales</h2>

    <div className="ig-space-y-6">
      {/* Pricing card */}
      <div className="ig-card ig-max-w-sm ig-mx-auto">
        <div className="ig-card-header ig-text-center">
          <h3 className="ig-text-xl ig-font-bold ig-text-heading">Plan Pro</h3>
          <p className="ig-text-muted ig-text-sm">Para equipos en crecimiento</p>
        </div>
        <div className="ig-card-body ig-text-center">
          <div className="ig-text-4xl ig-font-bold ig-text-brand ig-mb-4">
            $29<span className="ig-text-lg ig-text-muted">/mes</span>
          </div>
          <ul className="ig-space-y-2 ig-text-body ig-text-sm ig-text-left">
            <li>✓ 10 usuarios incluidos</li>
            <li>✓ 100GB almacenamiento</li>
            <li>✓ Soporte prioritario</li>
            <li>✓ API access</li>
          </ul>
        </div>
        <div className="ig-card-footer">
          <button className="ig-btn ig-btn-brand ig-btn-block">Empezar prueba</button>
        </div>
      </div>

      {/* User profile card */}
      <div className="ig-card ig-max-w-sm ig-mx-auto">
        <div className="ig-card-body ig-text-center">
          <div className="ig-w-20 ig-h-20 ig-mx-auto ig-bg-brand ig-rounded-full ig-flex ig-items-center ig-justify-center ig-mb-4">
            <span className="ig-text-on-brand ig-text-2xl ig-font-bold">JD</span>
          </div>
          <h4 className="ig-text-lg ig-font-semibold ig-text-heading">Juan Díaz</h4>
          <p className="ig-text-muted ig-text-sm">Desarrollador Frontend</p>
          <div className="ig-flex ig-justify-center ig-gap-4 ig-mt-4">
            <div className="ig-text-center">
              <div className="ig-font-bold ig-text-heading">152</div>
              <div className="ig-text-xs ig-text-muted">Posts</div>
            </div>
            <div className="ig-text-center">
              <div className="ig-font-bold ig-text-heading">1.2k</div>
              <div className="ig-text-xs ig-text-muted">Seguidores</div>
            </div>
            <div className="ig-text-center">
              <div className="ig-font-bold ig-text-heading">89</div>
              <div className="ig-text-xs ig-text-muted">Siguiendo</div>
            </div>
          </div>
        </div>
        <div className="ig-card-footer ig-flex ig-gap-2">
          <button className="ig-btn ig-btn-brand ig-btn-sm ig-flex-1">Seguir</button>
          <button className="ig-btn ig-btn-outline ig-btn-sm ig-flex-1">Mensaje</button>
        </div>
      </div>

      {/* Stats card */}
      <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-4 ig-gap-4">
        {[
          { label: 'Usuarios', value: '2,543', color: 'brand' },
          { label: 'Ingresos', value: '$45.2k', color: 'success' },
          { label: 'Pedidos', value: '1,234', color: 'secondary' },
          { label: 'Tasa', value: '3.2%', color: 'warning' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`ig-card ig-card-${color}`}>
            <div className="ig-card-body">
              <p className="ig-text-muted ig-text-sm">{label}</p>
              <p className="ig-text-2xl ig-font-bold ig-text-heading">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
