import React from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider, Navigate } from "react-router-dom";
import "./index.css";
import { applyBrand } from "./brand/theme";
import { defaultBrand } from "./brand/brand";
import { resolveSlug, fetchBrand } from "./brand/resolve";
import { DisplayRoute } from "./routes/DisplayRoute";
import { HomeRoute } from "./routes/HomeRoute";
import { ControlRoute } from "./routes/ControlRoute";
import { PlayerRoute } from "./routes/PlayerRoute";
import { PosterRoute } from "./routes/PosterRoute";
import { AdminRoute } from "./routes/AdminRoute";

// Each route mounts its own provider: the display follows, the controller is authoritative.
// Hash routing keeps deep links working when served as static files (no server rewrites needed).
const router = createHashRouter([
  { path: "/", element: <HomeRoute /> },
  { path: "/display", element: <DisplayRoute /> },
  { path: "/control", element: <ControlRoute /> },
  { path: "/play", element: <PlayerRoute /> },
  { path: "/poster", element: <PosterRoute /> },
  { path: "/admin", element: <AdminRoute /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);

// Resolve and apply the active brand BEFORE first render so colors/fonts/title are themed
// from the start. We paint the built-in default immediately, then override with the stored
// brand for this tenant if the server has one (a slow/missing API never blocks the app).
async function boot() {
  applyBrand(defaultBrand);
  const stored = await fetchBrand(resolveSlug());
  if (stored) applyBrand(stored);
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  );
}

boot();
