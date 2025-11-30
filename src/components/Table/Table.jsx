import { forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Table = forwardRef(function Table(
  {
    striped = false,
    hover = false,
    bordered = false,
    compact = false,
    className = '',
    children,
    ...props
  },
  ref
) {
  const classes = [
    'ig-table',
    striped && 'ig-table-striped',
    hover && 'ig-table-hover',
    bordered && 'ig-table-bordered',
    compact && 'ig-table-compact',
    className
  ].filter(Boolean).join(' ');

  return (
    <table ref={ref} className={classes} {...props}>
      {children}
    </table>
  );
});

Table.propTypes = {
  striped: PropTypes.bool,
  hover: PropTypes.bool,
  bordered: PropTypes.bool,
  compact: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};
