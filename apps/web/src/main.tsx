import React from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider, Navigate } from "react-router-dom";
import "./index.css";
import { DisplayRoute } from "./routes/DisplayRoute";
import { HomeRoute } from "./routes/HomeRoute";
import { ControlRoute } from "./routes/ControlRoute";
import { PlayerRoute } from "./routes/PlayerRoute";

// Each route mounts its own provider: the display follows, the controller is authoritative.
// Hash routing keeps deep links working when served as static files (no server rewrites needed).
const router = createHashRouter([
  { path: "/", element: <HomeRoute /> },
  { path: "/display", element: <DisplayRoute /> },
  { path: "/control", element: <ControlRoute /> },
  { path: "/play", element: <PlayerRoute /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
