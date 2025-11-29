import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Timeline = forwardRef(function Timeline(
  { className = '', children, ...props },
  ref
) {
  return (
    <div ref={ref} className={`ig-timeline ${className}`.trim()} {...props}>
      {children}
    </div>
  );
});

Timeline.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

export const TimelineItem = forwardRef(function TimelineItem(
  {
    date,
    title,
    description,
    dotVariant,
    className = '',
    children,
    ...props
  },
  ref
) {
  const dotClasses = [
    'ig-timeline-dot',
    dotVariant && `ig-timeline-dot-${dotVariant}`
  ].filter(Boolean).join(' ');

  return (
    <div ref={ref} className={`ig-timeline-item ${className}`.trim()} {...props}>
      <div className={dotClasses} />
      <div className="ig-timeline-content">
        {date && <div className="ig-timeline-date">{date}</div>}
        {title && <div className="ig-timeline-title">{title}</div>}
        {description && <div className="ig-timeline-description">{description}</div>}
        {children}
      </div>
    </div>
  );
});

TimelineItem.propTypes = {
  date: PropTypes.node,
  title: PropTypes.node,
  description: PropTypes.node,
  dotVariant: PropTypes.oneOf(['success', 'warning', 'danger']),
  className: PropTypes.string,
  children: PropTypes.node,
};
