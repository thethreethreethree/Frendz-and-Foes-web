import { Link } from "react-router-dom";
import { Logo } from "../display/Logo";
import { FloatingAccents } from "../display/Icons";
import { getBrand } from "../brand/theme";

export function HomeRoute() {
  const brand = getBrand();
  return (
    <div className="ff-backdrop relative grid h-full place-items-center p-6">
      <FloatingAccents />
      <div className="relative flex flex-col items-center text-center">
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
    </div>
  );
}
