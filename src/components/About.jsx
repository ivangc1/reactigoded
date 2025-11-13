// About section with highlights and deeper description
export function About({ profile }) {
  return (
    <section id="sobre-mi" className="section-bg-soft">
      <span className="section-anchor" aria-hidden="true" id="sobre" />
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-10">
            <div className="card card-glass p-5 shadow-elevated">
              <h2 className="section-title mb-4">Sobre mí</h2>
              <p className="text-muted mb-4 fs-5">{profile.summary}</p>
              <div className="d-flex flex-wrap gap-2">
                {profile.highlights.map((highlight) => (
                  <span key={highlight} className="skill-pill" role="listitem">
                    <i className="bi bi-check2-circle" aria-hidden="true" />
                    {highlight}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
