import React from 'react';
import { Tabs, TabsList, Tab, TabsContent, TabPanel } from '../../../components/Tabs/Tabs';
import { Badge } from '../../../components/Badge/Badge';

export default {
  title: 'Componentes/Tabs',
  component: Tabs,
  argTypes: {
    color: {
      control: 'select',
      options: ['brand', 'secondary', 'success', 'warning', 'danger', 'info'],
    },
    variant: {
      control: 'select',
      options: [undefined, 'pills'],
    },
    vertical: { control: 'boolean' },
  },
};

export const TabsBasico = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tabs Básico</h2>

    <Tabs defaultValue="perfil" color="brand">
      <TabsList>
        <Tab value="perfil">Perfil</Tab>
        <Tab value="config">Configuración</Tab>
        <Tab value="notif">Notificaciones</Tab>
        <Tab value="disabled" disabled>Deshabilitado</Tab>
      </TabsList>

      <TabsContent>
        <TabPanel value="perfil">
          <div className="ig-p-4">
            <h3 className="ig-font-semibold ig-text-heading ig-mb-2">Contenido del Perfil</h3>
            <p className="ig-text-body">
              Este es el contenido del panel de perfil. Aquí puedes ver y editar
              tu información personal.
            </p>
          </div>
        </TabPanel>
        <TabPanel value="config">
          <div className="ig-p-4">
            <h3 className="ig-font-semibold ig-text-heading ig-mb-2">Configuración</h3>
            <p className="ig-text-body">Ajusta la configuración de tu cuenta.</p>
          </div>
        </TabPanel>
        <TabPanel value="notif">
          <div className="ig-p-4">
            <h3 className="ig-font-semibold ig-text-heading ig-mb-2">Notificaciones</h3>
            <p className="ig-text-body">Gestiona tus preferencias de notificación.</p>
          </div>
        </TabPanel>
      </TabsContent>
    </Tabs>
  </div>
);

export const VariantesDeColor = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Variantes de Color</h2>

    <div className="ig-space-y-8">
      {['brand', 'secondary', 'success', 'warning', 'danger', 'info'].map((color) => (
        <div key={color}>
          <span className="ig-text-sm ig-text-muted ig-block ig-mb-2">{color}</span>
          <Tabs defaultValue="tab1" color={color}>
            <TabsList>
              <Tab value="tab1">Tab 1</Tab>
              <Tab value="tab2">Tab 2</Tab>
              <Tab value="tab3">Tab 3</Tab>
            </TabsList>
          </Tabs>
        </div>
      ))}
    </div>
  </div>
);

export const TabsPills = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tabs Pills</h2>
    <p className="ig-text-body ig-mb-6">
      Usa <code className="ig-bg-muted ig-px-1 ig-rounded">variant="pills"</code> para tabs con fondo.
    </p>

    <div className="ig-space-y-8">
      <Tabs defaultValue="general" variant="pills" color="brand">
        <TabsList>
          <Tab value="general">General</Tab>
          <Tab value="seguridad">Seguridad</Tab>
          <Tab value="privacidad">Privacidad</Tab>
          <Tab value="avanzado">Avanzado</Tab>
        </TabsList>
      </Tabs>

      <Tabs defaultValue="todos" variant="pills" color="secondary">
        <TabsList>
          <Tab value="todos">Todos</Tab>
          <Tab value="activos">Activos</Tab>
          <Tab value="pendientes">Pendientes</Tab>
          <Tab value="archivados">Archivados</Tab>
        </TabsList>
      </Tabs>

      <Tabs defaultValue="aprobados" variant="pills" color="success">
        <TabsList>
          <Tab value="aprobados">Aprobados</Tab>
          <Tab value="revision">En revisión</Tab>
          <Tab value="rechazados">Rechazados</Tab>
        </TabsList>
      </Tabs>
    </div>
  </div>
);

export const TabsVerticales = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tabs Verticales</h2>

    <Tabs defaultValue="general" vertical color="brand">
      <TabsList>
        <Tab value="general">General</Tab>
        <Tab value="cuenta">Cuenta</Tab>
        <Tab value="seguridad">Seguridad</Tab>
        <Tab value="notificaciones">Notificaciones</Tab>
        <Tab value="integraciones">Integraciones</Tab>
      </TabsList>

      <TabsContent className="ig-flex-1">
        <TabPanel value="general">
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
        </TabPanel>
        <TabPanel value="cuenta">
          <div className="ig-p-4">
            <h3 className="ig-font-semibold ig-text-heading ig-mb-2">Cuenta</h3>
            <p className="ig-text-body">Gestiona la configuración de tu cuenta.</p>
          </div>
        </TabPanel>
        <TabPanel value="seguridad">
          <div className="ig-p-4">
            <h3 className="ig-font-semibold ig-text-heading ig-mb-2">Seguridad</h3>
            <p className="ig-text-body">Configura opciones de seguridad.</p>
          </div>
        </TabPanel>
        <TabPanel value="notificaciones">
          <div className="ig-p-4">
            <h3 className="ig-font-semibold ig-text-heading ig-mb-2">Notificaciones</h3>
            <p className="ig-text-body">Gestiona tus preferencias de notificación.</p>
          </div>
        </TabPanel>
        <TabPanel value="integraciones">
          <div className="ig-p-4">
            <h3 className="ig-font-semibold ig-text-heading ig-mb-2">Integraciones</h3>
            <p className="ig-text-body">Conecta con otras aplicaciones.</p>
          </div>
        </TabPanel>
      </TabsContent>
    </Tabs>
  </div>
);

