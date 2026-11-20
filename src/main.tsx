import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerPWA } from "./lib/pwa";

registerPWA();

async function start() {
  if (import.meta.env.VITE_PREVIEW === "true") {
    const [{ seedIfEmpty }, { DEMO_STAFF, DEMO_HEADER }] = await Promise.all([import("./lib/staff"), import("./lib/demo")]);
    seedIfEmpty(DEMO_STAFF, DEMO_HEADER);
  }
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

start();
