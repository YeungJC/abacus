import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { useApp } from "./store";
import "./styles.css";

useApp.getState().setLang(useApp.getState().lang); // sets <html lang>

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
