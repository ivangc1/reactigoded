import { Alert } from './Alert'

export default {
  title: 'Feedback/Alert',
  component: Alert,
  argTypes: {
    variant: {
      control: 'select',
      options: ['info', 'success', 'warning', 'danger'],
    },
    dismissible: { control: 'boolean' },
  },
}

export const Info = {
  args: {
    variant: 'info',
    title: 'Information',
    children: 'This is an informational alert message.',
  },
}

export const Success = {
  args: {
    variant: 'success',
    title: 'Success!',
    children: 'Your changes have been saved successfully.',
  },
}

export const Warning = {
  args: {
    variant: 'warning',
    title: 'Warning',
    children: 'Please review your input before continuing.',
  },
}

export const Danger = {
  args: {
    variant: 'danger',
    title: 'Error',
    children: 'Something went wrong. Please try again.',
  },
}

export const Dismissible = {
  args: {
    variant: 'info',
    title: 'Dismissible Alert',
    children: 'Click the X button to dismiss this alert.',
    dismissible: true,
  },
}

export const TitleOnly = {
  args: {
    variant: 'success',
    title: 'Operation completed successfully!',
  },
}

export const AllVariants = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', maxWidth: '500px' }}>
      <Alert variant="info" title="Info" dismissible>
        This is an info alert with some details.
      </Alert>
      <Alert variant="success" title="Success" dismissible>
        This is a success alert with some details.
      </Alert>
      <Alert variant="warning" title="Warning" dismissible>
        This is a warning alert with some details.
      </Alert>
      <Alert variant="danger" title="Danger" dismissible>
        This is a danger alert with some details.
      </Alert>
    </div>
  ),
}
