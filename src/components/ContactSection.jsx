import { useState } from 'react';

const initialForm = {
  name: '',
  email: '',
  message: ''
};

// Contact section with form validation and social links
export function ContactSection({ contactLinks }) {
  const [formValues, setFormValues] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [status, setStatus] = useState({ type: null, message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const errors = {};
    if (!formValues.name.trim()) {
      errors.name = 'Por favor, indícanos tu nombre.';
    }
    if (!formValues.email.trim()) {
      errors.email = 'Necesitamos tu email para responderte.';
    } else if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/i.test(formValues.email)) {
      errors.email = 'Introduce un correo válido.';
    }
    if (!formValues.message.trim()) {
      errors.message = 'Cuéntanos brevemente tu necesidad.';
    }
    return errors;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const errors = validate();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      setStatus({ type: 'danger', message: 'Revisa los campos marcados para continuar.' });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: 'info', message: 'Enviando mensaje seguro...' });

    window.setTimeout(() => {
      setIsSubmitting(false);
      setStatus({ type: 'success', message: '¡Gracias! Responderé en menos de 24 horas hábiles.' });
      setFormValues(initialForm);
    }, 900);
  };

  return (
    <section id="contacto">
      <span className="section-anchor" aria-hidden="true" />
      <div className="container">
        <div className="row g-5 align-items-start">
          <div className="col-lg-6">
            <h2 className="section-title mb-3">Conectemos</h2>
            <p className="text-muted mb-4">
              ¿Buscas impulsar un producto o elevar la experiencia de un equipo? Estoy disponible para consultorías estratégicas,
              auditorías UX y liderazgo de iniciativas front-end críticas.
            </p>
            <div className="d-flex gap-3 flex-wrap">
              {contactLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="social-link focus-visible-only"
                  aria-label={link.ariaLabel}
                >
                  <i className={`bi ${link.icon}`} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
          <div className="col-lg-6">
            <div className="card card-glass p-4 shadow-elevated">
              <h3 className="h4 text-white mb-3">Hablemos de tu siguiente hito</h3>
              <form noValidate onSubmit={handleSubmit} className="d-grid gap-3">
                <div>
                  <label htmlFor="name" className="form-label text-muted">
                    Nombre completo
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                    placeholder="Cómo quieres que te llame"
                    value={formValues.name}
                    onChange={handleChange}
                    aria-invalid={Boolean(formErrors.name)}
                    aria-describedby={formErrors.name ? 'name-error' : undefined}
                    required
                  />
                  {formErrors.name && (
                    <div id="name-error" className="invalid-feedback">
                      {formErrors.name}
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="email" className="form-label text-muted">
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
                    placeholder="nombre@compania.com"
                    value={formValues.email}
                    onChange={handleChange}
                    aria-invalid={Boolean(formErrors.email)}
                    aria-describedby={formErrors.email ? 'email-error' : undefined}
                    required
                  />
                  {formErrors.email && (
                    <div id="email-error" className="invalid-feedback">
                      {formErrors.email}
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="message" className="form-label text-muted">
                    Mensaje
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows="4"
                    className={`form-control ${formErrors.message ? 'is-invalid' : ''}`}
                    placeholder="Cuéntame sobre el reto, objetivos y timing"
                    value={formValues.message}
                    onChange={handleChange}
                    aria-invalid={Boolean(formErrors.message)}
                    aria-describedby={formErrors.message ? 'message-error' : undefined}
                    required
                  />
                  {formErrors.message && (
                    <div id="message-error" className="invalid-feedback">
                      {formErrors.message}
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  className="btn btn-brand btn-lg d-inline-flex align-items-center gap-2"
                  disabled={isSubmitting}
                >
                  <i className="bi bi-send" aria-hidden="true" />
                  {isSubmitting ? 'Enviando...' : 'Enviar mensaje'}
                </button>
                {status.type && (
                  <div
                    className={`alert mt-2 alert-${status.type === 'info' ? 'brand' : status.type}`}
                    role="status"
                  >
                    {status.message}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
