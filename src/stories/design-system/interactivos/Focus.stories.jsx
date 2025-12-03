import React from 'react';

export default {
  title: 'Interactivos/Focus',
};

export const FocusBasico = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Focus Básico</h2>
    <p className="ig-text-body ig-mb-6">
      Usa Tab para navegar y ver los estilos de focus.
    </p>

    <div className="ig-space-y-4 ig-max-w-md">
      <input
        type="text"
        className="ig-input focus:ig-ring-2 focus:ig-ring-brand focus:ig-border-brand"
        placeholder="Focus con ring brand"
      />

      <input
        type="text"
        className="ig-input focus:ig-ring-2 focus:ig-ring-secondary focus:ig-border-secondary"
        placeholder="Focus con ring secondary"
      />

      <input
        type="text"
        className="ig-input focus:ig-ring-2 focus:ig-ring-success focus:ig-border-success"
        placeholder="Focus con ring success"
      />
    </div>
  </div>
);

export const FocusRing = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Focus Ring</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-4">
      <button className="ig-btn ig-btn-brand focus:ig-ring-2 focus:ig-ring-brand focus:ig-ring-offset-2">
        Ring con offset
      </button>

      <button className="ig-btn ig-btn-secondary focus:ig-ring-4 focus:ig-ring-secondary">
        Ring grande
      </button>

      <button className="ig-btn ig-btn-outline focus:ig-ring-2 focus:ig-ring-brand focus:ig-ring-inset">
        Ring inset
      </button>
    </div>
  </div>
);

export const FocusVisible = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Focus Visible</h2>
    <p className="ig-text-body ig-mb-6">
      <code className="ig-bg-muted ig-px-1 ig-rounded">focus-visible:ig-*</code> solo muestra
      el estilo cuando se navega con teclado, no al hacer clic.
    </p>

    <div className="ig-flex ig-flex-wrap ig-gap-4">
      <button className="ig-btn ig-btn-brand focus-visible:ig-ring-2 focus-visible:ig-ring-offset-2 focus-visible:ig-ring-brand ig-outline-none">
        Focus visible (teclado)
      </button>

      <button className="ig-btn ig-btn-secondary focus:ig-ring-2 focus:ig-ring-offset-2 focus:ig-ring-secondary ig-outline-none">
        Focus normal (clic y teclado)
      </button>
    </div>

    <p className="ig-text-sm ig-text-muted ig-mt-4">
      Haz clic vs usa Tab para ver la diferencia.
    </p>
  </div>
);

export const FocusWithin = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Focus Within</h2>
    <p className="ig-text-body ig-mb-6">
      <code className="ig-bg-muted ig-px-1 ig-rounded">focus-within:ig-*</code> aplica estilos
      al padre cuando cualquier hijo tiene focus.
    </p>

    <div className="ig-space-y-6 ig-max-w-md">
      <div className="ig-p-4 ig-bg-surface ig-rounded-lg ig-border-2 ig-border-subtle focus-within:ig-border-brand focus-within:ig-shadow-lg ig-transition-all">
        <label className="ig-form-label">Formulario con focus-within</label>
        <input type="text" className="ig-input" placeholder="Haz focus aquí" />
        <p className="ig-text-sm ig-text-muted ig-mt-2">
          El contenedor cambia cuando el input tiene focus.
        </p>
      </div>

      <div className="ig-p-4 ig-bg-surface ig-rounded-lg ig-border ig-border-default focus-within:ig-ring-2 focus-within:ig-ring-brand">
        <div className="ig-flex ig-gap-2">
          <input type="text" className="ig-input ig-flex-1" placeholder="Buscar..." />
          <button className="ig-btn ig-btn-brand">Buscar</button>
        </div>
      </div>
    </div>
  </div>
);

