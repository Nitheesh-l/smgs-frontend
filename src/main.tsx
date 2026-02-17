import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "@/hooks/useAuth";
import "./index.css";

console.log("🟢 Client starting - main.tsx loaded"); // debug

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
