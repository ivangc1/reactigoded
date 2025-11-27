/**
 * Avatar - Componente de avatar
 *
 * Variables CSS para crear avatares de usuario con diferentes tamaños y estados.
 */

import type { Meta, StoryObj } from '@storybook/react';

const AvatarDemo = () => <div />;

const meta: Meta<typeof AvatarDemo> = {
  title: 'Componentes/Avatar',
  component: AvatarDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Sistema de avatares con 6 tamaños, indicadores de estado y soporte para grupos superpuestos.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AvatarDemo>;

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 'var(--space-xl)' }}>
    <h2 style={{
      fontFamily: 'var(--font-heading)',
      fontSize: 'var(--text-2xl)',
      color: 'var(--text-heading)',
      marginBottom: 'var(--space-md)',
      paddingBottom: 'var(--space-xs)',
      borderBottom: '1px solid var(--border-default)',
    }}>
      {title}
    </h2>
    {children}
  </div>
);

const CodeBlock = ({ code }: { code: string }) => (
  <pre style={{
    background: 'var(--bg-elevated)',
    padding: 'var(--space-sm)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-mono, monospace)',
    color: 'var(--text-body)',
    overflow: 'auto',
    marginTop: 'var(--space-sm)',
  }}>
    <code>{code}</code>
  </pre>
);

const VariableRow = ({ variable, value, description }: { variable: string; value: string; description: string }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: '200px 120px 1fr',
    gap: 'var(--space-md)',
    padding: 'var(--space-sm)',
    background: 'var(--bg-surface)',
    borderRadius: 'var(--radius-sm)',
    alignItems: 'center',
  }}>
    <code style={{ color: 'var(--accent)', fontSize: 'var(--text-sm)' }}>{variable}</code>
    <span style={{ color: 'var(--text-body)', fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--text-sm)' }}>{value}</span>
    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>{description}</span>
  </div>
);

// Avatar component para demos
const Avatar = ({
  size = 'md',
  initials,
  src,
  status,
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  initials?: string;
  src?: string;
  status?: 'online' | 'offline' | 'busy';
}) => {
  const sizeVar = `var(--avatar-size-${size})`;

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      {src ? (
        <img
          src={src}
          alt="Avatar"
          style={{
            width: sizeVar,
            height: sizeVar,
            borderRadius: 'var(--avatar-radius)',
            objectFit: 'cover',
            border: 'var(--avatar-border)',
          }}
        />
      ) : (
        <div
          style={{
            width: sizeVar,
            height: sizeVar,
            borderRadius: 'var(--avatar-radius)',
            background: 'var(--avatar-bg)',
            color: 'var(--avatar-text)',
            border: 'var(--avatar-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'var(--fw-semibold)',
            fontSize: size === 'xs' ? 'var(--text-xs)' : size === 'sm' ? 'var(--text-sm)' : size === '2xl' ? 'var(--text-2xl)' : 'var(--text-base)',
          }}
        >
          {initials || '?'}
        </div>
      )}
      {status && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 'var(--avatar-status-size)',
            height: 'var(--avatar-status-size)',
            borderRadius: '50%',
            border: '2px solid var(--bg-base)',
            background: status === 'online' ? 'var(--success)' : status === 'busy' ? 'var(--danger)' : 'var(--neutral-500)',
          }}
        />
      )}
    </div>
  );
};

