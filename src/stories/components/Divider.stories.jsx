import { Divider } from '../../components/Divider';

export default {
  title: 'Components/Divider',
  component: Divider,
};

export const Horizontal = {
  render: () => (
    <div className="ig-p-4 ig-max-w-md">
      <p>Content above the divider</p>
      <Divider />
      <p>Content below the divider</p>
    </div>
  ),
};

export const Dashed = {
  render: () => (
    <div className="ig-p-4 ig-max-w-md">
      <p>Content above</p>
      <Divider dashed />
      <p>Content below</p>
    </div>
  ),
};

export const Vertical = {
  render: () => (
    <div className="ig-flex ig-items-center ig-gap-2 ig-p-4">
      <span>Home</span>
      <Divider vertical />
      <span>Products</span>
      <Divider vertical />
      <span>About</span>
      <Divider vertical />
      <span>Contact</span>
    </div>
  ),
};

export const WithText = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-6 ig-p-4 ig-max-w-md">
      <Divider>OR</Divider>
      <Divider>Continue with</Divider>
      <Divider>Section Title</Divider>
    </div>
  ),
};

export const InForm = {
  render: () => (
    <div className="ig-p-4 ig-max-w-md">
      <h3 className="ig-text-lg ig-fw-semibold ig-mb-4">Sign Up</h3>
      <div className="ig-flex ig-flex-col ig-gap-3">
        <input className="ig-input" placeholder="Email" />
        <input className="ig-input" type="password" placeholder="Password" />
        <button className="ig-btn ig-btn-primary ig-btn-block">Sign Up</button>
      </div>
      <Divider>or continue with</Divider>
      <div className="ig-flex ig-gap-3">
        <button className="ig-btn ig-btn-outline ig-flex-1">Google</button>
        <button className="ig-btn ig-btn-outline ig-flex-1">GitHub</button>
      </div>
    </div>
  ),
};
