import React from 'react';

export default {
  title: 'Avanzado/Has Selector',
};

export const IntroduccionHas = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Selector :has()</h2>
    <p className="ig-text-body ig-mb-6">
      El selector <code className="ig-bg-muted ig-px-1 ig-rounded">:has()</code> permite seleccionar
      un padre basándose en sus hijos. Útil para formularios y componentes interactivos.
    </p>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Clases disponibles</h3>
      <div className="ig-space-y-2">
        <code className="ig-block ig-text-sm ig-text-muted ig-p-2 ig-bg-muted ig-rounded">
          has-[:focus]:ig-* - Cuando algún hijo tiene focus
        </code>
        <code className="ig-block ig-text-sm ig-text-muted ig-p-2 ig-bg-muted ig-rounded">
          has-[:checked]:ig-* - Cuando algún hijo está marcado
        </code>
        <code className="ig-block ig-text-sm ig-text-muted ig-p-2 ig-bg-muted ig-rounded">
          has-[:invalid]:ig-* - Cuando algún hijo es inválido
        </code>
        <code className="ig-block ig-text-sm ig-text-muted ig-p-2 ig-bg-muted ig-rounded">
          has-[:disabled]:ig-* - Cuando algún hijo está deshabilitado
        </code>
      </div>
    </div>
  </div>
);

export const HasFocus = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Has :focus</h2>
    <p className="ig-text-body ig-mb-6">
      El contenedor cambia estilos cuando cualquier hijo tiene focus.
    </p>

    <div className="ig-space-y-4 ig-max-w-md">
      <div className="ig-p-4 ig-bg-surface ig-rounded-lg ig-border-2 ig-border-default has-[:focus]:ig-border-brand has-[:focus]:ig-ring has-[:focus]:ig-ring-brand has-[:focus]:ig-bg-elevated ig-transition-all">
        <label className="ig-form-label">Campo de búsqueda</label>
        <div className="ig-flex ig-gap-2">
          <input type="text" className="ig-input ig-flex-1" placeholder="Buscar..." />
          <button className="ig-btn ig-btn-brand">Buscar</button>
        </div>
        <p className="ig-text-sm ig-text-muted ig-mt-2">
          El contenedor cambia cuando el input tiene focus.
        </p>
      </div>

      <div className="ig-p-4 ig-bg-surface ig-rounded-lg ig-border-2 ig-border-default has-[:focus]:ig-border-brand has-[:focus]:ig-scale-102 ig-transition-all">
        <label className="ig-form-label">Formulario completo</label>
        <input type="text" className="ig-input ig-mb-2" placeholder="Nombre" />
        <input type="email" className="ig-input" placeholder="Email" />
      </div>
    </div>
  </div>
);

