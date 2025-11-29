import { useState } from 'react';
import { Toast, ToastContainer } from '../../components/Toast';
import { Button } from '../../components/Button';

export default {
  title: 'Components/Toast',
  component: Toast,
};

export const Variants = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4" style={{ maxWidth: '400px' }}>
      <Toast title="Default Toast" message="This is a default toast notification." />
      <Toast variant="success" title="Success!" message="Your changes have been saved." />
      <Toast variant="warning" title="Warning" message="Please review your input." />
      <Toast variant="danger" title="Error" message="Something went wrong." />
      <Toast variant="info" title="Info" message="New update available." />
    </div>
  ),
};

export const WithIcons = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4" style={{ maxWidth: '400px' }}>
      <Toast variant="success" icon="&#10003;" title="Saved!" message="Your profile has been updated." />
      <Toast variant="warning" icon="&#9888;" title="Warning" message="Low disk space." />
      <Toast variant="danger" icon="&#10007;" title="Failed" message="Upload failed. Please retry." />
      <Toast variant="info" icon="&#8505;" title="Tip" message="Press Ctrl+S to save." />
    </div>
  ),
};

export const Dismissible = {
  render: function DismissibleToasts() {
    const [toasts, setToasts] = useState([
      { id: 1, variant: 'success', title: 'Success', message: 'Click X to dismiss.' },
      { id: 2, variant: 'info', title: 'Info', message: 'This can be closed.' },
    ]);

    return (
      <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4" style={{ maxWidth: '400px' }}>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            variant={toast.variant}
            title={toast.title}
            message={toast.message}
            onClose={() => setToasts(t => t.filter(x => x.id !== toast.id))}
          />
        ))}
        {toasts.length === 0 && <p className="ig-text-muted">All toasts dismissed.</p>}
      </div>
    );
  },
};

export const Positions = {
  render: function ToastPositions() {
    const [position, setPosition] = useState('top-right');
    const [show, setShow] = useState(false);

    return (
      <div className="ig-p-4">
        <div className="ig-flex ig-flex-wrap ig-gap-2 ig-mb-4">
          {['top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'].map(pos => (
            <Button
              key={pos}
              variant={position === pos ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setPosition(pos)}
            >
              {pos}
            </Button>
          ))}
        </div>
        <Button onClick={() => setShow(true)}>Show Toast</Button>

        {show && (
          <ToastContainer position={position}>
            <Toast
              variant="success"
              icon="&#10003;"
              title="Position Demo"
              message={`Toast at ${position}`}
              onClose={() => setShow(false)}
            />
          </ToastContainer>
        )}
      </div>
    );
  },
};
