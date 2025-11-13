// Footer with minimal navigation and copyright
export function Footer({ name, role }) {
  const year = new Date().getFullYear();
  return (
    <footer className="py-4 mt-5">
      <div className="container d-flex flex-column flex-md-row align-items-center justify-content-between gap-3">
        <div>
          <span className="text-white fw-semibold">{name}</span>
          <span className="text-muted"> · {role}</span>
        </div>
        <div className="text-muted small">
          © {year} Hecho a mano con intención, accesibilidad y rendimiento.
        </div>
      </div>
    </footer>
  );
}
