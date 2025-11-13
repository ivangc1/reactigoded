import { useEffect, useMemo, useState } from 'react';
import { NavBar } from './components/NavBar';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { ExperienceSection } from './components/ExperienceSection';
import { EducationSection } from './components/EducationSection';
import { SkillsSection } from './components/SkillsSection';
import { ProjectsSection } from './components/ProjectsSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { contactLinks, education, experience, profile, projects, skills } from './data/profile';

// Root application orchestrating all sections and scrollspy behavior
export function App() {
  const sections = useMemo(
    () => [
      { id: 'presentacion', label: 'Presentación' },
      { id: 'sobre-mi', label: 'Sobre mí' },
      { id: 'experiencia', label: 'Experiencia' },
      { id: 'educacion', label: 'Formación' },
      { id: 'habilidades', label: 'Habilidades' },
      { id: 'proyectos', label: 'Proyectos' },
      { id: 'contacto', label: 'Contacto' }
    ],
    []
  );

  const [activeSection, setActiveSection] = useState('presentacion');

  useEffect(() => {
    document.body.setAttribute('data-theme', 'dark');
  }, []);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-40% 0px -40% 0px',
      threshold: 0.2
    };

    const observer = new IntersectionObserver((entries) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .forEach((entry) => {
          setActiveSection(entry.target.id);
        });
    }, observerOptions);

    const targets = sections
      .map((section) => document.getElementById(section.id))
      .filter((element) => element !== null);

    targets.forEach((element) => observer.observe(element));

    return () => {
      targets.forEach((element) => observer.unobserve(element));
      observer.disconnect();
    };
  }, [sections]);

  const handleNavigate = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.replaceState(null, '', `#${id}`);
    }
  };

  return (
    <div data-theme="dark">
      <NavBar sections={sections} activeSection={activeSection} onNavigate={handleNavigate} brand={profile.name} />
      <main>
        <Hero profile={profile} />
        <About profile={profile} />
        <ExperienceSection experience={experience} />
        <EducationSection education={education} />
        <SkillsSection skills={skills} />
        <ProjectsSection projects={projects} />
        <ContactSection contactLinks={contactLinks} />
      </main>
      <Footer name={profile.name} role={profile.role} />
    </div>
  );
}