export const TabsConIconos = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tabs con Iconos</h2>

    <Tabs defaultValue="inicio" color="brand">
      <TabsList>
        <Tab value="inicio">
          <span className="ig-mr-2">🏠</span> Inicio
        </Tab>
        <Tab value="perfil">
          <span className="ig-mr-2">👤</span> Perfil
        </Tab>
        <Tab value="ajustes">
          <span className="ig-mr-2">⚙️</span> Ajustes
        </Tab>
        <Tab value="stats">
          <span className="ig-mr-2">📊</span> Estadísticas
        </Tab>
      </TabsList>
    </Tabs>

    <div className="ig-mt-8">
      <span className="ig-text-sm ig-text-muted ig-block ig-mb-2">Solo iconos</span>
      <Tabs defaultValue="inicio" variant="pills" color="brand">
        <TabsList>
          <Tab value="inicio" title="Inicio">🏠</Tab>
          <Tab value="perfil" title="Perfil">👤</Tab>
          <Tab value="ajustes" title="Ajustes">⚙️</Tab>
          <Tab value="stats" title="Estadísticas">📊</Tab>
        </TabsList>
      </Tabs>
    </div>
  </div>
);

export const TabsConBadge = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tabs con Badge</h2>

    <Tabs defaultValue="mensajes" color="brand">
      <TabsList>
        <Tab value="mensajes">
          Mensajes
          <Badge variant="danger" pill className="ig-ml-2">5</Badge>
        </Tab>
        <Tab value="notif">
          Notificaciones
          <Badge variant="warning" pill className="ig-ml-2">12</Badge>
        </Tab>
        <Tab value="tareas">
          Tareas
          <Badge variant="success" pill className="ig-ml-2">3</Badge>
        </Tab>
        <Tab value="archivados">
          Archivados
        </Tab>
      </TabsList>
    </Tabs>
  </div>
);

export const EjemploCompleto = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Ejemplo Completo</h2>

    <div className="ig-bg-surface ig-rounded-lg ig-border ig-border-default">
      <Tabs defaultValue="descripcion" color="brand">
        <TabsList className="ig-px-4 ig-pt-4">
          <Tab value="descripcion">Descripción</Tab>
          <Tab value="specs">Especificaciones</Tab>
          <Tab value="reviews">Reseñas (24)</Tab>
        </TabsList>

        <TabsContent>
          <TabPanel value="descripcion">
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
          </TabPanel>
          <TabPanel value="specs">
            <div className="ig-p-4">
              <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Especificaciones</h3>
              <p className="ig-text-body">Detalles técnicos del producto...</p>
            </div>
          </TabPanel>
          <TabPanel value="reviews">
            <div className="ig-p-4">
              <h3 className="ig-font-semibold ig-text-heading ig-mb-3">Reseñas de clientes</h3>
              <p className="ig-text-body">24 reseñas verificadas...</p>
            </div>
          </TabPanel>
        </TabsContent>
      </Tabs>
    </div>
  </div>
);

export const TabsResponsive = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tabs Responsive</h2>
    <p className="ig-text-body ig-mb-6">
      En pantallas pequeñas, los tabs pueden hacer scroll horizontal.
    </p>

    <Tabs defaultValue="dashboard" color="brand">
      <TabsList className="ig-overflow-x-auto ig-flex-nowrap">
        <Tab value="dashboard" className="ig-whitespace-nowrap">Dashboard</Tab>
        <Tab value="usuarios" className="ig-whitespace-nowrap">Usuarios</Tab>
        <Tab value="productos" className="ig-whitespace-nowrap">Productos</Tab>
        <Tab value="pedidos" className="ig-whitespace-nowrap">Pedidos</Tab>
        <Tab value="stats" className="ig-whitespace-nowrap">Estadísticas</Tab>
        <Tab value="config" className="ig-whitespace-nowrap">Configuración</Tab>
        <Tab value="ayuda" className="ig-whitespace-nowrap">Ayuda</Tab>
      </TabsList>
    </Tabs>
  </div>
);

export const Playground = {
  args: {
    defaultValue: 'tab1',
    color: 'brand',
    variant: undefined,
    vertical: false,
    children: (
      <>
        <TabsList>
          <Tab value="tab1">Tab 1</Tab>
          <Tab value="tab2">Tab 2</Tab>
          <Tab value="tab3">Tab 3</Tab>
        </TabsList>
        <TabsContent>
          <TabPanel value="tab1">
            <div className="ig-p-4">Contenido del Tab 1</div>
          </TabPanel>
          <TabPanel value="tab2">
            <div className="ig-p-4">Contenido del Tab 2</div>
          </TabPanel>
          <TabPanel value="tab3">
            <div className="ig-p-4">Contenido del Tab 3</div>
          </TabPanel>
        </TabsContent>
      </>
    ),
  },
};
