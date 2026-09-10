import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@smartmath/ui/styles.css";
import "katex/dist/katex.min.css";
import "./index.css";
import "./components/dashboard/dashboard.css";
import "./i18n";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
