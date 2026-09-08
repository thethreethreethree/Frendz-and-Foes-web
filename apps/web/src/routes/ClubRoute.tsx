import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AvatarCropper } from "../backer/AvatarCropper";
import { COUNTRIES } from "../backer/countries";
import {
  type Backer, backerMe, checkBackerCode, backerSignup, backerLogin, backerLogout, backerSetPassword,
} from "../net/backer";

// The backers-only club, hosted by Rex. It's the front door to the (upcoming) enclosure chats: a
// backer signs up with their one-time code — Rex CHATS to check the code, then a Rex-framed FORM
// collects the profile (croppable avatar, name, DOB, country, username). The code is their login key;
// they can add a password later. Signed-in members land on a "you're in" state (sorting + chat next).

function RexFace({ size = 56 }: { size?: number }) {
  const [ok, setOk] = useState(true);
  const dim = { width: size, height: size } as const;
  if (!ok) return <span style={dim} className="grid shrink-0 place-items-center rounded-full border-2 border-primary bg-surface text-2xl">🦁</span>;
  return (
    <span style={dim} className="grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-primary bg-gradient-to-br from-primary to-accent">
      <img src="/crew/rex-cutout.png" alt="Rex" style={{ width: size - 4, height: size - 4 }} className="object-cover" onError={() => setOk(false)} />
    </span>
  );
}

function RexSays({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-end gap-3">
      <RexFace />
      <div className="relative max-w-md rounded-2xl rounded-bl-sm border border-primary/50 bg-surface/90 px-4 py-3 shadow-lg backdrop-blur">
        <div className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-primary">Rex · your zookeeper</div>
        <div className="mt-1 font-display text-lg font-bold leading-snug text-ink" style={{ textWrap: "balance" }}>{children}</div>
      </div>
    </div>
  );
}

export function ClubRoute() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Backer | null>(null);

  useEffect(() => { backerMe().then((b) => { setMe(b); setLoading(false); }); }, []);

  return (
    <div className="ff-backdrop min-h-full text-ink">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-5 pt-8 pb-12">
        <div className="flex items-center justify-between">
          <div className="ff-title text-xl font-extrabold">The Backers' Club</div>
          <Link to="/" className="rounded-lg border border-line bg-surface/70 px-3 py-1.5 text-sm font-bold text-ink transition hover:-translate-y-0.5">← Home</Link>
        </div>

        {loading ? (
          <div className="mt-24 text-center text-muted">Rex is checking the guest list…</div>
        ) : me ? (
          <SignedIn me={me} onOut={() => setMe(null)} />
        ) : (
          <Gate onIn={setMe} />
        )}
      </div>
    </div>
  );
}

// ---- Signed-out: Rex checks the code, then the profile form (or a login path) ----
function Gate({ onIn }: { onIn: (b: Backer) => void }) {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  return mode === "login"
    ? <LoginPanel onIn={onIn} toSignup={() => setMode("signup")} />
    : <SignupPanel onIn={onIn} toLogin={() => setMode("login")} />;
}

