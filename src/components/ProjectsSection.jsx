import { ProjectCard } from './ProjectCard';

// Projects grid with detailed showcases
export function ProjectsSection({ projects }) {
  return (
    <section id="proyectos">
      <span className="section-anchor" aria-hidden="true" id="portfolio" />
      <div className="container">
        <div className="row">
          <div className="col-lg-10 mx-auto">
            <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4 gap-3">
              <div>
                <h2 className="section-title mb-2">Proyectos destacados</h2>
                <p className="text-muted mb-0">
                  Experimentos estratégicos y productos que han escalado equipos y resultados.
                </p>
              </div>
              <a href="#" className="btn btn-outline-brand btn-sm d-inline-flex align-items-center gap-2">
                <i className="bi bi-kanban" aria-hidden="true" />
                Ver roadmap completo
              </a>
            </div>
            <div className="row g-4">
              {projects.map((project) => (
                <div key={project.title} className="col-md-6 col-xl-4">
                  <ProjectCard project={project} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
