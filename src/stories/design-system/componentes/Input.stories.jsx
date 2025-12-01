import React from 'react';

export default {
  title: 'Componentes/Input',
};

export const TiposDeInput = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tipos de Input</h2>

    <div className="ig-space-y-4 ig-max-w-md">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <label className="ig-block ig-text-sm ig-font-medium ig-text-body ig-mb-2">Texto</label>
        <input type="text" className="ig-input" placeholder="Escribe algo..." />
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <label className="ig-block ig-text-sm ig-font-medium ig-text-body ig-mb-2">Email</label>
        <input type="email" className="ig-input" placeholder="correo@ejemplo.com" />
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <label className="ig-block ig-text-sm ig-font-medium ig-text-body ig-mb-2">Password</label>
        <input type="password" className="ig-input" placeholder="••••••••" />
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <label className="ig-block ig-text-sm ig-font-medium ig-text-body ig-mb-2">Número</label>
        <input type="number" className="ig-input" placeholder="0" />
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <label className="ig-block ig-text-sm ig-font-medium ig-text-body ig-mb-2">Fecha</label>
        <input type="date" className="ig-input" />
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <label className="ig-block ig-text-sm ig-font-medium ig-text-body ig-mb-2">Search</label>
        <input type="search" className="ig-input" placeholder="Buscar..." />
      </div>
    </div>
  </div>
);

export const Estados = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Estados de Input</h2>

    <div className="ig-space-y-4 ig-max-w-md">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <label className="ig-block ig-text-sm ig-font-medium ig-text-body ig-mb-2">Normal</label>
        <input type="text" className="ig-input" placeholder="Input normal" />
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <label className="ig-block ig-text-sm ig-font-medium ig-text-body ig-mb-2">Disabled</label>
        <input type="text" className="ig-input" placeholder="Input deshabilitado" disabled />
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <label className="ig-block ig-text-sm ig-font-medium ig-text-body ig-mb-2">Readonly</label>
        <input type="text" className="ig-input" value="Valor de solo lectura" readOnly />
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <label className="ig-block ig-text-sm ig-font-medium ig-text-success ig-mb-2">Válido</label>
        <input type="text" className="ig-input ig-input-valid" value="Correcto" />
        <p className="ig-text-sm ig-text-success ig-mt-1">✓ Campo válido</p>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <label className="ig-block ig-text-sm ig-font-medium ig-text-danger ig-mb-2">Inválido</label>
        <input type="text" className="ig-input ig-input-invalid" value="Error" />
        <p className="ig-text-sm ig-text-danger ig-mt-1">✕ Este campo es requerido</p>
      </div>
    </div>
  </div>
);

export const Tamanos = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tamaños de Input</h2>

    <div className="ig-space-y-4 ig-max-w-md">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <label className="ig-block ig-text-sm ig-font-medium ig-text-body ig-mb-2">Pequeño (ig-input-sm)</label>
        <input type="text" className="ig-input ig-input-sm" placeholder="Input pequeño" />
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <label className="ig-block ig-text-sm ig-font-medium ig-text-body ig-mb-2">Normal</label>
        <input type="text" className="ig-input" placeholder="Input normal" />
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <label className="ig-block ig-text-sm ig-font-medium ig-text-body ig-mb-2">Grande (ig-input-lg)</label>
        <input type="text" className="ig-input ig-input-lg" placeholder="Input grande" />
      </div>
    </div>
  </div>
);

export const Textarea = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Textarea</h2>

    <div className="ig-space-y-4 ig-max-w-md">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <label className="ig-block ig-text-sm ig-font-medium ig-text-body ig-mb-2">Textarea normal</label>
        <textarea className="ig-textarea" rows="4" placeholder="Escribe aquí tu mensaje..."></textarea>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <label className="ig-block ig-text-sm ig-font-medium ig-text-body ig-mb-2">Textarea disabled</label>
        <textarea className="ig-textarea" rows="4" disabled placeholder="Textarea deshabilitado"></textarea>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <label className="ig-block ig-text-sm ig-font-medium ig-text-body ig-mb-2">Con resize</label>
        <textarea className="ig-textarea ig-resize" rows="3" placeholder="Puedes redimensionarme"></textarea>
      </div>
    </div>
  </div>
);