export const Tamanios: Story = {
  name: 'Tamaños',
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <Section title="Tamaños de Avatar">
        <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-lg)', maxWidth: '600px' }}>
          El sistema ofrece 6 tamaños predefinidos: desde <code>xs</code> (24px) hasta <code>2xl</code> (96px).
        </p>

        <div style={{
          display: 'flex',
          alignItems: 'end',
          gap: 'var(--space-lg)',
          marginBottom: 'var(--space-xl)',
          flexWrap: 'wrap',
        }}>
          {(['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const).map((size) => (
            <div key={size} style={{ textAlign: 'center' }}>
              <Avatar size={size} initials="IG" />
              <div style={{
                marginTop: 'var(--space-sm)',
                fontSize: 'var(--text-sm)',
                color: 'var(--text-muted)',
              }}>
                {size}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          <VariableRow variable="--avatar-size-xs" value="1.5rem" description="24px - Para listas compactas" />
          <VariableRow variable="--avatar-size-sm" value="2rem" description="32px - Comentarios, chips" />
          <VariableRow variable="--avatar-size-md" value="2.5rem" description="40px - Tamaño por defecto" />
          <VariableRow variable="--avatar-size-lg" value="3rem" description="48px - Cards de usuario" />
          <VariableRow variable="--avatar-size-xl" value="4rem" description="64px - Perfiles" />
          <VariableRow variable="--avatar-size-2xl" value="6rem" description="96px - Páginas de perfil" />
        </div>
      </Section>
    </div>
  ),
};

export const ConImagen: Story = {
  name: 'Con imagen',
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <Section title="Avatar con imagen">
        <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-lg)', maxWidth: '600px' }}>
          Cuando hay una imagen de perfil disponible, se muestra con <code>object-fit: cover</code>.
        </p>

        <div style={{
          display: 'flex',
          alignItems: 'end',
          gap: 'var(--space-lg)',
          marginBottom: 'var(--space-xl)',
        }}>
          {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
            <div key={size} style={{ textAlign: 'center' }}>
              <Avatar
                size={size}
                src="https://i.pravatar.cc/150?img=3"
              />
              <div style={{
                marginTop: 'var(--space-sm)',
                fontSize: 'var(--text-sm)',
                color: 'var(--text-muted)',
              }}>
                {size}
              </div>
            </div>
          ))}
        </div>

        <CodeBlock code={`<img
  class="avatar avatar-md"
  src="user.jpg"
  alt="Usuario"
/>

/* Estilos base del avatar */
.avatar {
  width: var(--avatar-size-md);
  height: var(--avatar-size-md);
  border-radius: var(--avatar-radius);
  object-fit: cover;
  border: var(--avatar-border);
}`} />
      </Section>
    </div>
  ),
};

export const ConIniciales: Story = {
  name: 'Con iniciales',
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <Section title="Avatar con iniciales">
        <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-lg)', maxWidth: '600px' }}>
          Cuando no hay imagen, se muestran las iniciales del usuario sobre un fondo neutral.
        </p>

        <div style={{
          display: 'flex',
          gap: 'var(--space-lg)',
          marginBottom: 'var(--space-xl)',
          flexWrap: 'wrap',
        }}>
          <Avatar size="lg" initials="IG" />
          <Avatar size="lg" initials="JD" />
          <Avatar size="lg" initials="MR" />
          <Avatar size="lg" initials="AK" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          <VariableRow variable="--avatar-bg" value="var(--bg-elevated)" description="Fondo cuando no hay imagen" />
          <VariableRow variable="--avatar-text" value="var(--text-muted)" description="Color de las iniciales" />
          <VariableRow variable="--avatar-radius" value="var(--radius-full)" description="Círculo perfecto" />
          <VariableRow variable="--avatar-border" value="2px solid var(--border-subtle)" description="Borde sutil" />
        </div>
      </Section>
    </div>
  ),
};

export const IndicadorDeEstado: Story = {
  name: 'Indicador de estado',
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <Section title="Indicador de estado">
        <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-lg)', maxWidth: '600px' }}>
          Un pequeño círculo indica el estado de disponibilidad del usuario.
        </p>

        <div style={{
          display: 'flex',
          gap: 'var(--space-xl)',
          marginBottom: 'var(--space-xl)',
          flexWrap: 'wrap',
        }}>
          <div style={{ textAlign: 'center' }}>
            <Avatar size="lg" initials="ON" status="online" />
            <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--text-sm)', color: 'var(--success)' }}>
              Online
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Avatar size="lg" initials="OF" status="offline" />
            <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              Offline
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Avatar size="lg" initials="BU" status="busy" />
            <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--text-sm)', color: 'var(--danger)' }}>
              Ocupado
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', marginBottom: 'var(--space-lg)' }}>
          <VariableRow variable="--avatar-status-size" value="0.75rem" description="12px - Tamaño del indicador" />
        </div>

        <CodeBlock code={`<div class="avatar-wrapper">
  <img class="avatar avatar-md" src="user.jpg" alt="Usuario" />
  <span class="avatar-status online"></span>
</div>

.avatar-status {
  width: var(--avatar-status-size);
  height: var(--avatar-status-size);
  border-radius: 50%;
  border: 2px solid var(--bg-base);
}

.avatar-status.online { background: var(--success); }
.avatar-status.offline { background: var(--neutral-500); }
.avatar-status.busy { background: var(--danger); }`} />
      </Section>
    </div>
  ),
};

