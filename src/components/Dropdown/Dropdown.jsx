import { forwardRef, useState } from 'react';
import PropTypes from 'prop-types';

export const Dropdown = forwardRef(function Dropdown(
  {
    align = 'left',
    direction = 'down',
    className = '',
    children,
    ...props
  },
  ref
) {
  const [open, setOpen] = useState(false);

  const classes = [
    'ig-dropdown',
    align === 'right' && 'ig-dropdown-right',
    direction === 'up' && 'ig-dropdown-up',
    open && 'open',
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={ref}
      className={classes}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setOpen(false);
        }
      }}
      {...props}
    >
      {typeof children === 'function' ? children({ open, setOpen }) : children}
    </div>
  );
});

Dropdown.propTypes = {
  align: PropTypes.oneOf(['left', 'right']),
  direction: PropTypes.oneOf(['down', 'up']),
  className: PropTypes.string,
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
};

export const DropdownTrigger = forwardRef(function DropdownTrigger(
  { className = '', children, onClick, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`ig-dropdown-trigger ${className}`.trim()}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
});

DropdownTrigger.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
  onClick: PropTypes.func,
};

export const DropdownMenu = forwardRef(function DropdownMenu(
  { className = '', children, ...props },
  ref
) {
  return (
    <div ref={ref} className={`ig-dropdown-menu ${className}`.trim()} {...props}>
      {children}
    </div>
  );
});

DropdownMenu.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

export const DropdownItem = forwardRef(function DropdownItem(
  {
    active = false,
    danger = false,
    className = '',
    children,
    ...props
  },
  ref
) {
  const classes = [
    'ig-dropdown-item',
    active && 'ig-dropdown-item-active',
    danger && 'ig-dropdown-item-danger',
    className
  ].filter(Boolean).join(' ');

  return (
    <button ref={ref} type="button" className={classes} {...props}>
      {children}
    </button>
  );
});

DropdownItem.propTypes = {
  active: PropTypes.bool,
  danger: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};

export const DropdownDivider = forwardRef(function DropdownDivider(
  { className = '', ...props },
  ref
) {
  return (
    <div ref={ref} className={`ig-dropdown-divider ${className}`.trim()} {...props} />
  );
});

DropdownDivider.propTypes = {
  className: PropTypes.string,
};

export const DropdownHeader = forwardRef(function DropdownHeader(
  { className = '', children, ...props },
  ref
) {
  return (
    <div ref={ref} className={`ig-dropdown-header ${className}`.trim()} {...props}>
      {children}
    </div>
  );
});

DropdownHeader.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};
