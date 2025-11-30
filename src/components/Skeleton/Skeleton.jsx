import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Skeleton = forwardRef(function Skeleton(
  {
    variant = 'text',
    className = '',
    style,
    ...props
  },
  ref
) {
  const classes = [
    'ig-skeleton',
    `ig-skeleton-${variant}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div ref={ref} className={classes} style={style} {...props} />
  );
});

Skeleton.propTypes = {
  variant: PropTypes.oneOf(['text', 'title', 'avatar', 'avatar-lg', 'card', 'image', 'button']),
  className: PropTypes.string,
  style: PropTypes.object,
};
