// Pill used to highlight individual skills with iconography
export function SkillPill({ icon, label }) {
  return (
    <span className="skill-pill" tabIndex={0}>
      <i className={`bi ${icon}`} aria-hidden="true" />
      {label}
    </span>
  );
}
