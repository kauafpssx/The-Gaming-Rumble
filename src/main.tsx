import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import AppShell from "./presentation/shell/AppShell";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppShell />
  </React.StrictMode>,
);
