import { useState, useEffect } from 'react';
import { Progress } from '../../components/Progress';

export default {
  title: 'Components/Progress',
  component: Progress,
};

export const Basic = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-6 ig-p-4 ig-max-w-md">
      <Progress value={25} />
      <Progress value={50} />
      <Progress value={75} />
      <Progress value={100} />
    </div>
  ),
};

export const Variants = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-6 ig-p-4 ig-max-w-md">
      <div>
        <p className="ig-text-sm ig-mb-2">Default</p>
        <Progress value={60} />
      </div>
      <div>
        <p className="ig-text-sm ig-mb-2">Primary</p>
        <Progress value={60} variant="primary" />
      </div>
      <div>
        <p className="ig-text-sm ig-mb-2">Accent</p>
        <Progress value={60} variant="accent" />
      </div>
      <div>
        <p className="ig-text-sm ig-mb-2">Success</p>
        <Progress value={60} variant="success" />
      </div>
      <div>
        <p className="ig-text-sm ig-mb-2">Warning</p>
        <Progress value={60} variant="warning" />
      </div>
      <div>
        <p className="ig-text-sm ig-mb-2">Danger</p>
        <Progress value={60} variant="danger" />
      </div>
    </div>
  ),
};

export const Sizes = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-6 ig-p-4 ig-max-w-md">
      <div>
        <p className="ig-text-sm ig-mb-2">Small</p>
        <Progress value={60} size="sm" />
      </div>
      <div>
        <p className="ig-text-sm ig-mb-2">Default</p>
        <Progress value={60} />
      </div>
      <div>
        <p className="ig-text-sm ig-mb-2">Large</p>
        <Progress value={60} size="lg" />
      </div>
    </div>
  ),
};

export const Indeterminate = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-6 ig-p-4 ig-max-w-md">
      <div>
        <p className="ig-text-sm ig-mb-2">Indeterminate Progress</p>
        <Progress indeterminate />
      </div>
      <div>
        <p className="ig-text-sm ig-mb-2">Indeterminate Accent</p>
        <Progress indeterminate variant="accent" />
      </div>
    </div>
  ),
};

export const Animated = {
  render: function AnimatedProgress() {
    const [value, setValue] = useState(0);

    useEffect(() => {
      const interval = setInterval(() => {
        setValue(v => (v >= 100 ? 0 : v + 10));
      }, 500);
      return () => clearInterval(interval);
    }, []);

    return (
      <div className="ig-p-4 ig-max-w-md">
        <p className="ig-text-sm ig-mb-2">Progress: {value}%</p>
        <Progress value={value} variant="accent" />
      </div>
    );
  },
};

export const WithLabel = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4 ig-max-w-md">
      <div>
        <div className="ig-flex ig-justify-between ig-text-sm ig-mb-1">
          <span>Storage</span>
          <span>7.5 GB / 10 GB</span>
        </div>
        <Progress value={75} variant="warning" />
      </div>
      <div>
        <div className="ig-flex ig-justify-between ig-text-sm ig-mb-1">
          <span>Upload Progress</span>
          <span>45%</span>
        </div>
        <Progress value={45} variant="accent" />
      </div>
    </div>
  ),
};
