import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Divider = forwardRef(function Divider(
  {
    vertical = false,
    dashed = false,
    children,
    className = '',
    ...props
  },
  ref
) {
  if (children) {
    return (
      <div
        ref={ref}
        className={`ig-divider-with-text ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }

  const classes = [
    vertical ? 'ig-divider-vertical' : 'ig-divider',
    dashed && 'ig-divider-dashed',
    className
  ].filter(Boolean).join(' ');

  return vertical ? (
    <span ref={ref} className={classes} {...props} />
  ) : (
    <hr ref={ref} className={classes} {...props} />
  );
});

Divider.propTypes = {
  vertical: PropTypes.bool,
  dashed: PropTypes.bool,
  children: PropTypes.node,
  className: PropTypes.string,
};
