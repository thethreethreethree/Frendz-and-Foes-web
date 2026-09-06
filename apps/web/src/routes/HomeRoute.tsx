import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../display/Logo";
import { FloatingAccents } from "../display/Icons";
import { useRexHost, RexBanner } from "../host/RexHost";
import { getBrand } from "../brand/theme";

export function HomeRoute() {
  const brand = getBrand();
  // Rex greets you on the landing page — the AI host, front and center before a game even starts.
  const { line, say } = useRexHost(null, "PlayZoo");
  const greeted = useRef(false);
  useEffect(() => {
    if (greeted.current) return;
    greeted.current = true;
    say("welcome");
  }, [say]);
  return (
    <div className="ff-backdrop relative grid h-full place-items-center p-6">
      <FloatingAccents />
      <div className="ff-rise relative flex flex-col items-center text-center">
        <Logo className="animate-floaty text-6xl" />
        <p className="mt-3 font-display text-2xl font-semibold tracking-wide text-muted">{brand.tagline}</p>
        <div className="mt-10 flex flex-col items-center gap-3.5">
          <Link
            to="/display"
            className="rounded-2xl bg-gradient-to-br from-primary to-accent px-9 py-3.5 font-display text-3xl font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.18),0_16px_44px_-10px_rgb(var(--c-primary)/0.65)] transition duration-150 hover:-translate-y-0.5 hover:scale-[1.03] active:scale-95"
          >
            OPEN DISPLAY
          </Link>
          <Link
            to="/control"
            className="rounded-2xl bg-gradient-to-br from-secondary to-info px-9 py-3.5 font-display text-3xl font-extrabold text-white shadow-[0_16px_44px_-12px_rgb(var(--c-secondary)/0.6)] transition duration-150 hover:-translate-y-0.5 hover:scale-[1.03] active:scale-95"
          >
            HOST CONTROLLER
          </Link>
        </div>
      </div>
      <RexBanner line={line} />
    </div>
  );
}
