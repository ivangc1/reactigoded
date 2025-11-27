import { useState } from 'react'
import { Toast, ToastContainer, useToast } from './Toast'

export default {
  title: 'Feedback/Toast',
  component: Toast,
  argTypes: {
    variant: {
      control: 'select',
      options: ['info', 'success', 'warning', 'danger'],
    },
    duration: { control: 'number' },
    dismissible: { control: 'boolean' },
  },
}

export const Info = {
  args: {
    variant: 'info',
    title: 'Information',
    children: 'This is an informational toast message.',
    duration: 0,
  },
}

export const Success = {
  args: {
    variant: 'success',
    title: 'Success!',
    children: 'Your changes have been saved successfully.',
    duration: 0,
  },
}

export const Warning = {
  args: {
    variant: 'warning',
    title: 'Warning',
    children: 'Please review your input before continuing.',
    duration: 0,
  },
}

export const Danger = {
  args: {
    variant: 'danger',
    title: 'Error',
    children: 'Something went wrong. Please try again.',
    duration: 0,
  },
}

export const AutoDismiss = {
  args: {
    variant: 'success',
    title: 'Auto Dismiss',
    children: 'This toast will disappear in 3 seconds.',
    duration: 3000,
  },
}

export const NonDismissible = {
  args: {
    variant: 'info',
    title: 'Non-dismissible',
    children: 'This toast cannot be manually dismissed.',
    dismissible: false,
    duration: 0,
  },
}

export const TitleOnly = {
  args: {
    variant: 'success',
    title: 'Operation completed!',
    duration: 0,
  },
}

export const AllVariants = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', maxWidth: '400px' }}>
      <Toast variant="info" title="Info" duration={0}>
        This is an info toast with some details.
      </Toast>
      <Toast variant="success" title="Success" duration={0}>
        This is a success toast with some details.
      </Toast>
      <Toast variant="warning" title="Warning" duration={0}>
        This is a warning toast with some details.
      </Toast>
      <Toast variant="danger" title="Danger" duration={0}>
        This is a danger toast with some details.
      </Toast>
    </div>
  ),
}

// Demo component for ToastContainer
const ToastDemo = () => {
  const { addToast } = useToast()

  const showToast = (variant) => {
    const messages = {
      info: { title: 'Information', message: 'This is an info message.' },
      success: { title: 'Success!', message: 'Operation completed successfully.' },
      warning: { title: 'Warning', message: 'Please proceed with caution.' },
      danger: { title: 'Error', message: 'Something went wrong.' },
    }
    addToast({ variant, ...messages[variant], duration: 3000 })
  }

  const buttonStyle = {
    padding: 'var(--space-sm) var(--space-md)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font-base)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--fw-medium)',
    color: 'white',
  }

  return (
    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
      <button style={{ ...buttonStyle, background: 'var(--info)' }} onClick={() => showToast('info')}>
        Show Info Toast
      </button>
      <button style={{ ...buttonStyle, background: 'var(--success)' }} onClick={() => showToast('success')}>
        Show Success Toast
      </button>
      <button style={{ ...buttonStyle, background: 'var(--warning)' }} onClick={() => showToast('warning')}>
        Show Warning Toast
      </button>
      <button style={{ ...buttonStyle, background: 'var(--danger)' }} onClick={() => showToast('danger')}>
        Show Danger Toast
      </button>
    </div>
  )
}

export const WithContainer = {
  render: () => (
    <ToastContainer position="bottom-right">
      <ToastDemo />
    </ToastContainer>
  ),
}
