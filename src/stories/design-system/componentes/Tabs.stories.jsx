import React from 'react';

export default {
  title: 'Componentes/Tabs',
};

export const TabsBasico = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tabs Básico</h2>

    <div className="ig-tabs">
      <div className="ig-tabs-list">
        <button className="ig-tab ig-tab-active">Perfil</button>
        <button className="ig-tab">Configuración</button>
        <button className="ig-tab">Notificaciones</button>
        <button className="ig-tab" disabled>Deshabilitado</button>
      </div>

      <div className="ig-tabs-content">
        <div className="ig-tab-panel ig-tab-panel-active">
          <div className="ig-p-4">
            <h3 className="ig-font-semibold ig-text-heading ig-mb-2">Contenido del Perfil</h3>
            <p className="ig-text-body">
              Este es el contenido del panel de perfil. Aquí puedes ver y editar
              tu información personal.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const VariantesDeColor = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Variantes de Color</h2>

    <div className="ig-space-y-8">
      <div>
        <span className="ig-text-sm ig-text-muted ig-block ig-mb-2">Brand (vitreus)</span>
        <div className="ig-tabs ig-tabs-brand">
          <div className="ig-tabs-list">
            <button className="ig-tab ig-tab-active">Tab 1</button>
            <button className="ig-tab">Tab 2</button>
            <button className="ig-tab">Tab 3</button>
          </div>
        </div>
      </div>

      <div>
        <span className="ig-text-sm ig-text-muted ig-block ig-mb-2">Secondary (axis)</span>
        <div className="ig-tabs ig-tabs-secondary">
          <div className="ig-tabs-list">
            <button className="ig-tab ig-tab-active">Tab 1</button>
            <button className="ig-tab">Tab 2</button>
            <button className="ig-tab">Tab 3</button>
          </div>
        </div>
      </div>

      <div>
        <span className="ig-text-sm ig-text-muted ig-block ig-mb-2">Success (laurus)</span>
        <div className="ig-tabs ig-tabs-success">
          <div className="ig-tabs-list">
            <button className="ig-tab ig-tab-active">Tab 1</button>
            <button className="ig-tab">Tab 2</button>
            <button className="ig-tab">Tab 3</button>
          </div>
        </div>
      </div>

      <div>
        <span className="ig-text-sm ig-text-muted ig-block ig-mb-2">Warning (rutilus)</span>
        <div className="ig-tabs ig-tabs-warning">
          <div className="ig-tabs-list">
            <button className="ig-tab ig-tab-active">Tab 1</button>
            <button className="ig-tab">Tab 2</button>
            <button className="ig-tab">Tab 3</button>
          </div>
        </div>
      </div>

      <div>
        <span className="ig-text-sm ig-text-muted ig-block ig-mb-2">Danger (malum)</span>
        <div className="ig-tabs ig-tabs-danger">
          <div className="ig-tabs-list">
            <button className="ig-tab ig-tab-active">Tab 1</button>
            <button className="ig-tab">Tab 2</button>
            <button className="ig-tab">Tab 3</button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const TabsPills = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tabs Pills</h2>
    <p className="ig-text-body ig-mb-6">
      Usa <code className="ig-bg-muted ig-px-1 ig-rounded">ig-tabs-pills</code> para tabs con fondo.
    </p>

    <div className="ig-space-y-8">
      <div className="ig-tabs ig-tabs-pills ig-tabs-brand">
        <div className="ig-tabs-list">
          <button className="ig-tab ig-tab-active">General</button>
          <button className="ig-tab">Seguridad</button>
          <button className="ig-tab">Privacidad</button>
          <button className="ig-tab">Avanzado</button>
        </div>
      </div>

      <div className="ig-tabs ig-tabs-pills ig-tabs-secondary">
        <div className="ig-tabs-list">
          <button className="ig-tab ig-tab-active">Todos</button>
          <button className="ig-tab">Activos</button>
          <button className="ig-tab">Pendientes</button>
          <button className="ig-tab">Archivados</button>
        </div>
      </div>

      <div className="ig-tabs ig-tabs-pills ig-tabs-success">
        <div className="ig-tabs-list">
          <button className="ig-tab ig-tab-active">Aprobados</button>
          <button className="ig-tab">En revisión</button>
          <button className="ig-tab">Rechazados</button>
        </div>
      </div>
    </div>
  </div>
);

