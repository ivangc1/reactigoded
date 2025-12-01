import React from 'react';
import { Input, Label, Helper, Error, InputGroup, InputAddon } from '../../../components/Input/Input';
import { Button } from '../../../components/Button/Button';

export default {
  title: 'Componentes/Input',
  component: Input,
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', undefined, 'lg'],
    },
    error: { control: 'boolean' },
    success: { control: 'boolean' },
  },
};

export const TiposDeInput = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tipos de Input</h2>

    <div className="ig-space-y-4 ig-max-w-md">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <Label>Texto</Label>
        <Input type="text" placeholder="Escribe algo..." />
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <Label>Email</Label>
        <Input type="email" placeholder="correo@ejemplo.com" />
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <Label>Password</Label>
        <Input type="password" placeholder="••••••••" />
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <Label>Número</Label>
        <Input type="number" placeholder="0" />
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <Label>Fecha</Label>
        <Input type="date" />
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <Label>Search</Label>
        <Input type="search" placeholder="Buscar..." />
      </div>
    </div>
  </div>
);

export const Estados = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Estados de Input</h2>

    <div className="ig-space-y-4 ig-max-w-md">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <Label>Normal</Label>
        <Input placeholder="Input normal" />
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <Label>Disabled</Label>
        <Input placeholder="Input deshabilitado" disabled />
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <Label>Readonly</Label>
        <Input value="Valor de solo lectura" readOnly />
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <Label className="ig-text-success">Válido</Label>
        <Input success value="Correcto" />
        <Helper className="ig-text-success">✓ Campo válido</Helper>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <Label className="ig-text-danger">Inválido</Label>
        <Input error value="Error" />
        <Error>✕ Este campo es requerido</Error>
      </div>
    </div>
  </div>
);

export const Tamanos = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tamaños de Input</h2>

    <div className="ig-space-y-4 ig-max-w-md">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <Label>Pequeño (sm)</Label>
        <Input size="sm" placeholder="Input pequeño" />
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <Label>Normal</Label>
        <Input placeholder="Input normal" />
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <Label>Grande (lg)</Label>
        <Input size="lg" placeholder="Input grande" />
      </div>
    </div>
  </div>
);

export const Textarea = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Textarea</h2>

    <div className="ig-space-y-4 ig-max-w-md">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <Label>Textarea normal</Label>
        <textarea className="ig-textarea" rows="4" placeholder="Escribe aquí tu mensaje..."></textarea>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <Label>Textarea disabled</Label>
        <textarea className="ig-textarea" rows="4" disabled placeholder="Textarea deshabilitado"></textarea>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <Label>Con resize</Label>
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
        <Label>Icono a la izquierda</Label>
        <InputGroup>
          <span className="ig-input-icon ig-input-icon-left">🔍</span>
          <Input className="ig-pl-10" placeholder="Buscar..." />
        </InputGroup>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <Label>Icono a la derecha</Label>
        <InputGroup>
          <Input className="ig-pr-10" placeholder="Email" />
          <span className="ig-input-icon ig-input-icon-right">✉️</span>
        </InputGroup>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <Label>Ambos lados</Label>
        <InputGroup>
          <span className="ig-input-icon ig-input-icon-left">💳</span>
          <Input className="ig-px-10" placeholder="Número de tarjeta" />
          <span className="ig-input-icon ig-input-icon-right">🔒</span>
        </InputGroup>
      </div>
    </div>
  </div>
);

export const InputConAddon = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Input con Addon</h2>

    <div className="ig-space-y-4 ig-max-w-md">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <Label>Addon izquierdo</Label>
        <div className="ig-flex">
          <InputAddon className="ig-rounded-r-none">https://</InputAddon>
          <Input className="ig-rounded-l-none" placeholder="ejemplo.com" />
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <Label>Addon derecho</Label>
        <div className="ig-flex">
          <Input className="ig-rounded-r-none" placeholder="usuario" />
          <InputAddon className="ig-rounded-l-none">@gmail.com</InputAddon>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <Label>Con botón</Label>
        <div className="ig-flex">
          <Input className="ig-rounded-r-none" placeholder="Buscar productos..." />
          <Button variant="brand" className="ig-rounded-l-none">Buscar</Button>
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
          <Label required>Nombre completo</Label>
          <Input placeholder="Juan Pérez" />
        </div>

        <div>
          <Label required>Email</Label>
          <Input type="email" placeholder="juan@ejemplo.com" />
        </div>

        <div>
          <Label required>Contraseña</Label>
          <Input type="password" placeholder="••••••••" />
          <Helper>Mínimo 8 caracteres</Helper>
        </div>

        <div>
          <Label>Bio</Label>
          <textarea className="ig-textarea" rows="3" placeholder="Cuéntanos sobre ti..."></textarea>
        </div>

        <div className="ig-flex ig-gap-3 ig-pt-2">
          <Button variant="brand" className="ig-flex-1">Crear cuenta</Button>
          <Button variant="ghost">Cancelar</Button>
        </div>
      </div>
    </form>
  </div>
);

export const Playground = {
  args: {
    placeholder: 'Escribe algo...',
    size: undefined,
    error: false,
    success: false,
    disabled: false,
  },
};
