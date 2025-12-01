import React from 'react';

export default {
  title: 'Avanzado/Dark Mode',
};

export const SistemaDeColores = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Sistema de Colores para Dark Mode</h2>
    <p className="ig-text-body ig-mb-6">
      El sistema usa <code className="ig-bg-muted ig-px-1 ig-rounded">data-theme="light"</code> y
      <code className="ig-bg-muted ig-px-1 ig-rounded">data-theme="dark"</code> para cambiar
      todas las variables CSS automáticamente.
    </p>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Variables semánticas</h3>
      <p className="ig-text-body ig-text-sm ig-mb-4">
        Estas variables cambian automáticamente entre temas:
      </p>

      <div className="ig-grid ig-grid-cols-2 ig-gap-4">
        <div>
          <h4 className="ig-font-medium ig-text-heading ig-mb-2">Fondos</h4>
          <div className="ig-space-y-1 ig-text-sm">
            <div className="ig-p-2 ig-bg-sunken ig-rounded">bg-sunken</div>
            <div className="ig-p-2 ig-bg-base ig-rounded">bg-base</div>
            <div className="ig-p-2 ig-bg-surface ig-rounded ig-border ig-border-subtle">bg-surface</div>
            <div className="ig-p-2 ig-bg-elevated ig-rounded ig-border ig-border-subtle">bg-elevated</div>
            <div className="ig-p-2 ig-bg-muted ig-rounded">bg-muted</div>
          </div>
        </div>

        <div>
          <h4 className="ig-font-medium ig-text-heading ig-mb-2">Textos</h4>
          <div className="ig-space-y-1 ig-text-sm">
            <div className="ig-text-heading">text-heading</div>
            <div className="ig-text-body">text-body</div>
            <div className="ig-text-muted">text-muted</div>
            <div className="ig-text-disabled">text-disabled</div>
            <div className="ig-text-inverse ig-bg-brand ig-px-2 ig-rounded">text-inverse</div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const ColoresSolidosEnTemas = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Colores Sólidos en Ambos Temas</h2>
    <p className="ig-text-body ig-mb-6">
      Los colores de marca se mantienen consistentes pero ajustan su intensidad para cada tema.
    </p>

    <div className="ig-grid ig-grid-cols-2 md:ig-grid-cols-3 lg:ig-grid-cols-6 ig-gap-4">
      {[
        { bg: 'brand', nombre: 'Brand' },
        { bg: 'secondary', nombre: 'Secondary' },
        { bg: 'success', nombre: 'Success' },
        { bg: 'warning', nombre: 'Warning' },
        { bg: 'danger', nombre: 'Danger' },
        { bg: 'info', nombre: 'Info' },
      ].map(({ bg, nombre }) => (
        <div key={bg} className="ig-text-center">
          <div className={`ig-bg-${bg} ig-text-on-${bg} ig-p-4 ig-rounded-lg ig-mb-2`}>
            {nombre}
          </div>
          <code className="ig-text-xs ig-text-muted">ig-bg-{bg}</code>
        </div>
      ))}
    </div>
  </div>
);

export const CambiarTema = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Cambiar de Tema</h2>
    <p className="ig-text-body ig-mb-6">
      Usa el selector de tema en la barra de herramientas de Storybook (arriba) para
      cambiar entre modo claro y oscuro.
    </p>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Implementación</h3>
      <pre className="ig-text-sm ig-text-body ig-bg-muted ig-p-4 ig-rounded ig-overflow-x-auto">
{`<!-- En el HTML -->
<html data-theme="light">

<!-- Cambiar con JavaScript -->
document.documentElement.setAttribute('data-theme', 'dark');

<!-- O detectar preferencia del sistema -->
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');`}
      </pre>
    </div>
  </div>
);

