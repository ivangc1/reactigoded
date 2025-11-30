import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Slider = forwardRef(function Slider(
  {
    min = 0,
    max = 100,
    step = 1,
    value,
    defaultValue,
    showValue = false,
    className = '',
    onChange,
    ...props
  },
  ref
) {
  const handleChange = (e) => {
    onChange?.(Number(e.target.value), e);
  };

  if (showValue) {
    return (
      <div className="ig-slider-group">
        <input
          ref={ref}
          type="range"
          className={`ig-slider ${className}`.trim()}
          min={min}
          max={max}
          step={step}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          {...props}
        />
        <span className="ig-slider-value">{value ?? defaultValue ?? min}</span>
      </div>
    );
  }

  return (
    <input
      ref={ref}
      type="range"
      className={`ig-slider ${className}`.trim()}
      min={min}
      max={max}
      step={step}
      value={value}
      defaultValue={defaultValue}
      onChange={handleChange}
      {...props}
    />
  );
});

Slider.propTypes = {
  min: PropTypes.number,
  max: PropTypes.number,
  step: PropTypes.number,
  value: PropTypes.number,
  defaultValue: PropTypes.number,
  showValue: PropTypes.bool,
  className: PropTypes.string,
  onChange: PropTypes.func,
};
