import React from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider, Navigate } from "react-router-dom";
import "./index.css";
import { applyBrand } from "./brand/theme";
import { defaultBrand } from "./brand/brand";
import { resolveSlug, fetchBrand } from "./brand/resolve";
import { fetchGate, gamesAreOpen } from "./net/gate";
import { DisplayRoute } from "./routes/DisplayRoute";
import { HomeRoute } from "./routes/HomeRoute";
import { WaitlistRoute } from "./routes/WaitlistRoute";
import { RexBubble } from "./rex/RexBubble";
import { ControlRoute } from "./routes/ControlRoute";
import { PlayerRoute } from "./routes/PlayerRoute";
import { PosterRoute } from "./routes/PosterRoute";
import { AdminRoute } from "./routes/AdminRoute";

// Pre-launch gate: the games are locked until the Kickstarter completes. Any attempt to reach a
// game surface directly — /display, /control, /play, /poster — bounces to the waitlist while
// locked, so a typed URL or a stale bookmark can't slip past the front-door funnel. `gamesAreOpen()`
// is resolved from the server at boot (below) before the router renders. The server also refuses
// game sockets while locked, so this is UX, not the security boundary.
function GameGate({ children }: { children: React.ReactElement }) {
  return gamesAreOpen() ? children : <Navigate to="/waitlist" replace />;
}

// Each route mounts its own provider: the display follows, the controller is authoritative.
// Hash routing keeps deep links working when served as static files (no server rewrites needed).
const router = createHashRouter([
  { path: "/", element: <HomeRoute /> },
  { path: "/waitlist", element: <WaitlistRoute /> },
  { path: "/display", element: <GameGate><DisplayRoute /></GameGate> },
  { path: "/control", element: <GameGate><ControlRoute /></GameGate> },
  { path: "/play", element: <GameGate><PlayerRoute /></GameGate> },
  { path: "/poster", element: <GameGate><PosterRoute /></GameGate> },
  { path: "/admin", element: <AdminRoute /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);

// Resolve and apply the active brand BEFORE first render so colors/fonts/title are themed
// from the start. We paint the built-in default immediately, then override with the stored
// brand for this tenant if the server has one (a slow/missing API never blocks the app).
async function boot() {
  applyBrand(defaultBrand);
  // Resolve brand + access gate together before first render (both fail safe: brand → default,
  // gate → locked), so the router and home page paint the right state with no flash.
  const [stored] = await Promise.all([fetchBrand(resolveSlug()), fetchGate()]);
  if (stored) applyBrand(stored);
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <RouterProvider router={router} />
      {/* Rex lives on top of every route — a floating chat bubble reachable anywhere. */}
      <RexBubble />
    </React.StrictMode>,
  );
}

boot();
