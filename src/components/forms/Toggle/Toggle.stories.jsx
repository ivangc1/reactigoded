import { useState } from 'react'
import { Toggle } from './Toggle'

export default {
  title: 'Forms/Toggle',
  component: Toggle,
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    color: {
      control: 'select',
      options: ['primary', 'accent', 'success'],
    },
    disabled: { control: 'boolean' },
  },
}

export const Default = {
  args: {
    label: 'Enable notifications',
  },
}

export const Checked = {
  args: {
    label: 'Dark mode',
    checked: true,
  },
}

export const Disabled = {
  args: {
    label: 'Disabled toggle',
    disabled: true,
  },
}

export const AllSizes = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <Toggle size="sm" label="Small" checked />
      <Toggle size="md" label="Medium" checked />
      <Toggle size="lg" label="Large" checked />
    </div>
  ),
}

export const AllColors = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <Toggle color="primary" label="Primary color" checked />
      <Toggle color="accent" label="Accent color" checked />
      <Toggle color="success" label="Success color" checked />
    </div>
  ),
}

export const Interactive = {
  render: () => {
    const [enabled, setEnabled] = useState(false)
    return (
      <Toggle
        label={`Notifications ${enabled ? 'enabled' : 'disabled'}`}
        checked={enabled}
        onChange={(e) => setEnabled(e.target.checked)}
      />
    )
  },
}

export const SettingsExample = {
  render: () => {
    const [settings, setSettings] = useState({
      notifications: true,
      darkMode: false,
      autoSave: true,
    })

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-md)',
        padding: 'var(--space-lg)',
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        maxWidth: '300px',
      }}>
        <h3 style={{ color: 'var(--text-heading)', margin: 0 }}>Settings</h3>
        <Toggle
          label="Push notifications"
          checked={settings.notifications}
          onChange={(e) => setSettings(s => ({ ...s, notifications: e.target.checked }))}
        />
        <Toggle
          label="Dark mode"
          checked={settings.darkMode}
          onChange={(e) => setSettings(s => ({ ...s, darkMode: e.target.checked }))}
        />
        <Toggle
          label="Auto-save"
          checked={settings.autoSave}
          onChange={(e) => setSettings(s => ({ ...s, autoSave: e.target.checked }))}
          color="success"
        />
      </div>
    )
  },
}
