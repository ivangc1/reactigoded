import { Badge, Button, Spinner } from "@/components";
import { useTheme } from "@/hooks/useTheme";

/**
 * Playground en dev. Sirve para probar componentes sin levantar Storybook.
 * `npm run dev` → http://localhost:5173
 */
function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <main
      style={{
        background: "var(--ig-bg-base)",
        color: "var(--ig-text-body)",
        minHeight: "100vh",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <h1 className="ig-text-3xl ig-font-bold">Igoded Design System</h1>
        <Button appearance="outline" size="sm" onClick={toggleTheme}>
          {theme === "dark" ? "☀️ Claro" : "🌙 Oscuro"}
        </Button>
      </header>

      <section style={{ marginBottom: "2rem" }}>
        <h2 className="ig-text-xl ig-font-semibold ig-mb-3">Buttons</h2>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Button variant="brand">Brand</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="success">Success</Button>
          <Button variant="warning">Warning</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="info">Info</Button>
          <Button appearance="outline">Outline</Button>
          <Button appearance="ghost">Ghost</Button>
          <Button appearance="link">Link</Button>
        </div>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 className="ig-text-xl ig-font-semibold ig-mb-3">Badges</h2>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Badge variant="brand">Brand</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
        </div>
      </section>

      <section>
        <h2 className="ig-text-xl ig-font-semibold ig-mb-3">Spinner</h2>
        <Spinner />
      </section>
    </main>
  );
}

export default App;
