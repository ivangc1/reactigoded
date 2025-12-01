import React from 'react';

export default {
  title: 'Componentes/Select',
};

export const SelectBasico = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Select Básico</h2>

    <div className="ig-space-y-4 ig-max-w-md">
      <div>
        <label className="ig-form-label">País</label>
        <select className="ig-select">
          <option value="">Selecciona un país...</option>
          <option value="es">España</option>
          <option value="mx">México</option>
          <option value="ar">Argentina</option>
          <option value="co">Colombia</option>
        </select>
      </div>

      <div>
        <label className="ig-form-label">Con valor seleccionado</label>
        <select className="ig-select" defaultValue="mx">
          <option value="">Selecciona un país...</option>
          <option value="es">España</option>
          <option value="mx">México</option>
          <option value="ar">Argentina</option>
        </select>
      </div>

      <div>
        <label className="ig-form-label">Deshabilitado</label>
        <select className="ig-select" disabled>
          <option>No disponible</option>
        </select>
      </div>
    </div>
  </div>
);

export const SelectConGrupos = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Select con Grupos</h2>

    <div className="ig-max-w-md">
      <label className="ig-form-label">Categoría</label>
      <select className="ig-select">
        <option value="">Selecciona una categoría...</option>
        <optgroup label="Tecnología">
          <option value="web">Desarrollo Web</option>
          <option value="mobile">Desarrollo Móvil</option>
          <option value="data">Ciencia de Datos</option>
        </optgroup>
        <optgroup label="Diseño">
          <option value="ui">Diseño UI</option>
          <option value="ux">Diseño UX</option>
          <option value="graphic">Diseño Gráfico</option>
        </optgroup>
        <optgroup label="Marketing">
          <option value="seo">SEO</option>
          <option value="social">Redes Sociales</option>
        </optgroup>
      </select>
    </div>
  </div>
);

export const SelectEnFormulario = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Select en Formulario</h2>

    <form className="ig-bg-surface ig-p-6 ig-rounded-lg ig-border ig-border-default ig-max-w-lg">
      <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Formulario de Envío</h3>

      <div className="ig-space-y-4">
        <div className="ig-grid ig-grid-cols-2 ig-gap-4">
          <div>
            <label className="ig-form-label">Nombre</label>
            <input type="text" className="ig-input" placeholder="Tu nombre" />
          </div>
          <div>
            <label className="ig-form-label">Apellido</label>
            <input type="text" className="ig-input" placeholder="Tu apellido" />
          </div>
        </div>

        <div>
          <label className="ig-form-label">País</label>
          <select className="ig-select">
            <option value="">Selecciona tu país...</option>
            <option value="es">España</option>
            <option value="mx">México</option>
            <option value="ar">Argentina</option>
            <option value="co">Colombia</option>
            <option value="cl">Chile</option>
            <option value="pe">Perú</option>
          </select>
        </div>

        <div className="ig-grid ig-grid-cols-2 ig-gap-4">
          <div>
            <label className="ig-form-label">Provincia/Estado</label>
            <select className="ig-select">
              <option value="">Selecciona...</option>
              <option value="madrid">Madrid</option>
              <option value="barcelona">Barcelona</option>
              <option value="valencia">Valencia</option>
            </select>
          </div>
          <div>
            <label className="ig-form-label">Código Postal</label>
            <input type="text" className="ig-input" placeholder="28001" />
          </div>
        </div>

        <div>
          <label className="ig-form-label">Método de Envío</label>
          <select className="ig-select">
            <option value="standard">Estándar (5-7 días) - Gratis</option>
            <option value="express">Express (2-3 días) - 9.99€</option>
            <option value="overnight">Overnight (1 día) - 19.99€</option>
          </select>
        </div>

        <button type="button" className="ig-btn ig-btn-brand ig-w-full">
          Continuar al pago
        </button>
      </div>
    </form>
  </div>
);

export const SelectMultiple = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Select Múltiple</h2>

    <div className="ig-max-w-md">
      <label className="ig-form-label">Selecciona tus intereses (múltiple)</label>
      <select className="ig-select" multiple style={{ height: 'auto', minHeight: '10rem' }}>
        <option value="react">React</option>
        <option value="vue">Vue.js</option>
        <option value="angular">Angular</option>
        <option value="svelte">Svelte</option>
        <option value="node">Node.js</option>
        <option value="python">Python</option>
        <option value="go">Go</option>
        <option value="rust">Rust</option>
      </select>
      <p className="ig-text-sm ig-text-muted ig-mt-2">
        Mantén presionado Ctrl (Cmd en Mac) para seleccionar múltiples opciones
      </p>
    </div>
  </div>
);

export const TextareaBasico = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Textarea</h2>

    <div className="ig-space-y-4 ig-max-w-lg">
      <div>
        <label className="ig-form-label">Mensaje</label>
        <textarea
          className="ig-textarea"
          rows={4}
          placeholder="Escribe tu mensaje aquí..."
        ></textarea>
      </div>

      <div>
        <label className="ig-form-label">Con contenido</label>
        <textarea
          className="ig-textarea"
          rows={4}
          defaultValue="Este es un ejemplo de textarea con contenido predefinido. Puede contener múltiples líneas de texto."
        ></textarea>
      </div>

      <div>
        <label className="ig-form-label">Deshabilitado</label>
        <textarea
          className="ig-textarea"
          rows={3}
          disabled
          defaultValue="Este textarea está deshabilitado"
        ></textarea>
      </div>

      <div>
        <label className="ig-form-label">Con redimensionado vertical</label>
        <textarea
          className="ig-textarea"
          rows={3}
          style={{ resize: 'vertical' }}
          placeholder="Puedes redimensionar verticalmente..."
        ></textarea>
      </div>
    </div>
  </div>
);
