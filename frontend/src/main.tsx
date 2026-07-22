import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "react-hot-toast";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import { store } from "./store";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { getFingerprint } from "./utils/security";
import "./index.css";

// Generate and cache browser fingerprint on startup
getFingerprint().catch(() => {});

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
const app = (
  <ErrorBoundary>
    <Provider store={store}>
      <BrowserRouter>
        <HelmetProvider>
          <App />
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        </HelmetProvider>
      </BrowserRouter>
    </Provider>
  </ErrorBoundary>
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>{app}</GoogleOAuthProvider>
    ) : (
      app
    )}
  </React.StrictMode>,
);
