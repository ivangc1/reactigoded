import { Badge } from '../../components/Badge';

export default {
  title: 'Components/Badge',
  component: Badge,
};

export const AllVariants = {
  render: () => (
    <div className="ig-flex ig-flex-wrap ig-gap-3 ig-p-4">
      <Badge>Default</Badge>
      <Badge variant="primary">Primary</Badge>
      <Badge variant="accent">Accent</Badge>
      <Badge variant="tellus">Tellus</Badge>
      <Badge variant="liminal">Liminal</Badge>
      <Badge variant="senum">Senum</Badge>
      <Badge variant="vesper">Vesper</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="danger">Danger</Badge>
      <Badge variant="info">Info</Badge>
    </div>
  ),
};

export const Sizes = {
  render: () => (
    <div className="ig-flex ig-items-center ig-gap-3 ig-p-4">
      <Badge size="sm" variant="primary">Small</Badge>
      <Badge variant="primary">Default</Badge>
      <Badge size="lg" variant="primary">Large</Badge>
    </div>
  ),
};

export const Outline = {
  render: () => (
    <div className="ig-flex ig-flex-wrap ig-gap-3 ig-p-4">
      <Badge outline>Outline</Badge>
      <Badge outline variant="primary">Primary</Badge>
      <Badge outline variant="success">Success</Badge>
      <Badge outline variant="danger">Danger</Badge>
    </div>
  ),
};

export const Dots = {
  render: () => (
    <div className="ig-flex ig-items-center ig-gap-4 ig-p-4">
      <div className="ig-flex ig-items-center ig-gap-2">
        <Badge dot variant="success" />
        <span>Online</span>
      </div>
      <div className="ig-flex ig-items-center ig-gap-2">
        <Badge dot />
        <span>Offline</span>
      </div>
      <div className="ig-flex ig-items-center ig-gap-2">
        <Badge dot variant="warning" />
        <span>Away</span>
      </div>
      <div className="ig-flex ig-items-center ig-gap-2">
        <Badge dot variant="danger" />
        <span>Busy</span>
      </div>
    </div>
  ),
};

export const WithText = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4">
      <div className="ig-flex ig-items-center ig-gap-2">
        <span>Notifications</span>
        <Badge variant="danger">5</Badge>
      </div>
      <div className="ig-flex ig-items-center ig-gap-2">
        <span>Messages</span>
        <Badge variant="primary">12</Badge>
      </div>
      <div className="ig-flex ig-items-center ig-gap-2">
        <span>Status</span>
        <Badge variant="success">Active</Badge>
      </div>
      <div className="ig-flex ig-items-center ig-gap-2">
        <span>Version</span>
        <Badge variant="accent">v2.0</Badge>
      </div>
    </div>
  ),
};

export const InButtons = {
  render: () => (
    <div className="ig-flex ig-gap-4 ig-p-4">
      <button className="ig-btn ig-btn-outline ig-flex ig-items-center ig-gap-2">
        Inbox <Badge variant="danger" size="sm">3</Badge>
      </button>
      <button className="ig-btn ig-btn-primary ig-flex ig-items-center ig-gap-2">
        Updates <Badge size="sm">New</Badge>
      </button>
    </div>
  ),
};
