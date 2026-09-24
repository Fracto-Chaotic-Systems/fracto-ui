import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { initialize_service_ports } from "./utils/service_ports.jsx";

initialize_service_ports()
  .then(() => {
    createRoot(document.getElementById("root")).render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    );
  })
  .catch((error) => {
    document.getElementById("root").textContent =
      `Unable to discover Fracto services: ${error.message}`;
  });
