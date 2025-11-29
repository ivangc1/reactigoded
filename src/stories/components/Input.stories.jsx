import { Input, Label, Helper, Error, InputGroup, InputAddon } from '../../components/Input';

export default {
  title: 'Components/Input',
  component: Input,
};

export const Basic = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4 ig-max-w-md">
      <div>
        <Label>Username</Label>
        <Input placeholder="Enter your username" />
      </div>
      <div>
        <Label>Email</Label>
        <Input type="email" placeholder="you@example.com" />
        <Helper>We will never share your email.</Helper>
      </div>
      <div>
        <Label>Password</Label>
        <Input type="password" placeholder="Enter password" />
      </div>
    </div>
  ),
};

export const Sizes = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4 ig-max-w-md">
      <div>
        <Label>Small</Label>
        <Input size="sm" placeholder="Small input" />
      </div>
      <div>
        <Label>Default</Label>
        <Input placeholder="Default input" />
      </div>
      <div>
        <Label>Large</Label>
        <Input size="lg" placeholder="Large input" />
      </div>
    </div>
  ),
};

export const States = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4 ig-max-w-md">
      <div>
        <Label>Normal</Label>
        <Input placeholder="Normal input" />
      </div>
      <div>
        <Label>Disabled</Label>
        <Input placeholder="Disabled input" disabled />
      </div>
      <div>
        <Label>Error</Label>
        <Input error placeholder="Error state" />
        <Error>This field is required.</Error>
      </div>
      <div>
        <Label>Success</Label>
        <Input success placeholder="Success state" defaultValue="Valid input" />
        <Helper style={{ color: 'var(--ig-success)' }}>Looks good!</Helper>
      </div>
    </div>
  ),
};

export const WithLabels = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4 ig-max-w-md">
      <div>
        <Label>Regular Label</Label>
        <Input placeholder="Regular field" />
      </div>
      <div>
        <Label required>Required Field</Label>
        <Input placeholder="This field is required" />
      </div>
    </div>
  ),
};

export const InputGroups = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4 ig-max-w-md">
      <div>
        <Label>Website</Label>
        <InputGroup>
          <InputAddon>https://</InputAddon>
          <Input placeholder="example.com" />
        </InputGroup>
      </div>
      <div>
        <Label>Email</Label>
        <InputGroup>
          <Input placeholder="username" />
          <InputAddon>@gmail.com</InputAddon>
        </InputGroup>
      </div>
      <div>
        <Label>Price</Label>
        <InputGroup>
          <InputAddon>$</InputAddon>
          <Input type="number" placeholder="0.00" />
          <InputAddon>USD</InputAddon>
        </InputGroup>
      </div>
    </div>
  ),
};
