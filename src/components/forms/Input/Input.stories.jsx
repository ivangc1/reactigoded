import { Input } from './Input'

export default {
  title: 'Forms/Input',
  component: Input,
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    disabled: { control: 'boolean' },
  },
}

export const Default = {
  args: {
    placeholder: 'Enter text...',
  },
}

export const WithLabel = {
  args: {
    label: 'Email',
    placeholder: 'email@example.com',
    type: 'email',
  },
}

export const WithHint = {
  args: {
    label: 'Password',
    hint: 'Must be at least 8 characters',
    type: 'password',
    placeholder: '••••••••',
  },
}

export const WithError = {
  args: {
    label: 'Email',
    error: 'Please enter a valid email address',
    placeholder: 'email@example.com',
    defaultValue: 'invalid-email',
  },
}

export const Disabled = {
  args: {
    label: 'Username',
    placeholder: 'username',
    disabled: true,
    defaultValue: 'johndoe',
  },
}

export const AllSizes = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', maxWidth: '300px' }}>
      <Input size="sm" placeholder="Small input" label="Small" />
      <Input size="md" placeholder="Medium input" label="Medium" />
      <Input size="lg" placeholder="Large input" label="Large" />
    </div>
  ),
}

export const WithIcons = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', maxWidth: '300px' }}>
      <Input
        label="Search"
        placeholder="Search..."
        leftIcon={<span>🔍</span>}
      />
      <Input
        label="Password"
        type="password"
        placeholder="Password"
        rightIcon={<span>👁</span>}
      />
      <Input
        label="Email"
        placeholder="Email"
        leftIcon={<span>✉</span>}
        rightIcon={<span>✓</span>}
      />
    </div>
  ),
}