export const FocusEnFormularios = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Focus en Formularios</h2>

    <form className="ig-bg-surface ig-p-6 ig-rounded-lg ig-border ig-border-default ig-max-w-md ig-space-y-4">
      <div>
        <label className="ig-form-label">Nombre</label>
        <input
          type="text"
          className="ig-input focus:ig-ring-2 focus:ig-ring-brand focus:ig-border-brand"
          placeholder="Tu nombre"
        />
      </div>

      <div>
        <label className="ig-form-label">Email</label>
        <input
          type="email"
          className="ig-input focus:ig-ring-2 focus:ig-ring-brand focus:ig-border-brand"
          placeholder="tu@email.com"
        />
      </div>

      <div>
        <label className="ig-form-label">Mensaje</label>
        <textarea
          className="ig-textarea focus:ig-ring-2 focus:ig-ring-brand focus:ig-border-brand"
          rows={3}
          placeholder="Tu mensaje"
        ></textarea>
      </div>

      <div>
        <label className="ig-form-label">País</label>
        <select className="ig-select focus:ig-ring-2 focus:ig-ring-brand focus:ig-border-brand">
          <option>España</option>
          <option>México</option>
          <option>Argentina</option>
        </select>
      </div>

      <button type="button" className="ig-btn ig-btn-brand ig-w-full focus:ig-ring-2 focus:ig-ring-offset-2 focus:ig-ring-brand">
        Enviar
      </button>
    </form>
  </div>
);

export const OutlineVsRing = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Outline vs Ring</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Outline nativo</h3>
        <button className="ig-btn ig-btn-brand focus:ig-outline-2 focus:ig-outline-offset-2 focus:ig-outline-brand">
          Con outline
        </button>
        <p className="ig-text-sm ig-text-muted ig-mt-2">
          El outline es nativo del navegador.
        </p>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Ring (box-shadow)</h3>
        <button className="ig-btn ig-btn-brand focus:ig-ring-2 focus:ig-ring-offset-2 focus:ig-ring-brand ig-outline-none">
          Con ring
        </button>
        <p className="ig-text-sm ig-text-muted ig-mt-2">
          Ring usa box-shadow, permite más personalización.
        </p>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Sin indicador (no recomendado)</h3>
        <button className="ig-btn ig-btn-brand ig-outline-none focus:ig-outline-none">
          Sin focus visible
        </button>
        <p className="ig-text-sm ig-text-danger ig-mt-2">
          Evita esto, afecta la accesibilidad.
        </p>
      </div>
    </div>
  </div>
);

export const FocusConTransiciones = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Focus con Transiciones</h2>

    <div className="ig-space-y-4 ig-max-w-md">
      <input
        type="text"
        className="ig-input ig-transition-all ig-duration-200 focus:ig-ring-2 focus:ig-ring-brand focus:ig-shadow-lg focus:ig-scale-[1.02]"
        placeholder="Input que crece y brilla"
      />

      <button className="ig-btn ig-btn-outline ig-w-full ig-transition-all ig-duration-200 focus:ig-bg-brand focus:ig-text-on-brand focus:ig-border-brand focus:ig-ring-2 focus:ig-ring-brand focus:ig-ring-offset-2">
        Botón que se rellena
      </button>

      <div className="ig-flex ig-gap-2">
        {['A', 'B', 'C', 'D'].map((letra) => (
          <button
            key={letra}
            className="ig-w-12 ig-h-12 ig-bg-surface ig-border ig-border-default ig-rounded ig-transition-all ig-duration-200 focus:ig-bg-brand focus:ig-text-on-brand focus:ig-scale-110 focus:ig-ring-2 focus:ig-ring-brand"
          >
            {letra}
          </button>
        ))}
      </div>
    </div>
  </div>
);

export const TabIndex = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tab Index</h2>
    <p className="ig-text-body ig-mb-6">
      Controla el orden de navegación con teclado.
    </p>

    <div className="ig-space-y-4">
      <div className="ig-flex ig-gap-4">
        <button className="ig-btn ig-btn-outline" tabIndex={3}>Tab 3</button>
        <button className="ig-btn ig-btn-outline" tabIndex={1}>Tab 1</button>
        <button className="ig-btn ig-btn-outline" tabIndex={2}>Tab 2</button>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <pre className="ig-text-sm ig-text-body ig-bg-muted ig-p-4 ig-rounded ig-overflow-x-auto">
{`<!-- Orden personalizado -->
<button tabindex="3">Tab 3</button>
<button tabindex="1">Tab 1</button>
<button tabindex="2">Tab 2</button>

<!-- No focuseable -->
<div tabindex="-1">No se puede enfocar con Tab</div>

<!-- Focuseable que no lo sería por defecto -->
<div tabindex="0">Ahora es focuseable</div>`}
        </pre>
      </div>
    </div>
  </div>
);
