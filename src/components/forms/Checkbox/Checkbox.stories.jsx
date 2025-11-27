import { useState } from 'react'
import { Checkbox } from './Checkbox'

export default {
  title: 'Forms/Checkbox',
  component: Checkbox,
  argTypes: {
    color: {
      control: 'select',
      options: ['primary', 'accent'],
    },
    disabled: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
  },
}

export const Default = {
  args: {
    label: 'Accept terms and conditions',
  },
}

export const Checked = {
  args: {
    label: 'This is checked',
    checked: true,
  },
}

export const Indeterminate = {
  args: {
    label: 'Indeterminate state',
    indeterminate: true,
  },
}

export const Disabled = {
  args: {
    label: 'Disabled checkbox',
    disabled: true,
  },
}

export const DisabledChecked = {
  args: {
    label: 'Disabled checked',
    disabled: true,
    checked: true,
  },
}

export const PrimaryColor = {
  args: {
    label: 'Primary color checkbox',
    color: 'primary',
    checked: true,
  },
}

export const Interactive = {
  render: () => {
    const [checked, setChecked] = useState(false)
    return (
      <Checkbox
        label={`Click me (${checked ? 'checked' : 'unchecked'})`}
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
      />
    )
  },
}

export const CheckboxGroup = {
  render: () => {
    const [selected, setSelected] = useState(['option1'])
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' },
    ]

    const handleChange = (value) => {
      setSelected(prev =>
        prev.includes(value)
          ? prev.filter(v => v !== value)
          : [...prev, value]
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {options.map(opt => (
          <Checkbox
            key={opt.value}
            label={opt.label}
            checked={selected.includes(opt.value)}
            onChange={() => handleChange(opt.value)}
          />
        ))}
      </div>
    )
  },
}
