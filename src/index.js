import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import "./index.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
// HashRouter so deep links work on GitHub Pages (no SPA fallback).
// StrictMode omitted: double-mount races the camera scanner in dev.
root.render(
  <HashRouter>
    <App />
  </HashRouter>
);

if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${process.env.PUBLIC_URL || ""}/service-worker.js`)
      .catch(() => {});
  });
}
