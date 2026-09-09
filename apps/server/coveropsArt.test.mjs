// THE GATE the owner asked for: "45 graphics, 45 applications to the page."
//
// Every one of the 45 supplied Cover Ops files must be accounted for in the manifest as either
// APPLIED or REJECTED-with-a-reason, and every APPLIED file must (a) exist as a real image on
// disk and (b) be REFERENCED BY THE APP. Wiring in "most of them" cannot pass silently, which is
// the failure mode the owner has seen on other builds.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath, not URL.pathname: this repo lives under "Frendz and Foes" and the space
// arrives percent-encoded, which made every path lookup miss.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC_DIR = join(ROOT, "GRAPHIC ASSETS", "COVER OPS");
const ART_DIR = join(ROOT, "apps", "web", "public", "art", "coverops");
const MANIFEST = join(ROOT, "tools", "coverops", "manifest.json");
const CODE_DIRS = [join(ROOT, "apps", "web", "src")];

let fails = 0;
const check = (label, ok, detail = "") => {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : "\n        " + detail}`);
};

const man = JSON.parse(readFileSync(MANIFEST, "utf8"));
const applied = man.filter((m) => m.verdict === "applied");
const rejected = man.filter((m) => m.verdict === "rejected");

// 1. Every supplied file is accounted for -- none quietly skipped.
const supplied = existsSync(SRC_DIR) ? readdirSync(SRC_DIR).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)) : [];
if (supplied.length) {
  const named = new Set(man.map((m) => m.src));
  const missing = supplied.filter((f) => !named.has(f));
  check(`every supplied file appears in the manifest (${supplied.length} on disk)`, missing.length === 0,
        `not in manifest: ${missing.join(", ")}`);
  check("manifest names no file that is not supplied", man.every((m) => supplied.includes(m.src)),
        `unknown: ${man.filter((m) => !supplied.includes(m.src)).map((m) => m.src).join(", ")}`);
} else {
  console.log("SKIP  source folder not present (art lives outside the repo); manifest checks still run");
}
check("applied + rejected accounts for every manifest row", applied.length + rejected.length === man.length);
check("no file is listed twice", new Set(man.map((m) => m.src)).size === man.length);
check("every rejection carries a reason", rejected.every((m) => (m.reason || "").length > 20),
      rejected.filter((m) => (m.reason || "").length <= 20).map((m) => m.src).join(", "));
check("every applied row has a slot and a slug", applied.every((m) => m.slot && m.slug));
check("slugs are unique", new Set(applied.map((m) => m.slug)).size === applied.length);

// 2. Every APPLIED file exists as a real, non-trivial image.
const missingFiles = applied.filter((m) => !existsSync(join(ART_DIR, m.slug + ".webp")));
check(`every applied asset exists in public/art/coverops (${applied.length} expected)`,
      missingFiles.length === 0, `missing: ${missingFiles.map((m) => m.slug).join(", ")}`);
const tiny = applied.filter((m) => {
  const p = join(ART_DIR, m.slug + ".webp");
  return existsSync(p) && statSync(p).size < 4096;
});
check("no applied asset is a stub under 4KB", tiny.length === 0, `tiny: ${tiny.map((m) => m.slug).join(", ")}`);

// 3. THE ACTUAL GATE: every applied asset is referenced by the app.
function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|ts|jsx?)$/.test(e.name)) out.push(p);
  }
  return out;
}
// Only files that mention this game count. Without that scope a slug like "bg-lobby" would pass
// because ANOTHER game happens to use the same name -- Quick Draw does exactly that.
const code = CODE_DIRS.flatMap((d) => walk(d))
  .map((f) => readFileSync(f, "utf8"))
  .filter((t) => t.includes("coverops") || t.includes("./art"))
  .join("\n");
const unreferenced = applied.filter((m) => !code.includes(m.slug));
check(`every applied asset is referenced in the app (${applied.length} slugs)`,
      unreferenced.length === 0,
      `NOT WIRED IN: ${unreferenced.map((m) => m.slug).join(", ")}`);

// 4. Rejected art must never be wired in by mistake.
const wiredReject = rejected.filter((m) => m.slug && code.includes(m.slug));
check("no rejected asset is referenced", wiredReject.length === 0);

console.log(`\n${fails === 0 ? "ALL PASS" : fails + " FAILURE(S)"}  -- ${applied.length} applied, ${rejected.length} rejected, ${man.length} total`);
process.exit(fails === 0 ? 0 : 1);
