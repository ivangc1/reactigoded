import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
// design.css ya importa internamente tokens + base + components
import "./styles/igoded-design.css";
import "./styles/igoded-reset.css";
import "./styles/igoded-state-css.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("No se encontró el elemento #root en index.html");
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
