import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
// Design tokens first: application styles override them, never the other way round.
import "./design/styles.css";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
