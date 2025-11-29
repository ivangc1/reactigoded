import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Stepper = forwardRef(function Stepper(
  { labeled = false, className = '', children, ...props },
  ref
) {
  const classes = [
    labeled ? 'ig-stepper-labeled' : 'ig-stepper',
    className
  ].filter(Boolean).join(' ');

  return (
    <div ref={ref} className={classes} {...props}>
      {children}
    </div>
  );
});

Stepper.propTypes = {
  labeled: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};

export const Step = forwardRef(function Step(
  {
    active = false,
    complete = false,
    className = '',
    children,
    ...props
  },
  ref
) {
  const classes = [
    'ig-step',
    active && 'ig-step-active',
    complete && 'ig-step-complete',
    className
  ].filter(Boolean).join(' ');

  return (
    <div ref={ref} className={classes} {...props}>
      {children}
    </div>
  );
});

Step.propTypes = {
  active: PropTypes.bool,
  complete: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};

export const StepLine = forwardRef(function StepLine(
  { complete = false, className = '', ...props },
  ref
) {
  const classes = [
    'ig-step-line',
    complete && 'ig-step-line-complete',
    className
  ].filter(Boolean).join(' ');

  return <div ref={ref} className={classes} {...props} />;
});

StepLine.propTypes = {
  complete: PropTypes.bool,
  className: PropTypes.string,
};

export const StepItem = forwardRef(function StepItem(
  {
    active = false,
    complete = false,
    className = '',
    children,
    ...props
  },
  ref
) {
  const classes = [
    'ig-step-item',
    active && 'ig-step-active',
    complete && 'ig-step-complete',
    className
  ].filter(Boolean).join(' ');

  return (
    <div ref={ref} className={classes} {...props}>
      {children}
    </div>
  );
});

StepItem.propTypes = {
  active: PropTypes.bool,
  complete: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};

export const StepLabel = forwardRef(function StepLabel(
  { className = '', children, ...props },
  ref
) {
  return (
    <span ref={ref} className={`ig-step-label ${className}`.trim()} {...props}>
      {children}
    </span>
  );
});

StepLabel.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};
