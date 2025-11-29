import { forwardRef, useState, createContext, useContext } from 'react';
import PropTypes from 'prop-types';

const TabsContext = createContext();

export const Tabs = forwardRef(function Tabs(
  {
    defaultValue,
    value,
    onChange,
    variant,
    vertical = false,
    className = '',
    children,
    ...props
  },
  ref
) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeValue = value !== undefined ? value : internalValue;

  const handleChange = (newValue) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  const classes = [
    'ig-tabs',
    variant && `ig-tabs-${variant}`,
    vertical && 'ig-tabs-vertical',
    className
  ].filter(Boolean).join(' ');

  return (
    <TabsContext.Provider value={{ activeValue, handleChange }}>
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
});

Tabs.propTypes = {
  defaultValue: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  variant: PropTypes.oneOf(['bordered', 'pills']),
  vertical: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};

export const TabsList = forwardRef(function TabsList(
  { className = '', children, ...props },
  ref
) {
  return (
    <div ref={ref} className={`ig-tabs-list ${className}`.trim()} role="tablist" {...props}>
      {children}
    </div>
  );
});

TabsList.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

export const Tab = forwardRef(function Tab(
  {
    value,
    disabled = false,
    className = '',
    children,
    ...props
  },
  ref
) {
  const { activeValue, handleChange } = useContext(TabsContext);
  const isActive = activeValue === value;

  const classes = [
    'ig-tab',
    isActive && 'ig-tab-active',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      className={classes}
      onClick={() => handleChange(value)}
      {...props}
    >
      {children}
    </button>
  );
});

Tab.propTypes = {
  value: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};

export const TabsContent = forwardRef(function TabsContent(
  { className = '', children, ...props },
  ref
) {
  return (
    <div ref={ref} className={`ig-tabs-content ${className}`.trim()} {...props}>
      {children}
    </div>
  );
});

TabsContent.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

export const TabPanel = forwardRef(function TabPanel(
  {
    value,
    className = '',
    children,
    ...props
  },
  ref
) {
  const { activeValue } = useContext(TabsContext);
  const isActive = activeValue === value;

  const classes = [
    'ig-tab-panel',
    isActive && 'ig-tab-panel-active',
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={ref}
      role="tabpanel"
      hidden={!isActive}
      className={classes}
      {...props}
    >
      {children}
    </div>
  );
});

TabPanel.propTypes = {
  value: PropTypes.string.isRequired,
  className: PropTypes.string,
  children: PropTypes.node,
};
