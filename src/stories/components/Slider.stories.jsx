import { useState } from 'react';
import { Slider } from '../../components/Slider';

export default {
  title: 'Components/Slider',
  component: Slider,
};

export const Basic = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-6 ig-p-4 ig-max-w-md">
      <Slider defaultValue={50} />
      <Slider defaultValue={25} />
      <Slider defaultValue={75} />
    </div>
  ),
};

export const WithValue = {
  render: function SliderWithValue() {
    const [value, setValue] = useState(50);
    return (
      <div className="ig-p-4 ig-max-w-md">
        <div className="ig-flex ig-justify-between ig-text-sm ig-mb-2">
          <span>Volume</span>
          <span>{value}%</span>
        </div>
        <Slider value={value} onChange={setValue} />
      </div>
    );
  },
};

export const MinMax = {
  render: function MinMaxSlider() {
    const [value, setValue] = useState(500);
    return (
      <div className="ig-p-4 ig-max-w-md">
        <div className="ig-flex ig-justify-between ig-text-sm ig-mb-2">
          <span>Price Range</span>
          <span>${value}</span>
        </div>
        <Slider min={0} max={1000} step={50} value={value} onChange={setValue} />
        <div className="ig-flex ig-justify-between ig-text-xs ig-text-muted ig-mt-1">
          <span>$0</span>
          <span>$1000</span>
        </div>
      </div>
    );
  },
};

export const Steps = {
  render: function SteppedSlider() {
    const [value, setValue] = useState(50);
    return (
      <div className="ig-p-4 ig-max-w-md">
        <div className="ig-flex ig-justify-between ig-text-sm ig-mb-2">
          <span>Quantity</span>
          <span>{value}</span>
        </div>
        <Slider min={0} max={100} step={10} value={value} onChange={setValue} />
      </div>
    );
  },
};

export const MultipleSiders = {
  render: function MultipleSliders() {
    const [red, setRed] = useState(128);
    const [green, setGreen] = useState(64);
    const [blue, setBlue] = useState(200);

    return (
      <div className="ig-p-4 ig-max-w-md">
        <div
          className="ig-rounded-lg ig-mb-4"
          style={{
            height: '100px',
            backgroundColor: `rgb(${red}, ${green}, ${blue})`
          }}
        />
        <div className="ig-flex ig-flex-col ig-gap-4">
          <div>
            <div className="ig-flex ig-justify-between ig-text-sm ig-mb-1">
              <span style={{ color: 'red' }}>Red</span>
              <span>{red}</span>
            </div>
            <Slider min={0} max={255} value={red} onChange={setRed} />
          </div>
          <div>
            <div className="ig-flex ig-justify-between ig-text-sm ig-mb-1">
              <span style={{ color: 'green' }}>Green</span>
              <span>{green}</span>
            </div>
            <Slider min={0} max={255} value={green} onChange={setGreen} />
          </div>
          <div>
            <div className="ig-flex ig-justify-between ig-text-sm ig-mb-1">
              <span style={{ color: 'blue' }}>Blue</span>
              <span>{blue}</span>
            </div>
            <Slider min={0} max={255} value={blue} onChange={setBlue} />
          </div>
        </div>
      </div>
    );
  },
};
