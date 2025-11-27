import { Spinner } from './Spinner'

export default {
  title: 'Feedback/Spinner',
  component: Spinner,
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
    color: {
      control: 'select',
      options: ['primary', 'accent', 'current'],
    },
  },
}

export const Default = {
  args: {},
}

export const AllSizes = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'center' }}>
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
      <Spinner size="xl" />
    </div>
  ),
}

export const AllColors = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'center' }}>
      <Spinner color="primary" />
      <Spinner color="accent" />
      <div style={{ color: 'var(--danger)' }}>
        <Spinner color="current" />
      </div>
    </div>
  ),
}

export const WithText = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
      <Spinner size="sm" />
      <span style={{ color: 'var(--text-body)' }}>Loading...</span>
    </div>
  ),
}

export const InButton = {
  render: () => (
    <button style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-xs)',
      padding: 'var(--space-sm) var(--space-md)',
      background: 'var(--accent)',
      border: 'none',
      borderRadius: 'var(--radius-md)',
      color: 'var(--text-on-accent)',
      fontWeight: 'var(--fw-semibold)',
      cursor: 'wait',
    }}>
      <Spinner size="sm" color="current" />
      Processing...
    </button>
  ),
}
