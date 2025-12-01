import React from 'react';

export default {
  title: 'Componentes/Avatar',
};

export const AvatarBasico = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Avatar Básico</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-6 ig-items-center">
      <div className="ig-text-center">
        <div className="ig-avatar ig-bg-brand ig-text-on-brand ig-mb-2">JP</div>
        <span className="ig-text-sm ig-text-muted">Iniciales</span>
      </div>

      <div className="ig-text-center">
        <div className="ig-avatar ig-bg-secondary ig-text-on-secondary ig-mb-2">
          <span className="ig-text-xl">👤</span>
        </div>
        <span className="ig-text-sm ig-text-muted">Icono</span>
      </div>

      <div className="ig-text-center">
        <div className="ig-avatar ig-bg-muted ig-mb-2">
          <img
            src="https://i.pravatar.cc/150?img=1"
            alt="Avatar"
            className="ig-w-full ig-h-full ig-object-cover"
          />
        </div>
        <span className="ig-text-sm ig-text-muted">Imagen</span>
      </div>
    </div>
  </div>
);

export const TamanosDeAvatar = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Tamaños de Avatar</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-6 ig-items-end">
      <div className="ig-text-center">
        <div className="ig-avatar ig-avatar-xs ig-bg-brand ig-text-on-brand ig-mb-2">XS</div>
        <span className="ig-text-sm ig-text-muted">xs (1.5rem)</span>
      </div>

      <div className="ig-text-center">
        <div className="ig-avatar ig-avatar-sm ig-bg-brand ig-text-on-brand ig-mb-2">SM</div>
        <span className="ig-text-sm ig-text-muted">sm (2rem)</span>
      </div>

      <div className="ig-text-center">
        <div className="ig-avatar ig-avatar-md ig-bg-brand ig-text-on-brand ig-mb-2">MD</div>
        <span className="ig-text-sm ig-text-muted">md (2.5rem)</span>
      </div>

      <div className="ig-text-center">
        <div className="ig-avatar ig-avatar-lg ig-bg-brand ig-text-on-brand ig-mb-2">LG</div>
        <span className="ig-text-sm ig-text-muted">lg (3rem)</span>
      </div>

      <div className="ig-text-center">
        <div className="ig-avatar ig-avatar-xl ig-bg-brand ig-text-on-brand ig-mb-2">XL</div>
        <span className="ig-text-sm ig-text-muted">xl (4rem)</span>
      </div>

      <div className="ig-text-center">
        <div className="ig-avatar ig-avatar-2xl ig-bg-brand ig-text-on-brand ig-mb-2">2XL</div>
        <span className="ig-text-sm ig-text-muted">2xl (5rem)</span>
      </div>
    </div>
  </div>
);

export const AvatarConEstado = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Avatar con Estado</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-8 ig-items-center">
      <div className="ig-text-center">
        <div className="ig-relative ig-inline-block ig-mb-2">
          <div className="ig-avatar ig-avatar-lg ig-bg-brand ig-text-on-brand">JP</div>
          <span className="ig-avatar-status ig-avatar-status-online"></span>
        </div>
        <span className="ig-text-sm ig-text-muted ig-block">En línea</span>
      </div>

      <div className="ig-text-center">
        <div className="ig-relative ig-inline-block ig-mb-2">
          <div className="ig-avatar ig-avatar-lg ig-bg-secondary ig-text-on-secondary">MG</div>
          <span className="ig-avatar-status ig-avatar-status-away"></span>
        </div>
        <span className="ig-text-sm ig-text-muted ig-block">Ausente</span>
      </div>

      <div className="ig-text-center">
        <div className="ig-relative ig-inline-block ig-mb-2">
          <div className="ig-avatar ig-avatar-lg ig-bg-success ig-text-on-success">CL</div>
          <span className="ig-avatar-status ig-avatar-status-busy"></span>
        </div>
        <span className="ig-text-sm ig-text-muted ig-block">Ocupado</span>
      </div>

      <div className="ig-text-center">
        <div className="ig-relative ig-inline-block ig-mb-2">
          <div className="ig-avatar ig-avatar-lg ig-bg-warning ig-text-on-warning">AL</div>
          <span className="ig-avatar-status ig-avatar-status-offline"></span>
        </div>
        <span className="ig-text-sm ig-text-muted ig-block">Desconectado</span>
      </div>
    </div>
  </div>
);

export const AvatarRedondeado = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Avatar Redondeado vs Circular</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-8 ig-items-center">
      <div className="ig-text-center">
        <div className="ig-avatar ig-avatar-lg ig-bg-brand ig-text-on-brand ig-mb-2">JP</div>
        <span className="ig-text-sm ig-text-muted">Circular (default)</span>
      </div>

      <div className="ig-text-center">
        <div className="ig-avatar ig-avatar-rounded ig-avatar-lg ig-bg-secondary ig-text-on-secondary ig-mb-2">MG</div>
        <span className="ig-text-sm ig-text-muted">Redondeado</span>
      </div>
    </div>
  </div>
);

