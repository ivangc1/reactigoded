import { forwardRef, useState, createContext, useContext } from 'react';
import PropTypes from 'prop-types';

const AccordionContext = createContext();

export const Accordion = forwardRef(function Accordion(
  {
    type = 'single',
    defaultValue,
    value,
    onChange,
    className = '',
    children,
    ...props
  },
  ref
) {
  const [internalValue, setInternalValue] = useState(
    type === 'multiple' ? (defaultValue || []) : defaultValue
  );
  const activeValue = value !== undefined ? value : internalValue;

  const handleChange = (itemValue) => {
    let newValue;
    if (type === 'multiple') {
      const currentArray = Array.isArray(activeValue) ? activeValue : [];
      newValue = currentArray.includes(itemValue)
        ? currentArray.filter(v => v !== itemValue)
        : [...currentArray, itemValue];
    } else {
      newValue = activeValue === itemValue ? null : itemValue;
    }

    if (value === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  const isOpen = (itemValue) => {
    if (type === 'multiple') {
      return Array.isArray(activeValue) && activeValue.includes(itemValue);
    }
    return activeValue === itemValue;
  };

  return (
    <AccordionContext.Provider value={{ handleChange, isOpen }}>
      <div ref={ref} className={`ig-accordion ${className}`.trim()} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
});

Accordion.propTypes = {
  type: PropTypes.oneOf(['single', 'multiple']),
  defaultValue: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
  onChange: PropTypes.func,
  className: PropTypes.string,
  children: PropTypes.node,
};

export const AccordionItem = forwardRef(function AccordionItem(
  {
    value,
    className = '',
    children,
    ...props
  },
  ref
) {
  const { isOpen } = useContext(AccordionContext);
  const open = isOpen(value);

  const classes = [
    'ig-accordion-item',
    open && 'ig-accordion-item-open',
    className
  ].filter(Boolean).join(' ');

  return (
    <div ref={ref} className={classes} data-value={value} {...props}>
      {children}
    </div>
  );
});

AccordionItem.propTypes = {
  value: PropTypes.string.isRequired,
  className: PropTypes.string,
  children: PropTypes.node,
};

export const AccordionHeader = forwardRef(function AccordionHeader(
  {
    value,
    className = '',
    children,
    ...props
  },
  ref
) {
  const { handleChange } = useContext(AccordionContext);

  return (
    <button
      ref={ref}
      type="button"
      className={`ig-accordion-header ${className}`.trim()}
      onClick={() => handleChange(value)}
      {...props}
    >
      <span>{children}</span>
      <span className="ig-accordion-icon">&#9660;</span>
    </button>
  );
});

AccordionHeader.propTypes = {
  value: PropTypes.string.isRequired,
  className: PropTypes.string,
  children: PropTypes.node,
};

export const AccordionContent = forwardRef(function AccordionContent(
  { className = '', children, ...props },
  ref
) {
  return (
    <div ref={ref} className={`ig-accordion-content ${className}`.trim()} {...props}>
      {children}
    </div>
  );
});

AccordionContent.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};