export const GrupoDeAvatares: Story = {
  name: 'Grupo de avatares',
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <Section title="Grupo de avatares superpuestos">
        <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-lg)', maxWidth: '600px' }}>
          Muestra múltiples usuarios en un espacio reducido con superposición.
        </p>

        <div style={{
          display: 'flex',
          marginBottom: 'var(--space-xl)',
        }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                marginLeft: i === 1 ? 0 : 'var(--avatar-group-overlap)',
                zIndex: 10 - i,
              }}
            >
              <Avatar size="md" src={`https://i.pravatar.cc/150?img=${i + 10}`} />
            </div>
          ))}
          <div
            style={{
              marginLeft: 'var(--avatar-group-overlap)',
              width: 'var(--avatar-size-md)',
              height: 'var(--avatar-size-md)',
              borderRadius: 'var(--avatar-radius)',
              background: 'var(--bg-elevated)',
              border: '2px solid var(--bg-base)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--text-sm)',
              color: 'var(--text-muted)',
              fontWeight: 'var(--fw-semibold)',
            }}
          >
            +12
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', marginBottom: 'var(--space-lg)' }}>
          <VariableRow variable="--avatar-group-overlap" value="-0.5rem" description="Superposición negativa entre avatares" />
        </div>

        <CodeBlock code={`<div class="avatar-group">
  <img class="avatar avatar-md" src="user1.jpg" />
  <img class="avatar avatar-md" src="user2.jpg" />
  <img class="avatar avatar-md" src="user3.jpg" />
  <span class="avatar avatar-md">+12</span>
</div>

.avatar-group .avatar {
  margin-left: var(--avatar-group-overlap);
  border: 2px solid var(--bg-base);
}

.avatar-group .avatar:first-child {
  margin-left: 0;
}`} />
      </Section>
    </div>
  ),
};

export const TodasLasVariables: Story = {
  name: 'Todas las variables',
  render: () => (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-3xl)',
        color: 'var(--text-heading)',
        marginBottom: 'var(--space-lg)',
      }}>
        Variables CSS de Avatar
      </h1>

      <Section title="Tamaños">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          <VariableRow variable="--avatar-size-xs" value="1.5rem" description="24px" />
          <VariableRow variable="--avatar-size-sm" value="2rem" description="32px" />
          <VariableRow variable="--avatar-size-md" value="2.5rem" description="40px (defecto)" />
          <VariableRow variable="--avatar-size-lg" value="3rem" description="48px" />
          <VariableRow variable="--avatar-size-xl" value="4rem" description="64px" />
          <VariableRow variable="--avatar-size-2xl" value="6rem" description="96px" />
        </div>
      </Section>

      <Section title="Apariencia">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          <VariableRow variable="--avatar-radius" value="var(--radius-full)" description="Círculo perfecto" />
          <VariableRow variable="--avatar-bg" value="var(--bg-elevated)" description="Fondo placeholder" />
          <VariableRow variable="--avatar-text" value="var(--text-muted)" description="Color de iniciales" />
          <VariableRow variable="--avatar-border" value="2px solid var(--border-subtle)" description="Borde" />
        </div>
      </Section>

      <Section title="Estado y grupos">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          <VariableRow variable="--avatar-status-size" value="0.75rem" description="Indicador de estado (12px)" />
          <VariableRow variable="--avatar-group-overlap" value="-0.5rem" description="Superposición en grupos" />
        </div>
      </Section>
    </div>
  ),
};
