import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Avatar = forwardRef(function Avatar(
  {
    src,
    alt = '',
    size,
    rounded = false,
    status,
    initials,
    className = '',
    ...props
  },
  ref
) {
  const classes = [
    'ig-avatar',
    size && `ig-avatar-${size}`,
    rounded && 'ig-avatar-rounded',
    className
  ].filter(Boolean).join(' ');

  return (
    <div ref={ref} className={classes} {...props}>
      {src ? (
        <img src={src} alt={alt} />
      ) : (
        initials
      )}
      {status && (
        <span className={`ig-avatar-status ig-avatar-status-${status}`} />
      )}
    </div>
  );
});

Avatar.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl', '2xl']),
  rounded: PropTypes.bool,
  status: PropTypes.oneOf(['online', 'offline', 'busy', 'away']),
  initials: PropTypes.string,
  className: PropTypes.string,
};
