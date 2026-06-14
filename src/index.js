import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
// StrictMode intentionally omitted: it double-mounts effects in dev, which
// causes Html5Qrcode to start/stop/start the camera and race itself.
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${process.env.PUBLIC_URL || ""}/service-worker.js`)
      .catch(() => {});
  });
}
