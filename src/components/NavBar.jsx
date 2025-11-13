import { useState } from 'react';

// Fixed navigation bar with smooth-scroll links and scrollspy highlighting
export function NavBar({ sections, activeSection, onNavigate, brand }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleLinkClick = (id) => {
    setIsOpen(false);
    onNavigate(id);
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark fixed-top py-3">
      <div className="container">
        <a className="navbar-brand fw-bold text-uppercase letter-spacing" href="#hero">
          {brand}
        </a>
        <button
          className="navbar-toggler focus-visible-only"
          type="button"
          aria-label="Abrir navegación"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <span className="navbar-toggler-icon" />
        </button>
        <div className={`collapse navbar-collapse ${isOpen ? 'show' : ''}`}>
          <ul className="navbar-nav ms-auto gap-lg-3 align-items-lg-center mt-3 mt-lg-0">
            {sections.map((section) => (
              <li className="nav-item" key={section.id}>
                <button
                  className={`nav-link btn btn-link px-0 ${activeSection === section.id ? 'active nav-highlight' : ''}`}
                  type="button"
                  onClick={() => handleLinkClick(section.id)}
                >
                  {section.label}
                </button>
              </li>
            ))}
            <li className="nav-item d-none d-lg-block">
              <a
                className="btn btn-sm btn-outline-brand"
                href="#contacto"
                onClick={() => handleLinkClick('contacto')}
              >
                Hablemos
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