export const HasChecked = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Has :checked</h2>
    <p className="ig-text-body ig-mb-6">
      El padre cambia cuando un checkbox o radio hijo está marcado.
    </p>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Selección de plan</h3>
        <div className="ig-grid ig-grid-cols-3 ig-gap-4">
          {[
            { nombre: 'Básico', precio: '$9' },
            { nombre: 'Pro', precio: '$29' },
            { nombre: 'Enterprise', precio: '$99' },
          ].map((plan) => (
            <label
              key={plan.nombre}
              className="ig-relative ig-p-4 ig-border-2 ig-border-default ig-rounded-lg ig-cursor-pointer ig-text-center has-[:checked]:ig-border-brand has-[:checked]:ig-bg-brand/10 ig-transition-all"
            >
              <input type="radio" name="plan-has" className="ig-sr-only" />
              <span className="ig-font-semibold ig-text-heading ig-block">{plan.nombre}</span>
              <span className="ig-text-2xl ig-font-bold ig-text-brand">{plan.precio}</span>
              <span className="ig-text-sm ig-text-muted ig-block">/mes</span>
            </label>
          ))}
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Checkbox con estilo de tarjeta</h3>
        <div className="ig-flex ig-flex-wrap ig-gap-3">
          {['React', 'Vue', 'Angular', 'Svelte'].map((tech) => (
            <label
              key={tech}
              className="ig-px-4 ig-py-2 ig-border-2 ig-border-default ig-rounded-full ig-cursor-pointer has-[:checked]:ig-border-brand has-[:checked]:ig-bg-brand has-[:checked]:ig-text-on-brand ig-transition-all"
            >
              <input type="checkbox" className="ig-sr-only" />
              {tech}
            </label>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const HasInvalid = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Has :invalid</h2>
    <p className="ig-text-body ig-mb-6">
      El contenedor muestra error cuando algún input hijo es inválido.
    </p>

    <div className="ig-space-y-4 ig-max-w-md">
      <div className="ig-p-4 ig-bg-surface ig-rounded-lg ig-border-2 ig-border-default has-[:invalid]:ig-border-danger has-[:invalid]:ig-bg-danger/10 ig-transition-all">
        <label className="ig-form-label">Email (requerido)</label>
        <input
          type="email"
          className="ig-input"
          placeholder="tu@email.com"
          required
        />
        <p className="ig-text-sm ig-text-danger ig-mt-1 ig-hidden has-[:invalid]:ig-block">
          Por favor ingresa un email válido.
        </p>
      </div>

      <div className="ig-p-4 ig-bg-surface ig-rounded-lg ig-border-2 ig-border-default has-[:invalid]:ig-border-danger has-[:invalid]:ig-ring-danger ig-transition-all">
        <label className="ig-form-label">Contraseña (mín. 8 caracteres)</label>
        <input
          type="password"
          className="ig-input"
          minLength={8}
          required
          placeholder="••••••••"
        />
      </div>
    </div>
  </div>
);

export const HasDisabled = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Has :disabled</h2>
    <p className="ig-text-body ig-mb-6">
      El contenedor refleja el estado deshabilitado de sus hijos.
    </p>

    <div className="ig-grid ig-grid-cols-1 ig-md:ig-grid-cols-2 ig-gap-4">
      <div className="ig-p-4 ig-bg-surface ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-2">Campo activo</h3>
        <input type="text" className="ig-input" placeholder="Puedes escribir aquí" />
      </div>

      <div className="ig-p-4 ig-bg-surface ig-rounded-lg ig-border ig-border-default has-[:disabled]:ig-opacity-50 has-[:disabled]:ig-cursor-not-allowed">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-2">Campo deshabilitado</h3>
        <input type="text" className="ig-input" disabled placeholder="No disponible" />
      </div>
    </div>
  </div>
);

export const CombinacionesHas = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Combinaciones de :has()</h2>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default ig-max-w-md">
      <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Formulario inteligente</h3>

      <form className="ig-space-y-4">
        <div className="ig-p-3 ig-border ig-border-default ig-rounded has-[:focus]:ig-border-brand has-[:invalid]:ig-border-danger ig-transition-all">
          <label className="ig-text-sm ig-text-muted ig-block ig-mb-1">Nombre</label>
          <input
            type="text"
            className="ig-w-full ig-bg-transparent ig-outline-none ig-text-body"
            required
            minLength={2}
            placeholder="Tu nombre"
          />
        </div>

        <div className="ig-p-3 ig-border ig-border-default ig-rounded has-[:focus]:ig-border-brand has-[:invalid]:ig-border-danger ig-transition-all">
          <label className="ig-text-sm ig-text-muted ig-block ig-mb-1">Email</label>
          <input
            type="email"
            className="ig-w-full ig-bg-transparent ig-outline-none ig-text-body"
            required
            placeholder="tu@email.com"
          />
        </div>

        <label className="ig-flex ig-items-center ig-gap-2 ig-p-3 ig-border ig-border-default ig-rounded ig-cursor-pointer has-[:checked]:ig-border-success has-[:checked]:ig-bg-success/10 ig-transition-all">
          <input type="checkbox" className="ig-accent-success" />
          <span className="ig-text-body">Acepto los términos</span>
        </label>

        <button type="button" className="ig-btn ig-btn-brand ig-w-full">
          Enviar
        </button>
      </form>
    </div>
  </div>
);
