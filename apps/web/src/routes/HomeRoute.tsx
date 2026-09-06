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
        <Logo className="text-6xl" />
        <p className="mt-3 font-display text-2xl tracking-wide text-muted">{brand.tagline}</p>
        <div className="mt-10 flex flex-col items-center gap-3">
          <Link
            to="/display"
            className="ff-sticker bg-pink px-8 py-3 font-display text-3xl text-white"
          >
            OPEN DISPLAY
          </Link>
          <Link
            to="/control"
            className="ff-sticker bg-teal px-8 py-3 font-display text-3xl text-ink"
          >
            HOST CONTROLLER
          </Link>
        </div>
      </div>
      <RexBanner line={line} />
    </div>
  );
}
