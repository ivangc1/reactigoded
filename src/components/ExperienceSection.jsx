import { ExperienceItem } from './ExperienceItem';

// Experience timeline composed of several roles
export function ExperienceSection({ experience }) {
  return (
    <section id="experiencia">
      <span className="section-anchor" aria-hidden="true" id="trayectoria" />
      <div className="container position-relative">
        <div className="row">
          <div className="col-lg-10 mx-auto">
            <h2 className="section-title mb-5">Experiencia</h2>
            <div className="position-relative ps-4">
              <div className="timeline-line" aria-hidden="true" />
              <div>
                {experience.map((item) => (
                  <ExperienceItem key={`${item.company}-${item.period}`} item={item} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
