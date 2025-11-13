// Education timeline showing academic achievements
export function EducationSection({ education }) {
  return (
    <section id="educacion" className="section-bg-accent">
      <span className="section-anchor" aria-hidden="true" id="formacion" />
      <div className="container">
        <div className="row">
          <div className="col-lg-9 mx-auto">
            <h2 className="section-title mb-4">Formación</h2>
            <div className="row g-4">
              {education.map((item) => (
                <div key={`${item.institution}-${item.period}`} className="col-md-6">
                  <div className="card h-100 card-glass shadow-hover p-4 card-border-accent">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h3 className="h5 text-white mb-1">{item.degree}</h3>
                        <p className="text-muted mb-0">{item.institution}</p>
                      </div>
                      <span className="badge bg-brand-soft text-brand">{item.period}</span>
                    </div>
                    <div className="text-muted small d-flex align-items-center gap-2">
                      <i className="bi bi-geo-alt" aria-hidden="true" />
                      {item.location}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
