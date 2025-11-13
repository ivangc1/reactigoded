export const profile = {
  name: 'Aarón Martínez',
  role: 'Ingeniero Front-End Senior',
  location: 'Barcelona, España',
  availability: 'Disponible para proyectos remotos',
  experienceYears: 9,
  description:
    'Creo experiencias digitales elegantes y enfocadas en el usuario. Lidero equipos front-end, diseño sistemas de diseño escalables y convierto ideas complejas en productos accesibles y de alto rendimiento.',
  summary:
    'Más de 9 años construyendo productos digitales para fintech, salud y educación. Combinación de visión estratégica, artesanía visual y obsesión por la accesibilidad.',
  avatar:
    'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=400&q=80',
  quickStats: [
    { label: 'Años experiencia', value: '09', icon: 'bi-briefcase' },
    { label: 'Proyectos líderes', value: '35+', icon: 'bi-lightning-charge' },
    { label: 'Clientes globales', value: '18', icon: 'bi-globe2' },
    { label: 'NPS promedio', value: '84', icon: 'bi-star-fill' }
  ],
  highlights: [
    'Experto en diseño de sistemas design-to-code',
    'Estratega UX con enfoque en métricas de negocio',
    'Mentor de equipos de alto rendimiento',
    'Facilitador de workshops de ideación con clientes'
  ],
  heroActions: [
    { type: 'primary', label: 'Descargar CV', href: '#', icon: 'bi-download' },
    { type: 'secondary', label: 'Contactar', href: '#contacto', icon: 'bi-send' }
  ]
};

export const experience = [
  {
    company: 'NebulaPay',
    role: 'Head of Front-End Engineering',
    period: '2021 — Actualidad',
    location: 'Remoto · Unión Europea',
    achievements: [
      'Orquesté la migración a microfrontends incrementales, elevando el performance del portal financiero en un 47 %.',
      'Construí un design system token-driven con soporte a accesibilidad AA+, reduciendo el time-to-market en 32 %.',
      'Implementé analítica UX continua que incrementó el onboarding completado por usuarios en un 26 %.'
    ]
  },
  {
    company: 'Synaptech Labs',
    role: 'UX Engineering Lead',
    period: '2018 — 2021',
    location: 'Madrid, España',
    achievements: [
      'Rediseñé la suite de telemedicina basada en datos, alcanzando un aumento de satisfacción del 38 % en encuestas clínicas.',
      'Introduje pipelines CI/CD accesibles al equipo de diseño, logrando sincronía diaria entre diseño y desarrollo.',
      'Dirigí la internacionalización completa de la plataforma en 4 idiomas, manteniendo 0 bugs críticos en producción.'
    ]
  },
  {
    company: 'BlueFox Studio',
    role: 'Senior Product Engineer',
    period: '2015 — 2018',
    location: 'Valencia, España',
    achievements: [
      'Lideré el desarrollo de aplicaciones educativas progresivas, alcanzando 120k MAU con un performance del 98 % en Lighthouse.',
      'Implementé prácticas de accesibilidad continua, logrando certificaciones WCAG 2.1 AA en toda la suite.',
      'Mentoricé a un equipo de 6 ingenieros hacia roles senior mediante pair programming y roadmaps personalizados.'
    ]
  }
];

export const education = [
  {
    institution: 'Universitat Politècnica de Catalunya',
    degree: 'Máster en Experiencia de Usuario & Interfaces',
    period: '2016 — 2017',
    location: 'Barcelona, España'
  },
  {
    institution: 'Universidad de Valencia',
    degree: 'Ingeniería Técnica en Informática de Sistemas',
    period: '2010 — 2014',
    location: 'Valencia, España'
  }
];

export const skills = [
  {
    category: 'Front-End',
    level: 'Avanzado',
    items: [
      { label: 'React 18', icon: 'bi-lightning-charge' },
      { label: 'Next.js', icon: 'bi-cpu' },
      { label: 'Vite', icon: 'bi-bolt' },
      { label: 'TypeScript', icon: 'bi-braces' },
      { label: 'GraphQL', icon: 'bi-diagram-3' },
      { label: 'Accessibility AA+', icon: 'bi-universal-access-circle' }
    ]
  },
  {
    category: 'Product & UX',
    level: 'Experto',
    items: [
      { label: 'Design Systems', icon: 'bi-layers' },
      { label: 'UX Research', icon: 'bi-binoculars' },
      { label: 'Prototipado Figma', icon: 'bi-app-indicator' },
      { label: 'Estrategia de Producto', icon: 'bi-compass' },
      { label: 'Storytelling', icon: 'bi-chat-square-text' }
    ]
  },
  {
    category: 'Back-End & DevOps',
    level: 'Intermedio',
    items: [
      { label: 'Node.js', icon: 'bi-terminal' },
      { label: 'Serverless', icon: 'bi-cloud-arrow-up' },
      { label: 'Docker', icon: 'bi-box-seam' },
      { label: 'CI/CD Github Actions', icon: 'bi-git' },
      { label: 'Testing E2E', icon: 'bi-kanban' }
    ]
  },
  {
    category: 'Soft Skills',
    level: 'Experto',
    items: [
      { label: 'Mentoría & Coaching', icon: 'bi-people' },
      { label: 'Facilitación de Workshops', icon: 'bi-easel' },
      { label: 'Comunicación C-Level', icon: 'bi-megaphone' },
      { label: 'Data Storytelling', icon: 'bi-graph-up-arrow' }
    ]
  }
];

export const projects = [
  {
    title: 'Atlas Banking Suite',
    description:
      'Core banking modular para fintechs, con dashboards en tiempo real y personalización basada en IA.',
    stack: ['React', 'Redux Toolkit', 'Tailwind Tokens', 'Storybook', 'Cypress'],
    repo: '#',
    demo: '#',
    impact: 'Redujo el tiempo de apertura de cuentas digitales a menos de 4 minutos.'
  },
  {
    title: 'Pulse Telehealth Platform',
    description:
      'Ecosistema de telemedicina con flujos seguros de videollamada y monitorización de pacientes crónicos.',
    stack: ['Next.js', 'GraphQL', 'Chakra Tokens', 'AWS Amplify'],
    repo: '#',
    demo: '#',
    impact: 'Incrementó en 68 % la tasa de asistencia en citas remotas.'
  },
  {
    title: 'Aurora Learning OS',
    description:
      'Sistema operativo educativo con experiencias PWA offline-first y dashboards adaptativos para docentes.',
    stack: ['React', 'Vite', 'IndexedDB', 'Jest', 'Playwright'],
    repo: '#',
    demo: '#',
    impact: 'Adoptado por 200+ instituciones con satisfacción docente del 92 %.'
  }
];

export const contactLinks = [
  { icon: 'bi-github', label: 'GitHub', href: '#', ariaLabel: 'GitHub de Aarón Martínez' },
  { icon: 'bi-linkedin', label: 'LinkedIn', href: '#', ariaLabel: 'LinkedIn de Aarón Martínez' },
  { icon: 'bi-envelope', label: 'Email', href: 'mailto:aaron@uxcraft.dev', ariaLabel: 'Enviar email a Aarón Martínez' },
  { icon: 'bi-twitter-x', label: 'X', href: '#', ariaLabel: 'Perfil de X de Aarón Martínez' }
];
