import { Avatar, AvatarGroup } from '../../components/Avatar';

export default {
  title: 'Components/Avatar',
  component: Avatar,
};

export const Sizes = {
  render: () => (
    <div className="ig-flex ig-items-end ig-gap-4 ig-p-4">
      <Avatar size="xs" initials="XS" />
      <Avatar size="sm" initials="SM" />
      <Avatar size="md" initials="MD" />
      <Avatar size="lg" initials="LG" />
      <Avatar size="xl" initials="XL" />
      <Avatar size="2xl" initials="2X" />
    </div>
  ),
};

export const WithInitials = {
  render: () => (
    <div className="ig-flex ig-gap-4 ig-p-4">
      <Avatar initials="JD" />
      <Avatar initials="AB" />
      <Avatar initials="XY" />
      <Avatar initials="?" />
    </div>
  ),
};

export const WithImage = {
  render: () => (
    <div className="ig-flex ig-gap-4 ig-p-4">
      <Avatar src="https://i.pravatar.cc/100?img=1" alt="User 1" />
      <Avatar src="https://i.pravatar.cc/100?img=2" alt="User 2" />
      <Avatar src="https://i.pravatar.cc/100?img=3" alt="User 3" />
      <Avatar src="https://i.pravatar.cc/100?img=4" alt="User 4" />
    </div>
  ),
};

export const Rounded = {
  render: () => (
    <div className="ig-flex ig-gap-4 ig-p-4">
      <Avatar initials="JD" />
      <Avatar initials="JD" rounded />
      <Avatar src="https://i.pravatar.cc/100?img=5" />
      <Avatar src="https://i.pravatar.cc/100?img=5" rounded />
    </div>
  ),
};

export const WithStatus = {
  render: () => (
    <div className="ig-flex ig-gap-6 ig-p-4">
      <div className="ig-flex ig-flex-col ig-items-center ig-gap-2">
        <Avatar initials="ON" status="online" />
        <span className="ig-text-xs">Online</span>
      </div>
      <div className="ig-flex ig-flex-col ig-items-center ig-gap-2">
        <Avatar initials="OF" status="offline" />
        <span className="ig-text-xs">Offline</span>
      </div>
      <div className="ig-flex ig-flex-col ig-items-center ig-gap-2">
        <Avatar initials="AW" status="away" />
        <span className="ig-text-xs">Away</span>
      </div>
      <div className="ig-flex ig-flex-col ig-items-center ig-gap-2">
        <Avatar initials="BY" status="busy" />
        <span className="ig-text-xs">Busy</span>
      </div>
    </div>
  ),
};

export const Group = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-6 ig-p-4">
      <AvatarGroup>
        <Avatar src="https://i.pravatar.cc/100?img=1" />
        <Avatar src="https://i.pravatar.cc/100?img=2" />
        <Avatar src="https://i.pravatar.cc/100?img=3" />
        <Avatar initials="+5" />
      </AvatarGroup>

      <AvatarGroup>
        <Avatar size="lg" src="https://i.pravatar.cc/100?img=10" />
        <Avatar size="lg" src="https://i.pravatar.cc/100?img=11" />
        <Avatar size="lg" src="https://i.pravatar.cc/100?img=12" />
        <Avatar size="lg" src="https://i.pravatar.cc/100?img=13" />
      </AvatarGroup>
    </div>
  ),
};

export const InContext = {
  render: () => (
    <div className="ig-p-4">
      <div className="ig-flex ig-items-center ig-gap-3 ig-p-3 ig-rounded-lg" style={{ background: 'var(--ig-bg-muted)' }}>
        <Avatar src="https://i.pravatar.cc/100?img=8" status="online" />
        <div>
          <p className="ig-fw-medium">John Doe</p>
          <p className="ig-text-sm ig-text-muted">Software Engineer</p>
        </div>
      </div>
    </div>
  ),
};