function SignupPanel({ onIn, toLogin }: { onIn: (b: Backer) => void; toLogin: () => void }) {
  const [step, setStep] = useState<"code" | "profile">("code");
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [rexLine, setRexLine] = useState("Members only right now, hotshot. Backers get a code — cough it up and I'll check you against the list. 🦁");
  const [err, setErr] = useState<string | null>(null);

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim();
    if (!c || checking) return;
    setChecking(true); setErr(null);
    const r = await checkBackerCode(c);
    setChecking(false);
    if (r.valid) {
      setRexLine("Well, well — that one's legit. Welcome to the inside. Let's get you on the books. 🦁");
      setStep("profile");
    } else if (r.state === "used") {
      setErr("That code's already been used — one account per backer, friend.");
      setRexLine("Nnnope. That code's been cashed in already. One per backer — no double-dipping.");
    } else {
      setErr("That's not a code I recognise. Check it and try again.");
      setRexLine("That's not on my list. Nice try. Read it back to me and go again.");
    }
  }

  if (step === "profile") {
    return <ProfileForm code={code.trim()} rexLine={rexLine} onIn={onIn} onBack={() => setStep("code")} />;
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      <RexSays>{rexLine}</RexSays>
      <form onSubmit={submitCode} className="rounded-2xl border border-line bg-surface/60 p-5 backdrop-blur">
        <label className="block text-sm font-bold text-ink">Your backer code</label>
        <p className="mt-1 text-xs text-muted">The one-time code from your Kickstarter reward.</p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="PZ-XXXX-XXXX"
          autoCapitalize="characters"
          spellCheck={false}
          className="mt-3 w-full rounded-xl border border-line bg-canvas px-4 py-3 font-mono text-lg tracking-widest text-ink outline-none focus:border-primary"
        />
        {err && <p className="mt-2 text-sm font-semibold text-red-400">{err}</p>}
        <button
          type="submit"
          disabled={!code.trim() || checking}
          className="mt-4 w-full rounded-xl bg-gradient-to-br from-primary to-accent px-5 py-3 font-display text-lg font-extrabold text-white transition active:scale-95 disabled:opacity-40"
        >
          {checking ? "Checking the list…" : "Check my code"}
        </button>
      </form>
      <button onClick={toLogin} className="text-sm font-semibold text-muted underline-offset-4 hover:text-primary hover:underline">
        Already a member? Log in →
      </button>
    </div>
  );
}

function ProfileForm({ code, rexLine, onIn, onBack }: { code: string; rexLine: string; onIn: (b: Backer) => void; onBack: () => void }) {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(null);
    const r = await backerSignup({ code, username: username.trim(), fullName: fullName.trim(), dob, country, avatar });
    setBusy(false);
    if (r.error || !r.backer) { setErr(r.error || "Couldn't create your profile."); return; }
    onIn(r.backer);
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      <RexSays>{rexLine}</RexSays>
      <form onSubmit={submit} className="rounded-2xl border border-line bg-surface/60 p-5 backdrop-blur">
        <div className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Build your profile</div>

        <div className="mt-4"><AvatarCropper onChange={setAvatar} /></div>

        <div className="mt-6 grid gap-4">
          <Field label="Username" hint="3–20 chars: letters, numbers, . _ -">
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. jungle_john"
              className="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-ink outline-none focus:border-primary" />
          </Field>
          <Field label="Full name">
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="First Last"
              className="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-ink outline-none focus:border-primary" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date of birth">
              <input type="date" value={dob} max={today} onChange={(e) => setDob(e.target.value)}
                className="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-ink outline-none focus:border-primary" />
            </Field>
            <Field label="Country of origin">
              <select value={country} onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-ink outline-none focus:border-primary">
                <option value="">Select…</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {err && <p className="mt-3 text-sm font-semibold text-red-400">{err}</p>}

        <div className="mt-5 flex items-center gap-3">
          <button type="button" onClick={onBack} className="rounded-xl border border-line bg-surface px-4 py-3 text-sm font-bold text-muted transition hover:text-ink">← Back</button>
          <button type="submit" disabled={busy}
            className="flex-1 rounded-xl bg-gradient-to-br from-primary to-accent px-5 py-3 font-display text-lg font-extrabold text-white transition active:scale-95 disabled:opacity-40">
            {busy ? "Setting you up…" : "Create my profile"}
          </button>
        </div>
      </form>
    </div>
  );
}

