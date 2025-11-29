import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const CardFooter = forwardRef(function CardFooter(
  { className = '', children, ...props },
  ref
) {
  return (
    <div ref={ref} className={`ig-card-footer ${className}`.trim()} {...props}>
      {children}
    </div>
  );
});

CardFooter.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};