export const ComponentesEnDarkMode = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Componentes en Dark Mode</h2>
    <p className="ig-text-body ig-mb-6">
      Todos los componentes se adaptan automáticamente al tema actual.
    </p>

    <div className="ig-space-y-6">
      {/* Cards */}
      <div className="ig-grid ig-grid-cols-1 md:ig-grid-cols-2 ig-gap-4">
        <div className="ig-card">
          <div className="ig-card-body">
            <h4 className="ig-font-semibold ig-text-heading">Card Normal</h4>
            <p className="ig-text-body ig-text-sm">Contenido de la card con colores semánticos.</p>
            <button className="ig-btn ig-btn-brand ig-btn-sm ig-mt-2">Acción</button>
          </div>
        </div>

        <div className="ig-card ig-bg-elevated">
          <div className="ig-card-body">
            <h4 className="ig-font-semibold ig-text-heading">Card Elevada</h4>
            <p className="ig-text-body ig-text-sm">Usa bg-elevated para más prominencia.</p>
            <button className="ig-btn ig-btn-outline ig-btn-sm ig-mt-2">Acción</button>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Formulario</h3>
        <div className="ig-space-y-3 ig-max-w-md">
          <input type="text" className="ig-input" placeholder="Input de texto" />
          <select className="ig-select">
            <option>Opción 1</option>
            <option>Opción 2</option>
          </select>
          <div className="ig-flex ig-gap-4">
            <label className="ig-checkbox">
              <input type="checkbox" defaultChecked />
              <span className="ig-checkbox-mark"></span>
              Checkbox
            </label>
            <label className="ig-switch ig-switch-brand">
              <input type="checkbox" defaultChecked />
              <span className="ig-switch-track"></span>
              Switch
            </label>
          </div>
        </div>
      </div>

      {/* Badges y Alerts */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Badges y Alerts</h3>
        <div className="ig-flex ig-flex-wrap ig-gap-2 ig-mb-4">
          <span className="ig-badge ig-badge-brand">Brand</span>
          <span className="ig-badge ig-badge-success">Success</span>
          <span className="ig-badge ig-badge-warning">Warning</span>
          <span className="ig-badge ig-badge-danger">Danger</span>
        </div>
        <div className="ig-alert ig-alert-info">
          <span className="ig-alert-icon">ℹ</span>
          <div className="ig-alert-content">
            <div className="ig-alert-title">Información</div>
            <p>Este alert se adapta al tema actual.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const TextosEnDarkMode = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Textos en Dark Mode</h2>

    <div className="ig-bg-surface ig-p-6 ig-rounded-lg ig-border ig-border-default">
      <article className="ig-prose">
        <h1 className="ig-text-heading">Título Principal</h1>
        <p className="ig-text-body ig-lead">
          Este es un párrafo destacado que usa colores semánticos para máxima legibilidad
          en cualquier tema.
        </p>
        <h2 className="ig-text-heading">Subtítulo</h2>
        <p className="ig-text-body">
          El texto normal usa <code className="ig-bg-muted ig-px-1 ig-rounded">ig-text-body</code>
          que ajusta su color automáticamente. Los enlaces usan
          <a href="#" className="ig-text-brand ig-hover:ig-underline"> colores de marca</a>.
        </p>
        <blockquote className="ig-border-l-4 ig-border-brand ig-pl-4 ig-italic ig-text-muted">
          Las citas usan texto muted para diferenciarse del contenido principal.
        </blockquote>
        <p className="ig-text-muted ig-text-sm">
          Texto secundario para información menos importante.
        </p>
      </article>
    </div>
  </div>
);

export const BuenasPracticasDarkMode = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Buenas Prácticas para Dark Mode</h2>

    <div className="ig-space-y-4">
      {[
        {
          titulo: 'Usar colores semánticos',
          desc: 'Usa ig-text-heading, ig-text-body, ig-bg-surface en lugar de colores específicos.',
        },
        {
          titulo: 'Evitar blancos puros',
          desc: 'El blanco puro (#fff) puede ser demasiado brillante en dark mode.',
        },
        {
          titulo: 'Reducir contraste de sombras',
          desc: 'Las sombras en dark mode deben ser más sutiles.',
        },
        {
          titulo: 'Probar ambos temas',
          desc: 'Siempre verifica que tu UI se vea bien en ambos temas.',
        },
        {
          titulo: 'Usar variables CSS',
          desc: 'Las variables de igoded-design cambian automáticamente entre temas.',
        },
      ].map((item, i) => (
        <div key={i} className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
          <h3 className="ig-font-semibold ig-text-heading ig-mb-1">{item.titulo}</h3>
          <p className="ig-text-body ig-text-sm">{item.desc}</p>
        </div>
      ))}
    </div>
  </div>
);
