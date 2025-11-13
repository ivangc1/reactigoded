// Card showcasing a single project with CTA links
export function ProjectCard({ project }) {
  return (
    <div className="card project-card card-glass h-100 p-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="h4 text-white mb-0">{project.title}</h3>
        <span className="badge bg-brand-soft text-brand">Impacto</span>
      </div>
      <p className="text-muted mb-3">{project.description}</p>
      <p className="text-muted-soft small mb-4">
        <i className="bi bi-graph-up" aria-hidden="true" /> {project.impact}
      </p>
      <div className="d-flex flex-wrap gap-2 mb-4">
        {project.stack.map((tech) => (
          <span key={tech} className="badge badge-brand">
            {tech}
          </span>
        ))}
      </div>
      <div className="d-flex flex-wrap gap-3">
        <a
          href={project.repo}
          className="btn btn-sm btn-outline-brand d-inline-flex align-items-center gap-2"
        >
          <i className="bi bi-github" aria-hidden="true" />
          Repositorio
        </a>
        <a href={project.demo} className="btn btn-sm btn-accent d-inline-flex align-items-center gap-2">
          <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
          Ver demo
        </a>
      </div>
    </div>
  );
}