export const GrupoDeAvatares = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Grupo de Avatares</h2>

    <div className="ig-space-y-6">
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Participantes del proyecto</h3>
        <div className="ig-avatar-group">
          <div className="ig-avatar ig-bg-brand ig-text-on-brand">JP</div>
          <div className="ig-avatar ig-bg-secondary ig-text-on-secondary">MG</div>
          <div className="ig-avatar ig-bg-success ig-text-on-success">CL</div>
          <div className="ig-avatar ig-bg-warning ig-text-on-warning">AL</div>
          <div className="ig-avatar ig-bg-muted ig-text-body">+5</div>
        </div>
      </div>

      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Equipo pequeño</h3>
        <div className="ig-avatar-group">
          <div className="ig-avatar ig-avatar-lg ig-bg-brand ig-text-on-brand">A</div>
          <div className="ig-avatar ig-avatar-lg ig-bg-secondary ig-text-on-secondary">B</div>
          <div className="ig-avatar ig-avatar-lg ig-bg-success ig-text-on-success">C</div>
        </div>
      </div>
    </div>
  </div>
);

export const ColoresDeAvatar = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Colores de Avatar</h2>

    <div className="ig-flex ig-flex-wrap ig-gap-4">
      <div className="ig-avatar ig-bg-brand ig-text-on-brand">BR</div>
      <div className="ig-avatar ig-bg-secondary ig-text-on-secondary">SE</div>
      <div className="ig-avatar ig-bg-success ig-text-on-success">SU</div>
      <div className="ig-avatar ig-bg-warning ig-text-on-warning">WA</div>
      <div className="ig-avatar ig-bg-danger ig-text-on-danger">DA</div>
      <div className="ig-avatar ig-bg-info ig-text-on-info">IN</div>
      <div className="ig-avatar ig-bg-muted ig-text-body">MU</div>
    </div>
  </div>
);

export const CasosDeUsoAvatar = () => (
  <div>
    <h2 className="ig-text-2xl ig-font-bold ig-text-heading ig-mb-6">Casos de Uso</h2>

    <div className="ig-space-y-6">
      {/* Lista de usuarios */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Lista de Usuarios</h3>
        <div className="ig-space-y-3">
          {[
            { initials: 'JP', name: 'Juan Pérez', role: 'Administrador', status: 'online', color: 'brand' },
            { initials: 'MG', name: 'María García', role: 'Editor', status: 'away', color: 'secondary' },
            { initials: 'CL', name: 'Carlos López', role: 'Desarrollador', status: 'busy', color: 'success' },
          ].map((user, i) => (
            <div key={i} className="ig-flex ig-items-center ig-gap-3 ig-p-2 ig-rounded ig-hover:ig-bg-muted">
              <div className="ig-relative">
                <div className={`ig-avatar ig-bg-${user.color} ig-text-on-${user.color}`}>
                  {user.initials}
                </div>
                <span className={`ig-avatar-status ig-avatar-status-${user.status}`}></span>
              </div>
              <div>
                <div className="ig-font-medium ig-text-body">{user.name}</div>
                <div className="ig-text-sm ig-text-muted">{user.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comentario */}
      <div className="ig-bg-surface ig-p-4 ig-rounded-lg ig-border ig-border-default">
        <h3 className="ig-font-semibold ig-text-heading ig-mb-4">Comentario</h3>
        <div className="ig-flex ig-gap-3">
          <div className="ig-avatar ig-avatar-md ig-bg-brand ig-text-on-brand ig-flex-shrink-0">JP</div>
          <div className="ig-flex-1">
            <div className="ig-flex ig-items-center ig-gap-2 ig-mb-1">
              <span className="ig-font-medium ig-text-body">Juan Pérez</span>
              <span className="ig-text-sm ig-text-muted">hace 2 horas</span>
            </div>
            <p className="ig-text-body">
              Este es un ejemplo de comentario con avatar. El diseño es limpio y fácil de leer.
            </p>
          </div>
        </div>
      </div>

      {/* Perfil de usuario */}
      <div className="ig-bg-surface ig-p-6 ig-rounded-lg ig-border ig-border-default ig-text-center">
        <div className="ig-relative ig-inline-block ig-mb-4">
          <div className="ig-avatar ig-avatar-2xl ig-bg-brand ig-text-on-brand">JP</div>
          <span className="ig-avatar-status ig-avatar-status-online" style={{ width: '1rem', height: '1rem', bottom: '0.25rem', right: '0.25rem' }}></span>
        </div>
        <h3 className="ig-text-xl ig-font-semibold ig-text-heading">Juan Pérez</h3>
        <p className="ig-text-muted ig-mb-4">juan@ejemplo.com</p>
        <div className="ig-flex ig-justify-center ig-gap-2">
          <button className="ig-btn ig-btn-brand ig-btn-sm">Seguir</button>
          <button className="ig-btn ig-btn-outline ig-btn-sm">Mensaje</button>
        </div>
      </div>
    </div>
  </div>
);
