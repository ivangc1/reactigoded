import { ThemeBadge } from './ThemeBadge';

// Hero section with primary headline, CTA and quick stats
export function Hero({ profile }) {
  return (
    <header id="presentacion" className="py-5 position-relative">
      <span id="hero" className="section-anchor" aria-hidden="true" />
      <div className="container position-relative">
        <div className="row align-items-center g-5">
          <div className="col-lg-6 position-relative">
            <div className="position-relative d-inline-block mb-4">
              <img
                src={profile.avatar}
                alt={`Retrato de ${profile.name}`}
                className="hero-avatar"
                width="180"
                height="180"
              />
              <ThemeBadge />
            </div>
            <p className="hero-subtitle mb-3">{profile.role}</p>
            <h1 className="display-4 fw-bold text-white mb-3">{profile.name}</h1>
            <p className="lead text-muted-soft mb-4">{profile.description}</p>
            <div className="d-flex flex-wrap gap-3 mb-4">
              {profile.heroActions.map((action) => {
                const className =
                  action.type === 'primary'
                    ? 'btn btn-brand btn-lg shadow-soft'
                    : 'btn btn-accent btn-lg shadow-soft';
                return (
                  <a key={action.label} href={action.href} className={`${className} d-inline-flex align-items-center gap-2`}>
                    <i className={`bi ${action.icon}`} aria-hidden="true" />
                    {action.label}
                  </a>
                );
              })}
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2 text-muted">
              <span className="badge badge-brand px-3 py-2 d-inline-flex align-items-center gap-2">
                <i className="bi bi-geo-alt" aria-hidden="true" />
                {profile.location}
              </span>
              <span className="badge bg-brand-soft text-brand px-3 py-2 d-inline-flex align-items-center gap-2">
                <i className="bi bi-activity" aria-hidden="true" />
                {profile.availability}
              </span>
              <span className="badge bg-accent-soft text-white px-3 py-2 d-inline-flex align-items-center gap-2">
                <i className="bi bi-award" aria-hidden="true" />
                {profile.experienceYears} años liderando productos
              </span>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="card card-glass p-4 shadow-elevated">
              <div className="mb-4">
                <p className="text-brand text-uppercase fw-semibold mb-1 small letter-spacing">Resumen rápido</p>
                <p className="mb-0 text-muted">{profile.summary}</p>
              </div>
              <div className="quick-stats-grid">
                {profile.quickStats.map((stat) => (
                  <div key={stat.label} className="quick-stat rounded-4 p-3 d-flex flex-column gap-1 shadow-hover">
                    <div className="d-flex align-items-center gap-2">
                      <i className={`bi ${stat.icon}`} aria-hidden="true" />
                      <span className="stat-label">{stat.label}</span>
                    </div>
                    <span className="stat-value">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
