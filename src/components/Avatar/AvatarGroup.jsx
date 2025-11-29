import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const AvatarGroup = forwardRef(function AvatarGroup(
  { className = '', children, ...props },
  ref
) {
  return (
    <div ref={ref} className={`ig-avatar-group ${className}`.trim()} {...props}>
      {children}
    </div>
  );
});

AvatarGroup.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};
