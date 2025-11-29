import { Spinner } from '../../components/Spinner';

export default {
  title: 'Components/Spinner',
  component: Spinner,
};

export const Sizes = {
  render: () => (
    <div className="ig-flex ig-items-center ig-gap-6 ig-p-4">
      <div className="ig-flex ig-flex-col ig-items-center ig-gap-2">
        <Spinner size="sm" />
        <span className="ig-text-xs ig-text-muted">Small</span>
      </div>
      <div className="ig-flex ig-flex-col ig-items-center ig-gap-2">
        <Spinner />
        <span className="ig-text-xs ig-text-muted">Default</span>
      </div>
      <div className="ig-flex ig-flex-col ig-items-center ig-gap-2">
        <Spinner size="lg" />
        <span className="ig-text-xs ig-text-muted">Large</span>
      </div>
      <div className="ig-flex ig-flex-col ig-items-center ig-gap-2">
        <Spinner size="xl" />
        <span className="ig-text-xs ig-text-muted">XL</span>
      </div>
    </div>
  ),
};

export const WithText = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4">
      <div className="ig-flex ig-items-center ig-gap-3">
        <Spinner size="sm" />
        <span>Loading...</span>
      </div>
      <div className="ig-flex ig-items-center ig-gap-3">
        <Spinner />
        <span>Processing your request...</span>
      </div>
    </div>
  ),
};

export const InContext = {
  render: () => (
    <div className="ig-p-4">
      <div className="ig-card ig-p-8 ig-flex ig-flex-col ig-items-center ig-gap-4" style={{ maxWidth: '300px' }}>
        <Spinner size="lg" />
        <p className="ig-text-muted">Loading content...</p>
      </div>
    </div>
  ),
};
