import { Avatar } from './Avatar'

export default {
  title: 'Media/Avatar',
  component: Avatar,
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    shape: {
      control: 'select',
      options: ['circle', 'rounded', 'square'],
    },
    status: {
      control: 'select',
      options: [undefined, 'online', 'offline', 'away', 'busy'],
    },
  },
}

export const Default = {
  args: {
    src: 'https://i.pravatar.cc/150?img=1',
    alt: 'User avatar',
  },
}

export const WithFallback = {
  args: {
    fallback: 'JD',
  },
}

export const AllSizes = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
      <Avatar size="xs" fallback="XS" />
      <Avatar size="sm" fallback="SM" />
      <Avatar size="md" fallback="MD" />
      <Avatar size="lg" fallback="LG" />
      <Avatar size="xl" fallback="XL" />
    </div>
  ),
}

export const AllShapes = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
      <Avatar shape="circle" fallback="C" size="lg" />
      <Avatar shape="rounded" fallback="R" size="lg" />
      <Avatar shape="square" fallback="S" size="lg" />
    </div>
  ),
}

export const WithStatus = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
      <Avatar fallback="ON" status="online" />
      <Avatar fallback="OF" status="offline" />
      <Avatar fallback="AW" status="away" />
      <Avatar fallback="BS" status="busy" />
    </div>
  ),
}

export const AvatarGroup = {
  render: () => (
    <div style={{ display: 'flex' }}>
      {[1, 2, 3, 4, 5].map((n, i) => (
        <div key={n} style={{ marginLeft: i > 0 ? '-12px' : 0, zIndex: 5 - i }}>
          <Avatar
            src={`https://i.pravatar.cc/150?img=${n}`}
            alt={`User ${n}`}
            style={{ border: '2px solid var(--bg-surface)' }}
          />
        </div>
      ))}
      <div style={{ marginLeft: '-12px', zIndex: 0 }}>
        <Avatar fallback="+5" style={{ border: '2px solid var(--bg-surface)' }} />
      </div>
    </div>
  ),
}
