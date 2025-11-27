import { Button } from './Button'

export default {
  title: 'Actions/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'accent', 'ghost', 'outline', 'danger'],
      description: 'Estilo visual del botón',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Tamaño del botón',
    },
    glow: {
      control: 'boolean',
      description: 'Añade efecto de resplandor',
    },
    disabled: {
      control: 'boolean',
      description: 'Estado deshabilitado',
    },
    loading: {
      control: 'boolean',
      description: 'Estado de carga',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Ocupa todo el ancho disponible',
    },
  },
}

export const Primary = {
  args: {
    children: 'Button',
    variant: 'primary',
  },
}

export const Accent = {
  args: {
    children: 'Button',
    variant: 'accent',
  },
}

export const Ghost = {
  args: {
    children: 'Button',
    variant: 'ghost',
  },
}

export const Outline = {
  args: {
    children: 'Button',
    variant: 'outline',
  },
}

export const Danger = {
  args: {
    children: 'Delete',
    variant: 'danger',
  },
}

export const WithGlow = {
  args: {
    children: 'Glowing Button',
    variant: 'accent',
    glow: true,
  },
}

export const Loading = {
  args: {
    children: 'Loading...',
    variant: 'primary',
    loading: true,
  },
}

export const Disabled = {
  args: {
    children: 'Disabled',
    variant: 'primary',
    disabled: true,
  },
}

export const AllSizes = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
}

export const AllVariants = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="accent">Accent</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
}

export const WithGlowAll = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
      <Button variant="primary" glow>Primary Glow</Button>
      <Button variant="accent" glow>Accent Glow</Button>
      <Button variant="outline" glow>Outline Glow</Button>
      <Button variant="danger" glow>Danger Glow</Button>
    </div>
  ),
}

export const FullWidth = {
  render: () => (
    <div style={{ width: '300px' }}>
      <Button fullWidth>Full Width Button</Button>
    </div>
  ),
}
