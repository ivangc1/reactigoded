import { forwardRef, useState } from 'react';
import PropTypes from 'prop-types';

export const Rating = forwardRef(function Rating(
  {
    value = 0,
    max = 5,
    readonly = false,
    size,
    onChange,
    className = '',
    ...props
  },
  ref
) {
  const [hoverValue, setHoverValue] = useState(null);

  const classes = [
    'ig-rating',
    readonly && 'ig-rating-readonly',
    size && `ig-rating-${size}`,
    className
  ].filter(Boolean).join(' ');

  const handleClick = (starValue) => {
    if (!readonly && onChange) {
      onChange(starValue);
    }
  };

  const displayValue = hoverValue !== null ? hoverValue : value;

  return (
    <div
      ref={ref}
      className={classes}
      onMouseLeave={() => !readonly && setHoverValue(null)}
      {...props}
    >
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const filled = starValue <= displayValue;

        return (
          <span
            key={i}
            className={`ig-star ${filled ? 'ig-star-filled' : ''}`}
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => !readonly && setHoverValue(starValue)}
          >
            ★
          </span>
        );
      })}
    </div>
  );
});

Rating.propTypes = {
  value: PropTypes.number,
  max: PropTypes.number,
  readonly: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'lg', 'xl']),
  onChange: PropTypes.func,
  className: PropTypes.string,
};
