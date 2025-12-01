import React from 'react';

export default {
  title: 'Componentes/Checkbox',
};

export const CheckboxBasico = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Checkbox Básico</h2>

    <div className="ig-space-y-4">
      <label className="ig-checkbox">
        <input type="checkbox" />
        <span className="ig-checkbox-mark"></span>
        Opción sin marcar
      </label>

      <label className="ig-checkbox">
        <input type="checkbox" defaultChecked />
        <span className="ig-checkbox-mark"></span>
        Opción marcada
      </label>

      <label className="ig-checkbox">
        <input type="checkbox" disabled />
        <span className="ig-checkbox-mark"></span>
        Opción deshabilitada
      </label>

      <label className="ig-checkbox">
        <input type="checkbox" defaultChecked disabled />
        <span className="ig-checkbox-mark"></span>
        Marcada y deshabilitada
      </label>
    </div>
  </div>
);

export const VariantesDeColor = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Variantes de Color</h2>

    <div className="ig-space-y-4">
      <label className="ig-checkbox ig-checkbox-brand">
        <input type="checkbox" defaultChecked />
        <span className="ig-checkbox-mark"></span>
        Checkbox Brand (vitreus)
      </label>

      <label className="ig-checkbox ig-checkbox-secondary">
        <input type="checkbox" defaultChecked />
        <span className="ig-checkbox-mark"></span>
        Checkbox Secondary (axis)
      </label>

      <label className="ig-checkbox ig-checkbox-success">
        <input type="checkbox" defaultChecked />
        <span className="ig-checkbox-mark"></span>
        Checkbox Success (laurus)
      </label>

      <label className="ig-checkbox ig-checkbox-warning">
        <input type="checkbox" defaultChecked />
        <span className="ig-checkbox-mark"></span>
        Checkbox Warning (rutilus)
      </label>

      <label className="ig-checkbox ig-checkbox-danger">
        <input type="checkbox" defaultChecked />
        <span className="ig-checkbox-mark"></span>
        Checkbox Danger (malum)
      </label>

      <label className="ig-checkbox ig-checkbox-info">
        <input type="checkbox" defaultChecked />
        <span className="ig-checkbox-mark"></span>
        Checkbox Info (axis)
      </label>
    </div>
  </div>
);

export const RadioBasico = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Radio Buttons</h2>

    <div className="ig-space-y-4">
      <div className="ig-space-y-2">
        <label className="ig-radio">
          <input type="radio" name="ejemplo" defaultChecked />
          <span className="ig-radio-mark"></span>
          Opción 1
        </label>
        <label className="ig-radio">
          <input type="radio" name="ejemplo" />
          <span className="ig-radio-mark"></span>
          Opción 2
        </label>
        <label className="ig-radio">
          <input type="radio" name="ejemplo" />
          <span className="ig-radio-mark"></span>
          Opción 3
        </label>
        <label className="ig-radio">
          <input type="radio" name="ejemplo" disabled />
          <span className="ig-radio-mark"></span>
          Opción deshabilitada
        </label>
      </div>
    </div>
  </div>
);

export const RadioVariantesColor = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Radio con Variantes de Color</h2>

    <div className="ig-space-y-4">
      <label className="ig-radio ig-radio-brand">
        <input type="radio" name="color" defaultChecked />
        <span className="ig-radio-mark"></span>
        Radio Brand
      </label>

      <label className="ig-radio ig-radio-secondary">
        <input type="radio" name="color2" defaultChecked />
        <span className="ig-radio-mark"></span>
        Radio Secondary
      </label>

      <label className="ig-radio ig-radio-success">
        <input type="radio" name="color3" defaultChecked />
        <span className="ig-radio-mark"></span>
        Radio Success
      </label>

      <label className="ig-radio ig-radio-warning">
        <input type="radio" name="color4" defaultChecked />
        <span className="ig-radio-mark"></span>
        Radio Warning
      </label>

      <label className="ig-radio ig-radio-danger">
        <input type="radio" name="color5" defaultChecked />
        <span className="ig-radio-mark"></span>
        Radio Danger
      </label>
    </div>
  </div>
);

export const GruposDeCheckbox = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Grupos de Checkbox</h2>

    <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
      <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Selecciona tus intereses:</h3>
      <div className="ig-grid ig-grid-cols-2 ig-gap-2">
        <label className="ig-checkbox">
          <input type="checkbox" defaultChecked />
          <span className="ig-checkbox-mark"></span>
          Tecnología
        </label>
        <label className="ig-checkbox">
          <input type="checkbox" />
          <span className="ig-checkbox-mark"></span>
          Diseño
        </label>
        <label className="ig-checkbox">
          <input type="checkbox" defaultChecked />
          <span className="ig-checkbox-mark"></span>
          Desarrollo
        </label>
        <label className="ig-checkbox">
          <input type="checkbox" />
          <span className="ig-checkbox-mark"></span>
          Marketing
        </label>
        <label className="ig-checkbox">
          <input type="checkbox" />
          <span className="ig-checkbox-mark"></span>
          Negocios
        </label>
        <label className="ig-checkbox">
          <input type="checkbox" />
          <span className="ig-checkbox-mark"></span>
          Otros
        </label>
      </div>
    </div>
  </div>
);

export const ControlesNativos = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Controles Nativos con accent-color</h2>
    <p className="ig-text-body ig-mb-4">
      Usa <code className="ig-bg-muted ig-px-1 ig-rounded">ig-accent-*</code> para colorear checkboxes nativos.
    </p>

    <div className="ig-space-y-4">
      <div className="ig-flex ig-items-center ig-gap-2">
        <input type="checkbox" className="ig-accent-brand ig-w-5 ig-h-5" defaultChecked />
        <span>ig-accent-brand</span>
      </div>
      <div className="ig-flex ig-items-center ig-gap-2">
        <input type="checkbox" className="ig-accent-secondary ig-w-5 ig-h-5" defaultChecked />
        <span>ig-accent-secondary</span>
      </div>
      <div className="ig-flex ig-items-center ig-gap-2">
        <input type="checkbox" className="ig-accent-success ig-w-5 ig-h-5" defaultChecked />
        <span>ig-accent-success</span>
      </div>
      <div className="ig-flex ig-items-center ig-gap-2">
        <input type="checkbox" className="ig-accent-warning ig-w-5 ig-h-5" defaultChecked />
        <span>ig-accent-warning</span>
      </div>
      <div className="ig-flex ig-items-center ig-gap-2">
        <input type="checkbox" className="ig-accent-danger ig-w-5 ig-h-5" defaultChecked />
        <span>ig-accent-danger</span>
      </div>
    </div>
  </div>
);
