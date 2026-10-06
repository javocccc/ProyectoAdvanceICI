import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "@fontsource-variable/ibm-plex-sans";
import "./styles.css";

// Este es el punto de entrada. AuthProvider deja la sesión disponible para App
// y sus páginas; sin él, useAuth() no puede leer el contexto compartido.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
