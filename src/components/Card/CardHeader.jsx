import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const CardHeader = forwardRef(function CardHeader(
  { className = '', children, ...props },
  ref
) {
  return (
    <div ref={ref} className={`ig-card-header ${className}`.trim()} {...props}>
      {children}
    </div>
  );
});

CardHeader.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};
