import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Chip = forwardRef(function Chip(
  {
    variant,
    size,
    selectable = false,
    selected = false,
    onRemove,
    className = '',
    children,
    ...props
  },
  ref
) {
  const Tag = selectable ? 'button' : 'span';

  const classes = [
    'ig-chip',
    variant && `ig-chip-${variant}`,
    size && `ig-chip-${size}`,
    selectable && 'ig-chip-selectable',
    selected && 'ig-chip-selected',
    className
  ].filter(Boolean).join(' ');

  return (
    <Tag ref={ref} type={selectable ? 'button' : undefined} className={classes} {...props}>
      {children}
      {onRemove && (
        <button
          type="button"
          className="ig-chip-close"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Remove"
        >
          &times;
        </button>
      )}
    </Tag>
  );
});

Chip.propTypes = {
  variant: PropTypes.oneOf(['primary', 'success', 'warning', 'danger']),
  size: PropTypes.oneOf(['sm', 'lg']),
  selectable: PropTypes.bool,
  selected: PropTypes.bool,
  onRemove: PropTypes.func,
  className: PropTypes.string,
  children: PropTypes.node,
};
