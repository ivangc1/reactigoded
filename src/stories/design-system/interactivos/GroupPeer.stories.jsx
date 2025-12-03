import React from 'react';

export default {
  title: 'Interactivos/Group y Peer',
};

export const GroupHover = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Group Hover</h2>
    <p className="ig-text-body ig-mb-6">
      Usa <code className="ig-bg-muted ig-px-1 ig-rounded">ig-group</code> en el padre y
      <code className="ig-bg-muted ig-px-1 ig-rounded">group-hover:*</code> en los hijos.
    </p>

    <div className="ig-grid ig-grid-cols-1 ig-md:ig-grid-cols-2 ig-gap-6">
      <div className="ig-group ig-card ig-cursor-pointer">
        <div className="ig-card-body">
          <h3 className="ig-font-semibold ig-text-heading ig-group-hover:ig-text-brand ig-transition-colors">
            Título que cambia color
          </h3>
          <p className="ig-text-body ig-text-sm ig-group-hover:ig-text-heading ig-transition-colors">
            El texto también cambia al hacer hover en la card.
          </p>
          <span className="ig-inline-flex ig-items-center ig-gap-1 ig-mt-2 ig-text-brand ig-text-sm">
            Ver más
            <span className="ig-inline-block ig-transition-transform ig-group-hover:ig-translate-x-1">→</span>
          </span>
        </div>
      </div>

      <div className="ig-group ig-card ig-cursor-pointer ig-overflow-hidden">
        <div className="ig-h-32 ig-bg-brand ig-transition-transform ig-duration-500 ig-group-hover:ig-scale-110"></div>
        <div className="ig-card-body">
          <h3 className="ig-font-semibold ig-text-heading">Imagen con zoom</h3>
          <p className="ig-text-body ig-text-sm">La imagen hace zoom al hover del grupo.</p>
        </div>
      </div>

      <div className="ig-group ig-card ig-cursor-pointer">
        <div className="ig-card-body ig-relative">
          <h3 className="ig-font-semibold ig-text-heading">Revelar contenido</h3>
          <p className="ig-text-body ig-text-sm ig-mb-8">Hover para ver los botones ocultos.</p>
          <div className="ig-absolute ig-bottom-4 ig-left-4 ig-right-4 ig-flex ig-gap-2 ig-opacity-0 ig-group-hover:ig-opacity-100 ig-transition-opacity">
            <button className="ig-btn ig-btn-brand ig-btn-sm ig-flex-1">Editar</button>
            <button className="ig-btn ig-btn-outline ig-btn-sm ig-flex-1">Ver</button>
          </div>
        </div>
      </div>

      <div className="ig-group ig-card ig-cursor-pointer ig-hover:ig-shadow-xl ig-hover:ig-border-brand ig-transition-all">
        <div className="ig-card-body">
          <h3 className="ig-font-semibold ig-text-heading">Card con borde</h3>
          <p className="ig-text-body ig-text-sm">
            El borde y sombra cambian al hover del grupo.
          </p>
          <div className="ig-mt-2 ig-w-0 ig-h-1 ig-bg-brand ig-group-hover:ig-w-full ig-transition-all ig-duration-300"></div>
        </div>
      </div>
    </div>
  </div>
);

export const GroupFocus = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Group Focus</h2>

    <div className="ig-space-y-4 ig-max-w-md">
      <div className="ig-group ig-relative">
        <input
          type="text"
          className="ig-input ig-peer"
          placeholder="Input con label animado"
        />
        <label className="ig-absolute ig-left-3 ig--top-2.5 ig-bg-surface ig-px-1 ig-text-sm ig-text-muted ig-group-focus-within:ig-text-brand ig-transition-colors">
          Email
        </label>
      </div>
    </div>
  </div>
);

