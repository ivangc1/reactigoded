import { Skeleton } from './Skeleton'

export default {
  title: 'Feedback/Skeleton',
  component: Skeleton,
  argTypes: {
    variant: {
      control: 'select',
      options: ['text', 'circular', 'rectangular'],
    },
    animation: { control: 'boolean' },
    width: { control: 'text' },
    height: { control: 'text' },
  },
}

export const Text = {
  args: {
    variant: 'text',
    width: '200px',
  },
}

export const Circular = {
  args: {
    variant: 'circular',
    width: '48px',
  },
}

export const Rectangular = {
  args: {
    variant: 'rectangular',
    width: '300px',
    height: '150px',
  },
}

export const NoAnimation = {
  args: {
    variant: 'rectangular',
    width: '200px',
    height: '100px',
    animation: false,
  },
}

export const TextLines = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', width: '300px' }}>
      <Skeleton variant="text" />
      <Skeleton variant="text" width="90%" />
      <Skeleton variant="text" width="75%" />
    </div>
  ),
}

export const CardSkeleton = {
  render: () => (
    <div style={{
      padding: 'var(--space-md)',
      background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-md)',
      width: '300px',
    }}>
      <Skeleton variant="rectangular" height="150px" style={{ marginBottom: 'var(--space-md)' }} />
      <Skeleton variant="text" width="70%" style={{ marginBottom: 'var(--space-sm)' }} />
      <Skeleton variant="text" width="100%" style={{ marginBottom: 'var(--space-xs)' }} />
      <Skeleton variant="text" width="85%" />
    </div>
  ),
}

export const ListItemSkeleton = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', width: '350px' }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <Skeleton variant="circular" width="48px" />
          <div style={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" style={{ marginBottom: 'var(--space-xs)' }} />
            <Skeleton variant="text" width="80%" height="0.8em" />
          </div>
        </div>
      ))}
    </div>
  ),
}

export const ProfileSkeleton = {
  render: () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--space-md)',
      padding: 'var(--space-lg)',
      width: '200px',
    }}>
      <Skeleton variant="circular" width="80px" height="80px" />
      <Skeleton variant="text" width="120px" height="1.2em" />
      <Skeleton variant="text" width="80px" height="0.9em" />
    </div>
  ),
}

export const AllVariants = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div>
        <p style={{ marginBottom: 'var(--space-sm)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Text</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', width: '250px' }}>
          <Skeleton variant="text" />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="60%" />
        </div>
      </div>
      <div>
        <p style={{ marginBottom: 'var(--space-sm)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Circular</p>
        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <Skeleton variant="circular" width="32px" />
          <Skeleton variant="circular" width="48px" />
          <Skeleton variant="circular" width="64px" />
        </div>
      </div>
      <div>
        <p style={{ marginBottom: 'var(--space-sm)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Rectangular</p>
        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <Skeleton variant="rectangular" width="100px" height="60px" />
          <Skeleton variant="rectangular" width="100px" height="60px" />
          <Skeleton variant="rectangular" width="100px" height="60px" />
        </div>
      </div>
    </div>
  ),
}
