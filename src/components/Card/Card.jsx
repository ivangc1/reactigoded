import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Card = forwardRef(function Card(
  {
    variant,
    interactive = false,
    className = '',
    children,
    ...props
  },
  ref
) {
  const classes = [
    'ig-card',
    variant && `ig-card-${variant}`,
    interactive && 'ig-card-interactive',
    className
  ].filter(Boolean).join(' ');

  return (
    <div ref={ref} className={classes} {...props}>
      {children}
    </div>
  );
});

Card.propTypes = {
  variant: PropTypes.oneOf(['bordered', 'elevated', 'glass', 'brand', 'secondary', 'success', 'warning', 'danger', 'info']),
  interactive: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};