function LoginPanel({ onIn, toSignup }: { onIn: (b: Backer) => void; toSignup: () => void }) {
  const [byPassword, setByPassword] = useState(false);
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(null);
    const r = byPassword
      ? await backerLogin({ username: username.trim(), password })
      : await backerLogin({ code: code.trim() });
    setBusy(false);
    if (r.error || !r.backer) { setErr(r.error || "Couldn't log you in."); return; }
    onIn(r.backer);
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      <RexSays>Back again? Prove it's you. Your code still works as your key — or your username and password if you set one.</RexSays>
      <form onSubmit={submit} className="rounded-2xl border border-line bg-surface/60 p-5 backdrop-blur">
        {byPassword ? (
          <div className="grid gap-4">
            <Field label="Username">
              <input value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-ink outline-none focus:border-primary" />
            </Field>
            <Field label="Password">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-ink outline-none focus:border-primary" />
            </Field>
          </div>
        ) : (
          <Field label="Your backer code">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="PZ-XXXX-XXXX" autoCapitalize="characters" spellCheck={false}
              className="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 font-mono tracking-widest text-ink outline-none focus:border-primary" />
          </Field>
        )}
        {err && <p className="mt-3 text-sm font-semibold text-red-400">{err}</p>}
        <button type="submit" disabled={busy}
          className="mt-4 w-full rounded-xl bg-gradient-to-br from-primary to-accent px-5 py-3 font-display text-lg font-extrabold text-white transition active:scale-95 disabled:opacity-40">
          {busy ? "Checking…" : "Log in"}
        </button>
        <button type="button" onClick={() => { setByPassword((v) => !v); setErr(null); }} className="mt-3 text-sm font-semibold text-muted hover:text-primary">
          {byPassword ? "Use my backer code instead" : "Use a username + password instead"}
        </button>
      </form>
      <button onClick={toSignup} className="text-sm font-semibold text-muted underline-offset-4 hover:text-primary hover:underline">
        New here? I've got a code →
      </button>
    </div>
  );
}

// ---- Signed-in landing ----
function SignedIn({ me, onOut }: { me: Backer; onOut: () => void }) {
  const [showPw, setShowPw] = useState(false);
  return (
    <div className="mt-8 flex flex-col gap-6">
      <RexSays>You're in, <b>{me.username}</b>. Welcome to the club — the enclosures and the chats open soon. Sit tight; I'll be sorting you shortly. 🦁</RexSays>

      <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface/60 p-5 backdrop-blur">
        {me.avatar
          ? <img src={me.avatar} alt="" className="h-20 w-20 shrink-0 rounded-full border-2 border-primary object-cover" />
          : <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-2 border-primary bg-canvas text-3xl">🦁</div>}
        <div className="min-w-0">
          <div className="ff-title truncate text-2xl font-extrabold">{me.username}</div>
          <div className="truncate text-sm text-muted">{me.fullName} · {me.country}</div>
          <div className="mt-1 inline-block rounded-full border border-line bg-canvas/70 px-3 py-1 text-xs font-semibold text-muted">
            Enclosure: {me.enclosure ? me.enclosure : "not sorted yet — coming soon"}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-line bg-surface/40 p-5 text-sm text-muted">
        <div className="font-bold text-ink">What's next</div>
        <p className="mt-1">Rex will sort you into one of the four enclosures with a few (silly) questions, then the enclosure chats + the General room open up. You're on the list.</p>
      </div>

      {!me.hasPassword && (
        <div className="rounded-2xl border border-line bg-surface/60 p-5 backdrop-blur">
          {showPw ? <SetPassword /> : (
            <button onClick={() => setShowPw(true)} className="text-sm font-bold text-primary hover:underline">
              + Add a password (so you can log in without your code)
            </button>
          )}
        </div>
      )}

      <button onClick={async () => { await backerLogout(); onOut(); }} className="self-start text-sm font-semibold text-muted hover:text-ink">
        Log out
      </button>
    </div>
  );
}

function SetPassword() {
  const [pw, setPw] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    if (busy) return;
    setBusy(true); setErr(null);
    const r = await backerSetPassword(pw);
    setBusy(false);
    if (r.error) setErr(r.error); else setDone(true);
  }
  if (done) return <p className="text-sm font-semibold text-teal-400">Password set — you can log in with your username + password now.</p>;
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-bold text-ink">Choose a password</label>
      <div className="flex gap-2">
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters"
          className="flex-1 rounded-xl border border-line bg-canvas px-4 py-2.5 text-ink outline-none focus:border-primary" />
        <button onClick={save} disabled={busy || pw.length < 8}
          className="rounded-xl bg-gradient-to-br from-primary to-accent px-4 py-2.5 font-display font-extrabold text-white transition active:scale-95 disabled:opacity-40">Save</button>
      </div>
      {err && <p className="text-sm font-semibold text-red-400">{err}</p>}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-bold text-ink">{label}</span>
      {hint && <span className="mb-1 block text-xs text-muted">{hint}</span>}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}
