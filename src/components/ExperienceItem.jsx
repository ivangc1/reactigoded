// Individual item inside the experience timeline
export function ExperienceItem({ item }) {
  return (
    <div className="timeline-item card-border-brand">
      <div className="timeline-dot" aria-hidden="true" />
      <div className="card bg-transparent border-0">
        <div className="card-body px-4 py-4 bg-dark rounded-4" style={{ backgroundColor: 'rgba(11, 18, 32, 0.65)' }}>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 gap-2">
            <div>
              <h3 className="h4 mb-1 text-white">{item.role}</h3>
              <p className="text-muted mb-0">{item.company}</p>
            </div>
            <div className="text-muted text-md-end">
              <div className="fw-medium">{item.period}</div>
              <div className="small">{item.location}</div>
            </div>
          </div>
          <ul className="text-muted ps-3 mb-0">
            {item.achievements.map((achievement) => (
              <li key={achievement} className="mb-2">
                {achievement}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
