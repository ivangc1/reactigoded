import { useState, useEffect, forwardRef } from 'react';
import PropTypes from 'prop-types';

export const ThemeSwitch = forwardRef(function ThemeSwitch(
  { className = '', ...props },
  ref
) {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <label ref={ref} className={`ig-switch ${className}`.trim()} {...props}>
      <input
        type="checkbox"
        checked={theme === 'dark'}
        onChange={toggleTheme}
      />
      <span className="ig-switch-track"></span>
      <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
    </label>
  );
});

ThemeSwitch.propTypes = {
  className: PropTypes.string,
};