export const PeerBasico = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Peer Básico</h2>
    <p className="ig-text-body ig-mb-6">
      Usa <code className="ig-bg-muted ig-px-1 ig-rounded">ig-peer</code> en un elemento y
      <code className="ig-bg-muted ig-px-1 ig-rounded">peer-*:</code> en elementos hermanos siguientes.
    </p>

    <div className="ig-space-y-6 ig-max-w-md">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Peer Focus</h3>
        <div className="ig-relative">
          <input
            type="text"
            className="ig-peer ig-input"
            placeholder=" "
            id="peer-input"
          />
          <label
            htmlFor="peer-input"
            className="ig-absolute ig-left-3 ig-top-2.5 ig-text-muted ig-transition-all ig-peer-focus:ig--translate-y-6 ig-peer-focus:ig-scale-75 ig-peer-focus:ig-text-brand ig-peer-placeholder-shown:ig-translate-y-0 ig-peer-placeholder-shown:ig-scale-100"
          >
            Escribe algo
          </label>
        </div>
        <p className="ig-text-sm ig-text-muted ig-mt-2">
          El label se mueve y cambia color cuando el input tiene focus.
        </p>
      </div>
    </div>
  </div>
);

export const PeerChecked = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Peer Checked</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Checkbox personalizado</h3>
        <div className="ig-flex ig-flex-wrap ig-gap-4">
          {['Opción A', 'Opción B', 'Opción C'].map((opcion) => (
            <label key={opcion} className="ig-relative ig-cursor-pointer">
              <input type="checkbox" className="ig-peer ig-sr-only" />
              <span className="ig-block ig-px-4 ig-py-2 ig-border-2 ig-border-default ig-rounded-lg ig-peer-checked:ig-border-brand ig-peer-checked:ig-bg-brand/10 ig-peer-checked:ig-text-brand ig-transition-all">
                {opcion}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Radio cards</h3>
        <div className="ig-grid ig-grid-cols-3 ig-gap-4">
          {[
            { nombre: 'Básico', precio: '$9' },
            { nombre: 'Pro', precio: '$29' },
            { nombre: 'Enterprise', precio: '$99' },
          ].map((plan, i) => (
            <label key={plan.nombre} className="ig-relative ig-cursor-pointer">
              <input
                type="radio"
                name="plan"
                className="ig-peer ig-sr-only"
                defaultChecked={i === 1}
              />
              <span className="ig-block ig-p-4 ig-border-2 ig-border-default ig-rounded-lg ig-text-center ig-peer-checked:ig-border-brand ig-peer-checked:ig-bg-brand/10 ig-transition-all">
                <span className="ig-block ig-font-semibold ig-text-heading ig-peer-checked:ig-text-brand">
                  {plan.nombre}
                </span>
                <span className="ig-block ig-text-2xl ig-font-bold ig-text-brand">{plan.precio}</span>
                <span className="ig-block ig-text-xs ig-text-muted">por mes</span>
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const PeerInvalid = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Peer Invalid/Valid</h2>

    <div className="ig-space-y-6 ig-max-w-md">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Validación en tiempo real</h3>
        <div>
          <label className="ig-form-label">Email (requerido)</label>
          <input
            type="email"
            className="ig-peer ig-input"
            placeholder="tu@email.com"
            required
          />
          <p className="ig-text-sm ig-text-danger ig-mt-1 ig-hidden ig-peer-invalid:ig-block">
            Por favor ingresa un email válido.
          </p>
          <p className="ig-text-sm ig-text-success ig-mt-1 ig-hidden ig-peer-valid:ig-block">
            ✓ Email válido
          </p>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Campo con mínimo</h3>
        <div>
          <label className="ig-form-label">Nombre (mín. 3 caracteres)</label>
          <input
            type="text"
            className="ig-peer ig-input ig-peer-invalid:ig-border-danger ig-peer-valid:ig-border-success"
            minLength={3}
            required
            placeholder="Tu nombre"
          />
          <p className="ig-text-sm ig-text-danger ig-mt-1 ig-opacity-0 ig-peer-invalid:ig-opacity-100 ig-transition-opacity">
            El nombre debe tener al menos 3 caracteres.
          </p>
        </div>
      </div>
    </div>
  </div>
);

export const PeerDisabled = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Peer Disabled</h2>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default ig-max-w-md">
      <div className="ig-space-y-4">
        <div>
          <div className="ig-flex ig-items-center ig-gap-2">
            <input type="checkbox" className="ig-peer" id="enable-field" />
            <label htmlFor="enable-field" className="ig-text-body">
              Habilitar campo adicional
            </label>
          </div>
          <input
            type="text"
            className="ig-input ig-mt-2 ig-peer-checked:ig-opacity-100 ig-opacity-50 ig-transition-opacity"
            placeholder="Campo condicional"
            disabled
          />
        </div>
      </div>
    </div>
  </div>
);

export const EjemploCompleto = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Ejemplo Completo: Formulario Interactivo</h2>

    <form className="ig-bg-surface ig-p-6 ig-rounded-lg ig-border ig-border-default ig-max-w-md ig-space-y-6">
      {/* Campo con label flotante */}
      <div className="ig-relative">
        <input
          type="text"
          id="nombre-completo"
          className="ig-peer ig-input ig-pt-5"
          placeholder=" "
        />
        <label
          htmlFor="nombre-completo"
          className="ig-absolute ig-left-3 ig-top-4 ig-text-muted ig-text-sm ig-transition-all ig-origin-left ig-peer-placeholder-shown:ig-top-4 ig-peer-placeholder-shown:ig-text-base ig-peer-focus:ig-top-1 ig-peer-focus:ig-text-xs ig-peer-focus:ig-text-brand ig-peer-not-placeholder-shown:ig-top-1 ig-peer-not-placeholder-shown:ig-text-xs"
        >
          Nombre completo
        </label>
      </div>

      {/* Selección de plan con peer */}
      <div>
        <label className="ig-form-label ig-mb-3 ig-block">Selecciona tu plan</label>
        <div className="ig-grid ig-grid-cols-2 ig-gap-3">
          {[
            { id: 'mensual', nombre: 'Mensual', precio: '$10/mes' },
            { id: 'anual', nombre: 'Anual', precio: '$100/año' },
          ].map((plan) => (
            <label key={plan.id} className="ig-cursor-pointer">
              <input
                type="radio"
                name="plan-form"
                value={plan.id}
                className="ig-peer ig-sr-only"
              />
              <span className="ig-block ig-p-3 ig-border-2 ig-border-default ig-rounded-lg ig-peer-checked:ig-border-brand ig-peer-checked:ig-bg-brand/10 ig-transition-all ig-text-center">
                <span className="ig-font-medium ig-text-body">{plan.nombre}</span>
                <span className="ig-block ig-text-sm ig-text-muted">{plan.precio}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Card interactiva con group */}
      <div className="ig-group ig-border ig-border-default ig-rounded-lg ig-p-4 ig-cursor-pointer ig-hover:ig-border-brand ig-hover:ig-shadow-md ig-transition-all">
        <div className="ig-flex ig-items-center ig-gap-3">
          <div className="ig-w-10 ig-h-10 ig-bg-brand/20 ig-rounded-full ig-flex ig-items-center ig-justify-center ig-group-hover:ig-bg-brand ig-transition-colors">
            <span className="ig-text-brand ig-group-hover:ig-text-white ig-transition-colors">★</span>
          </div>
          <div>
            <h4 className="ig-font-medium ig-text-body ig-group-hover:ig-text-brand ig-transition-colors">
              Activar notificaciones
            </h4>
            <p className="ig-text-sm ig-text-muted">
              Recibe alertas sobre tu cuenta
            </p>
          </div>
        </div>
      </div>

      <button type="button" className="ig-btn ig-btn-brand ig-w-full">
        Guardar cambios
      </button>
    </form>
  </div>
);
