import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const CardBody = forwardRef(function CardBody(
  { className = '', children, ...props },
  ref
) {
  return (
    <div ref={ref} className={`ig-card-body ${className}`.trim()} {...props}>
      {children}
    </div>
  );
});

CardBody.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};
