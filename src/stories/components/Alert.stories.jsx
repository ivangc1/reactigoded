import { useState } from 'react';
import { Alert } from '../../components/Alert';

export default {
  title: 'Components/Alert',
  component: Alert,
};

export const Variants = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4 ig-max-w-lg">
      <Alert variant="success" title="Success!" description="Your changes have been saved successfully." />
      <Alert variant="warning" title="Warning" description="Please review your input before proceeding." />
      <Alert variant="danger" title="Error" description="Something went wrong. Please try again." />
      <Alert variant="info" title="Info" description="A new version is available for download." />
    </div>
  ),
};

export const BrandVariants = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4 ig-max-w-lg">
      <Alert variant="primary" title="Primary Alert" description="Using primary theme color." />
      <Alert variant="accent" title="Accent Alert" description="Using accent theme color." />
      <Alert variant="neutral" title="Neutral Alert" description="Using neutral gray color." />
    </div>
  ),
};

export const WithIcons = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4 ig-max-w-lg">
      <Alert
        variant="success"
        icon="&#10003;"
        title="Success!"
        description="Your payment has been processed."
      />
      <Alert
        variant="warning"
        icon="&#9888;"
        title="Warning"
        description="Your session will expire in 5 minutes."
      />
      <Alert
        variant="danger"
        icon="&#10007;"
        title="Error"
        description="Failed to connect to the server."
      />
      <Alert
        variant="info"
        icon="&#8505;"
        title="Did you know?"
        description="You can customize your dashboard in settings."
      />
    </div>
  ),
};

export const Dismissible = {
  render: function DismissibleAlerts() {
    const [visible, setVisible] = useState({
      success: true,
      warning: true,
      danger: true,
    });

    return (
      <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4 ig-max-w-lg">
        {visible.success && (
          <Alert
            variant="success"
            title="Dismissible Success"
            description="Click the X to dismiss this alert."
            onClose={() => setVisible(v => ({ ...v, success: false }))}
          />
        )}
        {visible.warning && (
          <Alert
            variant="warning"
            title="Dismissible Warning"
            description="This alert can be closed."
            onClose={() => setVisible(v => ({ ...v, warning: false }))}
          />
        )}
        {visible.danger && (
          <Alert
            variant="danger"
            title="Dismissible Error"
            description="You can dismiss this error."
            onClose={() => setVisible(v => ({ ...v, danger: false }))}
          />
        )}
        {!visible.success && !visible.warning && !visible.danger && (
          <p className="ig-text-muted">All alerts dismissed. Refresh to see them again.</p>
        )}
      </div>
    );
  },
};

export const WithCustomContent = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4 ig-max-w-lg">
      <Alert variant="info" title="New Feature Available">
        <p className="ig-text-sm ig-mt-2">
          We have added a new dark mode feature. You can enable it in your settings.
        </p>
        <div className="ig-flex ig-gap-2 ig-mt-3">
          <button className="ig-btn ig-btn-primary ig-btn-sm">Enable Now</button>
          <button className="ig-btn ig-btn-ghost ig-btn-sm">Maybe Later</button>
        </div>
      </Alert>
    </div>
  ),
};