export const InputConIcono = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Input con Icono</h2>

    <div className="ig-space-y-4 ig-max-w-md">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <label className="ig-block ig-text-sm ig-font-medium ig-text-body ig-mb-2">Icono a la izquierda</label>
        <div className="ig-input-group">
          <span className="ig-input-icon ig-input-icon-left">🔍</span>
          <input type="text" className="ig-input ig-pl-10" placeholder="Buscar..." />
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <label className="ig-block ig-text-sm ig-font-medium ig-text-body ig-mb-2">Icono a la derecha</label>
        <div className="ig-input-group">
          <input type="text" className="ig-input ig-pr-10" placeholder="Email" />
          <span className="ig-input-icon ig-input-icon-right">✉️</span>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <label className="ig-block ig-text-sm ig-font-medium ig-text-body ig-mb-2">Ambos lados</label>
        <div className="ig-input-group">
          <span className="ig-input-icon ig-input-icon-left">💳</span>
          <input type="text" className="ig-input ig-px-10" placeholder="Número de tarjeta" />
          <span className="ig-input-icon ig-input-icon-right">🔒</span>
        </div>
      </div>
    </div>
  </div>
);

export const InputConAddon = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Input con Addon</h2>

    <div className="ig-space-y-4 ig-max-w-md">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <label className="ig-block ig-text-sm ig-font-medium ig-text-body ig-mb-2">Addon izquierdo</label>
        <div className="ig-flex">
          <span className="ig-input-addon ig-input-addon-left">https://</span>
          <input type="text" className="ig-input ig-rounded-l-none" placeholder="ejemplo.com" />
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <label className="ig-block ig-text-sm ig-font-medium ig-text-body ig-mb-2">Addon derecho</label>
        <div className="ig-flex">
          <input type="text" className="ig-input ig-rounded-r-none" placeholder="usuario" />
          <span className="ig-input-addon ig-input-addon-right">@gmail.com</span>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <label className="ig-block ig-text-sm ig-font-medium ig-text-body ig-mb-2">Con botón</label>
        <div className="ig-flex">
          <input type="text" className="ig-input ig-rounded-r-none" placeholder="Buscar productos..." />
          <button className="ig-btn ig-btn-brand ig-rounded-l-none">Buscar</button>
        </div>
      </div>
    </div>
  </div>
);

export const FormularioCompleto = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Formulario Completo</h2>

    <form className="ig-max-w-md ig-space-y-4">
      <div className="ig-bg-surface ig-p-6 ig-rounded-lg ig-border ig-border-default ig-space-y-4">
        <h3 className="ig-text-lg ig-font-semibold ig-text-heading">Crear cuenta</h3>

        <div>
          <label className="ig-block ig-text-sm ig-font-medium ig-text-body ig-mb-1">Nombre completo</label>
          <input type="text" className="ig-input" placeholder="Juan Pérez" />
        </div>

        <div>
          <label className="ig-block ig-text-sm ig-font-medium ig-text-body ig-mb-1">Email</label>
          <input type="email" className="ig-input" placeholder="juan@ejemplo.com" />
        </div>

        <div>
          <label className="ig-block ig-text-sm ig-font-medium ig-text-body ig-mb-1">Contraseña</label>
          <input type="password" className="ig-input" placeholder="••••••••" />
          <p className="ig-text-xs ig-text-muted ig-mt-1">Mínimo 8 caracteres</p>
        </div>

        <div>
          <label className="ig-block ig-text-sm ig-font-medium ig-text-body ig-mb-1">Bio</label>
          <textarea className="ig-textarea" rows="3" placeholder="Cuéntanos sobre ti..."></textarea>
        </div>

        <div className="ig-flex ig-gap-3 ig-pt-2">
          <button type="submit" className="ig-btn ig-btn-brand ig-flex-1">Crear cuenta</button>
          <button type="button" className="ig-btn ig-btn-ghost">Cancelar</button>
        </div>
      </div>
    </form>
  </div>
);
