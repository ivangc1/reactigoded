import { SkillPill } from './SkillPill';

// Skill grid displaying categories with expertise level
export function SkillsSection({ skills }) {
  return (
    <section id="habilidades">
      <span className="section-anchor" aria-hidden="true" id="skills" />
      <div className="container">
        <div className="row">
          <div className="col-lg-10 mx-auto">
            <h2 className="section-title mb-4">Habilidades</h2>
            <div className="row g-4">
              {skills.map((group) => (
                <div key={group.category} className="col-md-6">
                  <div className="card card-glass shadow-hover p-4 h-100">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <h3 className="h5 text-white mb-1">{group.category}</h3>
                        <p className="text-muted mb-0">Nivel {group.level}</p>
                      </div>
                      <span className="badge badge-brand text-uppercase">Focus</span>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      {group.items.map((skill) => (
                        <SkillPill key={skill.label} icon={skill.icon} label={skill.label} />
                      ))}
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
