import { Badge } from './Badge'

export default {
  title: 'Feedback/Badge',
  component: Badge,
  argTypes: {
    variant: {
      control: 'select',
      options: ['solid', 'outline', 'glass', 'dot'],
    },
    color: {
      control: 'select',
      options: ['primary', 'accent', 'success', 'warning', 'danger', 'info'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md'],
    },
  },
}

export const Default = {
  args: {
    children: 'Badge',
  },
}

export const AllVariants = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
      <Badge variant="solid">Solid</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="glass">Glass</Badge>
      <Badge variant="dot">Dot</Badge>
    </div>
  ),
}

export const AllColors = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
      <Badge color="primary">Primary</Badge>
      <Badge color="accent">Accent</Badge>
      <Badge color="success">Success</Badge>
      <Badge color="warning">Warning</Badge>
      <Badge color="danger">Danger</Badge>
      <Badge color="info">Info</Badge>
    </div>
  ),
}

export const OutlineColors = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
      <Badge variant="outline" color="primary">Primary</Badge>
      <Badge variant="outline" color="accent">Accent</Badge>
      <Badge variant="outline" color="success">Success</Badge>
      <Badge variant="outline" color="warning">Warning</Badge>
      <Badge variant="outline" color="danger">Danger</Badge>
      <Badge variant="outline" color="info">Info</Badge>
    </div>
  ),
}

export const StatusBadges = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
      <Badge variant="dot" color="success">Active</Badge>
      <Badge variant="dot" color="warning">Pending</Badge>
      <Badge variant="dot" color="danger">Offline</Badge>
      <Badge variant="dot" color="info">Beta</Badge>
    </div>
  ),
}

export const Sizes = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
    </div>
  ),
}
