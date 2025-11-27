import { Card } from './Card'

export default {
  title: 'Layout/Card',
  component: Card,
  argTypes: {
    variant: {
      control: 'select',
      options: ['elevated', 'glass', 'neumorphic', 'outline'],
    },
    color: {
      control: 'select',
      options: ['default', 'tellus', 'liminal', 'senum', 'vesper'],
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
    },
    hoverable: { control: 'boolean' },
  },
}

const CardContent = () => (
  <>
    <h3 style={{
      fontFamily: 'var(--font-heading)',
      fontSize: 'var(--text-xl)',
      color: 'var(--text-heading)',
      marginBottom: 'var(--space-sm)',
    }}>
      Card Title
    </h3>
    <p style={{
      color: 'var(--text-body)',
      fontSize: 'var(--text-base)',
    }}>
      This is some example card content. Cards can contain any type of content.
    </p>
  </>
)

export const Elevated = {
  args: {
    variant: 'elevated',
    children: <CardContent />,
  },
}

export const Glass = {
  render: () => (
    <div style={{
      background: 'linear-gradient(135deg, var(--tellus), var(--liminal), var(--senum))',
      padding: 'var(--space-2xl)',
      borderRadius: 'var(--radius-xl)',
    }}>
      <Card variant="glass">
        <CardContent />
      </Card>
    </div>
  ),
}

export const Neumorphic = {
  render: () => (
    <div style={{
      background: 'var(--bg-surface)',
      padding: 'var(--space-2xl)',
      borderRadius: 'var(--radius-xl)',
    }}>
      <Card variant="neumorphic">
        <CardContent />
      </Card>
    </div>
  ),
}

export const Outline = {
  args: {
    variant: 'outline',
    children: <CardContent />,
  },
}

export const WithColorAccent = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--space-md)', maxWidth: '400px' }}>
      <Card color="tellus"><CardContent /></Card>
      <Card color="liminal"><CardContent /></Card>
      <Card color="senum"><CardContent /></Card>
      <Card color="vesper"><CardContent /></Card>
    </div>
  ),
}

export const Hoverable = {
  args: {
    variant: 'elevated',
    hoverable: true,
    children: <CardContent />,
  },
}

export const AllVariants = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--space-lg)', maxWidth: '400px' }}>
      <Card variant="elevated"><CardContent /></Card>
      <Card variant="outline"><CardContent /></Card>
      <div style={{
        background: 'var(--bg-surface)',
        padding: 'var(--space-lg)',
        borderRadius: 'var(--radius-lg)',
      }}>
        <Card variant="neumorphic"><CardContent /></Card>
      </div>
    </div>
  ),
}

export const GlassColors = {
  render: () => (
    <div style={{
      background: 'linear-gradient(135deg, var(--tellus) 0%, var(--liminal) 50%, var(--vesper) 100%)',
      padding: 'var(--space-2xl)',
      borderRadius: 'var(--radius-xl)',
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 'var(--space-md)',
    }}>
      <Card variant="glass" color="tellus">
        <h4 style={{ color: 'var(--text-heading)' }}>Tellus Glass</h4>
      </Card>
      <Card variant="glass" color="liminal">
        <h4 style={{ color: 'var(--text-heading)' }}>Liminal Glass</h4>
      </Card>
      <Card variant="glass" color="senum">
        <h4 style={{ color: 'var(--text-heading)' }}>Senum Glass</h4>
      </Card>
      <Card variant="glass" color="vesper">
        <h4 style={{ color: 'var(--text-heading)' }}>Vesper Glass</h4>
      </Card>
    </div>
  ),
}
