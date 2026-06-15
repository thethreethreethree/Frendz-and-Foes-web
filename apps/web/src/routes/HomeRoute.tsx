import { Link } from "react-router-dom";
import { Logo } from "../display/Logo";

export function HomeRoute() {
  return (
    <div className="ff-backdrop grid h-full place-items-center p-6">
      <div className="text-center">
        <Logo className="text-7xl" />
        <p className="mt-3 font-display text-3xl tracking-wide text-ink/70">EL NIDO EDITION</p>
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
    </div>
  );
}
