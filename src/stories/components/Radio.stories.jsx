import { useState } from 'react';
import { Radio } from '../../components/Radio';

export default {
  title: 'Components/Radio',
  component: Radio,
};

export const Basic = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-3 ig-p-4">
      <Radio name="plan" defaultChecked>Free Plan</Radio>
      <Radio name="plan">Pro Plan</Radio>
      <Radio name="plan">Enterprise Plan</Radio>
    </div>
  ),
};

export const States = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-3 ig-p-4">
      <Radio name="state">Unselected</Radio>
      <Radio name="state" defaultChecked>Selected</Radio>
      <Radio name="disabled" disabled>Disabled</Radio>
      <Radio name="disabled-checked" disabled defaultChecked>Disabled selected</Radio>
    </div>
  ),
};

export const Controlled = {
  render: function ControlledRadio() {
    const [selected, setSelected] = useState('option1');
    return (
      <div className="ig-flex ig-flex-col ig-gap-3 ig-p-4">
        <p className="ig-text-sm ig-text-muted">Selected: {selected}</p>
        <Radio
          name="controlled"
          checked={selected === 'option1'}
          onChange={() => setSelected('option1')}
        >
          Option 1
        </Radio>
        <Radio
          name="controlled"
          checked={selected === 'option2'}
          onChange={() => setSelected('option2')}
        >
          Option 2
        </Radio>
        <Radio
          name="controlled"
          checked={selected === 'option3'}
          onChange={() => setSelected('option3')}
        >
          Option 3
        </Radio>
      </div>
    );
  },
};

export const RadioGroup = {
  render: () => (
    <div className="ig-p-4">
      <p className="ig-text-sm ig-fw-medium ig-mb-3">Payment Method:</p>
      <div className="ig-flex ig-flex-col ig-gap-2">
        <Radio name="payment" defaultChecked>Credit Card</Radio>
        <Radio name="payment">PayPal</Radio>
        <Radio name="payment">Bank Transfer</Radio>
        <Radio name="payment">Cryptocurrency</Radio>
      </div>
    </div>
  ),
};
