import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Tooltip = forwardRef(function Tooltip(
  {
    content,
    position = 'top',
    className = '',
    children,
    ...props
  },
  ref
) {
  const classes = [
    'ig-tooltip',
    position !== 'top' && `ig-tooltip-${position}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <span
      ref={ref}
      className={classes}
      data-tooltip={content}
      {...props}
    >
      {children}
    </span>
  );
});

Tooltip.propTypes = {
  content: PropTypes.string.isRequired,
  position: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};
