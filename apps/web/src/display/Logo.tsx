export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`ff-title leading-none ${className}`}>
      <span className="text-pink">FRENDZ</span>
      <span className="mx-2 text-ink">&amp;</span>
      <span className="text-teal">FOES</span>
    </div>
  );
}
