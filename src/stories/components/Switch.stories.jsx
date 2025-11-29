import { useState } from 'react';
import { Switch } from '../../components/Switch';

export default {
  title: 'Components/Switch',
  component: Switch,
};

export const Basic = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4">
      <Switch>Enable notifications</Switch>
      <Switch defaultChecked>Dark mode</Switch>
      <Switch>Auto-save</Switch>
    </div>
  ),
};

export const States = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4">
      <Switch>Off</Switch>
      <Switch defaultChecked>On</Switch>
      <Switch disabled>Disabled off</Switch>
      <Switch disabled defaultChecked>Disabled on</Switch>
    </div>
  ),
};

export const Controlled = {
  render: function ControlledSwitch() {
    const [enabled, setEnabled] = useState(false);
    return (
      <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4">
        <Switch
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        >
          Notifications: {enabled ? 'On' : 'Off'}
        </Switch>
        <p className="ig-text-sm ig-text-muted">
          Status: {enabled ? 'Enabled' : 'Disabled'}
        </p>
      </div>
    );
  },
};

export const WithoutLabel = {
  render: () => (
    <div className="ig-flex ig-items-center ig-gap-4 ig-p-4">
      <span className="ig-text-sm">Wi-Fi</span>
      <Switch defaultChecked />
    </div>
  ),
};

export const SettingsExample = {
  render: () => (
    <div className="ig-p-4 ig-max-w-md">
      <h3 className="ig-text-lg ig-fw-semibold ig-mb-4">Settings</h3>
      <div className="ig-flex ig-flex-col ig-gap-4">
        <div className="ig-flex ig-justify-between ig-items-center">
          <div>
            <p className="ig-fw-medium">Push Notifications</p>
            <p className="ig-text-sm ig-text-muted">Receive push notifications</p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="ig-flex ig-justify-between ig-items-center">
          <div>
            <p className="ig-fw-medium">Email Digest</p>
            <p className="ig-text-sm ig-text-muted">Weekly email summary</p>
          </div>
          <Switch />
        </div>
        <div className="ig-flex ig-justify-between ig-items-center">
          <div>
            <p className="ig-fw-medium">Auto-update</p>
            <p className="ig-text-sm ig-text-muted">Update app automatically</p>
          </div>
          <Switch defaultChecked />
        </div>
      </div>
    </div>
  ),
};
