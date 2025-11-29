import { useState } from 'react';
import { Checkbox } from '../../components/Checkbox';

export default {
  title: 'Components/Checkbox',
  component: Checkbox,
};

export const Basic = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4">
      <Checkbox>Accept terms and conditions</Checkbox>
      <Checkbox defaultChecked>Subscribe to newsletter</Checkbox>
      <Checkbox>Remember me</Checkbox>
    </div>
  ),
};

export const States = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4">
      <Checkbox>Unchecked</Checkbox>
      <Checkbox defaultChecked>Checked</Checkbox>
      <Checkbox disabled>Disabled unchecked</Checkbox>
      <Checkbox disabled defaultChecked>Disabled checked</Checkbox>
    </div>
  ),
};

export const Controlled = {
  render: function ControlledCheckbox() {
    const [checked, setChecked] = useState(false);
    return (
      <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4">
        <Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)}>
          Controlled checkbox: {checked ? 'Checked' : 'Unchecked'}
        </Checkbox>
      </div>
    );
  },
};

export const CheckboxGroup = {
  render: () => (
    <div className="ig-p-4">
      <p className="ig-text-sm ig-fw-medium ig-mb-3">Select your interests:</p>
      <div className="ig-flex ig-flex-col ig-gap-2">
        <Checkbox>Technology</Checkbox>
        <Checkbox defaultChecked>Design</Checkbox>
        <Checkbox>Business</Checkbox>
        <Checkbox>Marketing</Checkbox>
        <Checkbox>Development</Checkbox>
      </div>
    </div>
  ),
};
