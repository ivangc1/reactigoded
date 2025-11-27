import { useState, useEffect } from 'react'
import { Progress } from './Progress'

export default {
  title: 'Feedback/Progress',
  component: Progress,
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100 } },
    variant: {
      control: 'select',
      options: ['default', 'success', 'warning', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    showLabel: { control: 'boolean' },
  },
}

export const Default = {
  args: {
    value: 60,
    variant: 'default',
    size: 'md',
  },
}

export const WithLabel = {
  args: {
    value: 75,
    variant: 'default',
    showLabel: true,
  },
}

export const Success = {
  args: {
    value: 100,
    variant: 'success',
    showLabel: true,
  },
}

export const Warning = {
  args: {
    value: 80,
    variant: 'warning',
    showLabel: true,
  },
}

export const Danger = {
  args: {
    value: 95,
    variant: 'danger',
    showLabel: true,
  },
}

export const Small = {
  args: {
    value: 50,
    size: 'sm',
  },
}

export const Large = {
  args: {
    value: 50,
    size: 'lg',
  },
}

export const Sizes = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', width: '300px' }}>
      <div>
        <p style={{ marginBottom: 'var(--space-xs)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Small</p>
        <Progress value={60} size="sm" showLabel />
      </div>
      <div>
        <p style={{ marginBottom: 'var(--space-xs)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Medium</p>
        <Progress value={60} size="md" showLabel />
      </div>
      <div>
        <p style={{ marginBottom: 'var(--space-xs)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Large</p>
        <Progress value={60} size="lg" showLabel />
      </div>
    </div>
  ),
}

export const AllVariants = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', width: '300px' }}>
      <div>
        <p style={{ marginBottom: 'var(--space-xs)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Default</p>
        <Progress value={50} variant="default" showLabel />
      </div>
      <div>
        <p style={{ marginBottom: 'var(--space-xs)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Success</p>
        <Progress value={100} variant="success" showLabel />
      </div>
      <div>
        <p style={{ marginBottom: 'var(--space-xs)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Warning</p>
        <Progress value={75} variant="warning" showLabel />
      </div>
      <div>
        <p style={{ marginBottom: 'var(--space-xs)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Danger</p>
        <Progress value={90} variant="danger" showLabel />
      </div>
    </div>
  ),
}

// Animated progress demo
const AnimatedProgress = () => {
  const [value, setValue] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setValue((prev) => {
        if (prev >= 100) return 0
        return prev + 2
      })
    }, 100)
    return () => clearInterval(interval)
  }, [])

  const getVariant = () => {
    if (value >= 90) return 'danger'
    if (value >= 70) return 'warning'
    if (value >= 100) return 'success'
    return 'default'
  }

  return <Progress value={value} variant={getVariant()} showLabel size="lg" />
}

export const Animated = {
  render: () => (
    <div style={{ width: '300px' }}>
      <AnimatedProgress />
    </div>
  ),
}

export const UsageLevels = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', width: '300px' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>Storage</span>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>2.5 GB / 10 GB</span>
        </div>
        <Progress value={25} variant="default" />
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>Bandwidth</span>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>7.8 GB / 10 GB</span>
        </div>
        <Progress value={78} variant="warning" />
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>CPU Usage</span>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>92%</span>
        </div>
        <Progress value={92} variant="danger" />
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>Download</span>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Complete!</span>
        </div>
        <Progress value={100} variant="success" />
      </div>
    </div>
  ),
}
