import { useState } from 'react'
import { Tabs } from './Tabs'

export default {
  title: 'Navigation/Tabs',
  component: Tabs,
  argTypes: {
    variant: {
      control: 'select',
      options: ['line', 'enclosed', 'pills'],
    },
  },
}

const tabItems = [
  { key: 'tab1', label: 'Profile', content: <p style={{ color: 'var(--text-body)' }}>Profile content goes here.</p> },
  { key: 'tab2', label: 'Settings', content: <p style={{ color: 'var(--text-body)' }}>Settings content goes here.</p> },
  { key: 'tab3', label: 'Notifications', content: <p style={{ color: 'var(--text-body)' }}>Notifications content goes here.</p> },
]

export const Line = {
  args: {
    items: tabItems,
    variant: 'line',
  },
}

export const Enclosed = {
  args: {
    items: tabItems,
    variant: 'enclosed',
  },
}

export const Pills = {
  args: {
    items: tabItems,
    variant: 'pills',
  },
}

export const WithIcons = {
  args: {
    items: [
      { key: 'tab1', label: 'Home', icon: '🏠', content: <p style={{ color: 'var(--text-body)' }}>Home content</p> },
      { key: 'tab2', label: 'Search', icon: '🔍', content: <p style={{ color: 'var(--text-body)' }}>Search content</p> },
      { key: 'tab3', label: 'Profile', icon: '👤', content: <p style={{ color: 'var(--text-body)' }}>Profile content</p> },
    ],
    variant: 'pills',
  },
}

export const WithDisabled = {
  args: {
    items: [
      { key: 'tab1', label: 'Available', content: <p style={{ color: 'var(--text-body)' }}>Available tab content</p> },
      { key: 'tab2', label: 'Disabled', disabled: true, content: <p style={{ color: 'var(--text-body)' }}>Disabled content</p> },
      { key: 'tab3', label: 'Another', content: <p style={{ color: 'var(--text-body)' }}>Another tab content</p> },
    ],
  },
}

export const Controlled = {
  render: () => {
    const [activeKey, setActiveKey] = useState('tab2')
    return (
      <div>
        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
          Active: {activeKey}
        </p>
        <Tabs
          items={tabItems}
          activeKey={activeKey}
          onChange={setActiveKey}
        />
      </div>
    )
  },
}

export const AllVariants = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }}>
      <div>
        <h4 style={{ color: 'var(--text-heading)', marginBottom: 'var(--space-sm)' }}>Line</h4>
        <Tabs items={tabItems} variant="line" />
      </div>
      <div>
        <h4 style={{ color: 'var(--text-heading)', marginBottom: 'var(--space-sm)' }}>Enclosed</h4>
        <Tabs items={tabItems} variant="enclosed" />
      </div>
      <div>
        <h4 style={{ color: 'var(--text-heading)', marginBottom: 'var(--space-sm)' }}>Pills</h4>
        <Tabs items={tabItems} variant="pills" />
      </div>
    </div>
  ),
}
