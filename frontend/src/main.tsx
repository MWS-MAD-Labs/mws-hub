import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import { syncInitialTheme } from "./lib/theme.ts";
import { listenForInstallPrompt } from "./lib/pwaInstall.ts";
import "./index.css";

syncInitialTheme();
registerSW({ immediate: true });
listenForInstallPrompt();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