export const TabsVerticales = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tabs Verticales</h2>

    <div className="ig-tabs ig-tabs-vertical ig-tabs-brand">
      <div className="ig-tabs-list">
        <button className="ig-tab ig-tab-active">General</button>
        <button className="ig-tab">Cuenta</button>
        <button className="ig-tab">Seguridad</button>
        <button className="ig-tab">Notificaciones</button>
        <button className="ig-tab">Integraciones</button>
      </div>

      <div className="ig-tabs-content ig-flex-1">
        <div className="ig-tab-panel ig-tab-panel-active">
          <div className="ig-p-4">
            <h3 className="ig-font-semibold ig-text-heading ig-mb-2">Configuración General</h3>
            <p className="ig-text-body ig-mb-4">
              Ajustes generales de la aplicación como idioma, zona horaria y preferencias de visualización.
            </p>
            <div className="ig-space-y-4">
              <div>
                <label className="ig-form-label">Idioma</label>
                <select className="ig-select">
                  <option>Español</option>
                  <option>English</option>
                  <option>Português</option>
                </select>
              </div>
              <div>
                <label className="ig-form-label">Zona horaria</label>
                <select className="ig-select">
                  <option>Europe/Madrid (GMT+1)</option>
                  <option>America/Mexico_City (GMT-6)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const TabsConIconos = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tabs con Iconos</h2>

    <div className="ig-tabs ig-tabs-brand">
      <div className="ig-tabs-list">
        <button className="ig-tab ig-tab-active">
          <span className="ig-mr-2">🏠</span> Inicio
        </button>
        <button className="ig-tab">
          <span className="ig-mr-2">👤</span> Perfil
        </button>
        <button className="ig-tab">
          <span className="ig-mr-2">⚙️</span> Ajustes
        </button>
        <button className="ig-tab">
          <span className="ig-mr-2">📊</span> Estadísticas
        </button>
      </div>
    </div>

    <div className="ig-mt-8">
      <span className="ig-text-sm ig-text-muted ig-block ig-mb-2">Solo iconos</span>
      <div className="ig-tabs ig-tabs-pills ig-tabs-brand">
        <div className="ig-tabs-list">
          <button className="ig-tab ig-tab-active" title="Inicio">🏠</button>
          <button className="ig-tab" title="Perfil">👤</button>
          <button className="ig-tab" title="Ajustes">⚙️</button>
          <button className="ig-tab" title="Estadísticas">📊</button>
        </div>
      </div>
    </div>
  </div>
);

export const TabsConBadge = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tabs con Badge</h2>

    <div className="ig-tabs ig-tabs-brand">
      <div className="ig-tabs-list">
        <button className="ig-tab ig-tab-active">
          Mensajes
          <span className="ig-badge ig-badge-danger ig-badge-pill ig-ml-2">5</span>
        </button>
        <button className="ig-tab">
          Notificaciones
          <span className="ig-badge ig-badge-warning ig-badge-pill ig-ml-2">12</span>
        </button>
        <button className="ig-tab">
          Tareas
          <span className="ig-badge ig-badge-success ig-badge-pill ig-ml-2">3</span>
        </button>
        <button className="ig-tab">
          Archivados
        </button>
      </div>
    </div>
  </div>
);

export const EjemploCompleto = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Ejemplo Completo</h2>

    <div className="ig-bg-surface ig-rounded-lg ig-border ig-border-default">
      <div className="ig-tabs ig-tabs-brand">
        <div className="ig-tabs-list ig-px-4 ig-pt-4">
          <button className="ig-tab ig-tab-active">Descripción</button>
          <button className="ig-tab">Especificaciones</button>
          <button className="ig-tab">Reseñas (24)</button>
        </div>

        <div className="ig-tabs-content">
          <div className="ig-tab-panel ig-tab-panel-active">
            <div className="ig-p-4">
              <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Descripción del Producto</h3>
              <p className="ig-text-body ig-mb-4">
                Este es un producto de alta calidad diseñado para satisfacer las necesidades
                más exigentes. Con materiales premium y un diseño innovador, ofrece una
                experiencia de uso excepcional.
              </p>
              <h4 className="ig-font-medium ig-text-heading ig-mb-2">Características:</h4>
              <ul className="ig-list-disc ig-list-inside ig-text-body ig-space-y-1">
                <li>Material de alta calidad</li>
                <li>Diseño ergonómico</li>
                <li>Garantía de 2 años</li>
                <li>Envío gratuito</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const TabsResponsive = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tabs Responsive</h2>
    <p className="ig-text-body ig-mb-6">
      En pantallas pequeñas, los tabs pueden hacer scroll horizontal.
    </p>

    <div className="ig-tabs ig-tabs-brand">
      <div className="ig-tabs-list ig-overflow-x-auto ig-flex-nowrap">
        <button className="ig-tab ig-tab-active ig-whitespace-nowrap">Dashboard</button>
        <button className="ig-tab ig-whitespace-nowrap">Usuarios</button>
        <button className="ig-tab ig-whitespace-nowrap">Productos</button>
        <button className="ig-tab ig-whitespace-nowrap">Pedidos</button>
        <button className="ig-tab ig-whitespace-nowrap">Estadísticas</button>
        <button className="ig-tab ig-whitespace-nowrap">Configuración</button>
        <button className="ig-tab ig-whitespace-nowrap">Ayuda</button>
      </div>
    </div>
  </div>
);
