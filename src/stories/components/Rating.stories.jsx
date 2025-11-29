import { useState } from 'react';
import { Rating } from '../../components/Rating';

export default {
  title: 'Components/Rating',
  component: Rating,
};

export const Basic = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4">
      <Rating value={0} readonly />
      <Rating value={1} readonly />
      <Rating value={2} readonly />
      <Rating value={3} readonly />
      <Rating value={4} readonly />
      <Rating value={5} readonly />
    </div>
  ),
};

export const Interactive = {
  render: function InteractiveRating() {
    const [value, setValue] = useState(3);
    return (
      <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4">
        <Rating value={value} onChange={setValue} />
        <p className="ig-text-sm ig-text-muted">Selected: {value} stars</p>
      </div>
    );
  },
};

export const Sizes = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4">
      <div>
        <p className="ig-text-sm ig-text-muted ig-mb-2">Small</p>
        <Rating value={4} size="sm" readonly />
      </div>
      <div>
        <p className="ig-text-sm ig-text-muted ig-mb-2">Default</p>
        <Rating value={4} readonly />
      </div>
      <div>
        <p className="ig-text-sm ig-text-muted ig-mb-2">Large</p>
        <Rating value={4} size="lg" readonly />
      </div>
      <div>
        <p className="ig-text-sm ig-text-muted ig-mb-2">XL</p>
        <Rating value={4} size="xl" readonly />
      </div>
    </div>
  ),
};

export const ReadOnly = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4">
      <div className="ig-flex ig-items-center ig-gap-3">
        <Rating value={5} readonly />
        <span className="ig-text-sm">(128 reviews)</span>
      </div>
      <div className="ig-flex ig-items-center ig-gap-3">
        <Rating value={4} readonly />
        <span className="ig-text-sm">(85 reviews)</span>
      </div>
      <div className="ig-flex ig-items-center ig-gap-3">
        <Rating value={3} readonly />
        <span className="ig-text-sm">(42 reviews)</span>
      </div>
    </div>
  ),
};

export const CustomMax = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4">
      <div>
        <p className="ig-text-sm ig-text-muted ig-mb-2">3 stars max</p>
        <Rating value={2} max={3} readonly />
      </div>
      <div>
        <p className="ig-text-sm ig-text-muted ig-mb-2">10 stars max</p>
        <Rating value={7} max={10} readonly />
      </div>
    </div>
  ),
};

export const ProductReview = {
  render: function ProductReview() {
    const [rating, setRating] = useState(0);
    return (
      <div className="ig-p-4 ig-max-w-md">
        <div className="ig-card ig-p-4">
          <h4 className="ig-fw-semibold ig-mb-2">Leave a Review</h4>
          <p className="ig-text-sm ig-text-muted ig-mb-4">How would you rate this product?</p>
          <Rating value={rating} onChange={setRating} size="lg" />
          {rating > 0 && (
            <p className="ig-text-sm ig-mt-3">
              You rated this product {rating} out of 5 stars.
            </p>
          )}
        </div>
      </div>
    );
  },
};
