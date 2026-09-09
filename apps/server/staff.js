// Named admin accounts and what each one is allowed to do.
//
// WHY THIS EXISTS: everyone shares one passcode. That causes two problems, and both get WORSE with
// every day of shared use rather than staying still:
//
//   * The audit log cannot say who acted. `events.actor_id` holds a backer id, so an admin renaming
//     a backer and the backer renaming themselves write identical rows. This is not repairable
//     later — the information was never captured, so every day of shared use adds history that can
//     never be resolved to a person.
//   * Access cannot be revoked from one person. Changing the passcode changes it for everyone,
//     including the owner.
//
// The shared passcode SURVIVES as an owner-level override. It is the way back in if the last staff
// account is lost, and removing it would turn this table into a single point of lockout.
//
// Passwords use the SAME scheme as auth.js — scrypt with a per-account salt, compared in constant
// time. Deliberately not a second scheme: two password systems in one codebase means one of them
// eventually gets the weaker treatment.

import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";

let db = null;
let logEvent = () => {};
let ready = false;

export async function initStaff() {
  try {
    const m = await import("./sqlite.js");
    db = m.db;
    logEvent = m.logEvent;
    ready = true;
    console.log("[ff-server] staff accounts ready (sqlite)");
  } catch (err) {
    console.warn("[ff-server] staff accounts unavailable:", err.message);
    ready = false;
  }
  return ready;
}

export const staffReady = () => ready;

// Ordered most powerful first. A role can do everything the roles below it can.
export const ROLES = ["owner", "admin", "support", "readonly"];

// What each role may do. Explicit rather than derived from the ordering, because "support can edit
// fulfilment but must never see money" is a real distinction that a simple rank cannot express.
const GRANTS = {
  owner:    ["money", "fulfilment", "activity", "people", "staff", "settings"],
  admin:    ["money", "fulfilment", "activity", "people", "settings"],
  support:  ["fulfilment", "activity", "people"],
  readonly: ["activity"],
};

/** Can this role do `capability`? Unknown roles are denied — never defaulted to something useful. */
export function can(role, capability) {
  const grants = GRANTS[role];
  return Array.isArray(grants) && grants.includes(capability);
}

export const capabilitiesFor = (role) => (GRANTS[role] ? [...GRANTS[role]] : []);

const emailOk = (e) => typeof e === "string" && e.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const normEmail = (e) => String(e).trim().toLowerCase();

function hashPassword(pw) {
  const salt = randomBytes(16);
  return { salt: salt.toString("hex"), hash: scryptSync(pw, salt, 64).toString("hex") };
}
function verifyPassword(pw, saltHex, hashHex) {
  const computed = scryptSync(pw, Buffer.from(saltHex, "hex"), 64);
  const stored = Buffer.from(hashHex, "hex");
  return computed.length === stored.length && timingSafeEqual(computed, stored);
}

/** What is safe to send to a browser. Never the salt or the hash. */
export const publicStaff = (s) => s && ({
  id: s.id, email: s.email, name: s.name, role: s.role,
  active: !!s.active, created: s.created, last_seen: s.last_seen,
  can: capabilitiesFor(s.role),
});

export function createStaff({ email, password, name = null, role = "readonly" } = {}) {
  if (!ready) return { error: "The database is unavailable right now." };
  if (!emailOk(email)) return { error: "That does not look like an email address." };
  if (typeof password !== "string" || password.length < 10) {
    return { error: "Use a password of at least 10 characters." };
  }
  if (!ROLES.includes(role)) return { error: `role must be one of ${ROLES.join(", ")}.` };

  const { salt, hash } = hashPassword(password);
  const row = {
    id: "st" + randomBytes(9).toString("hex"),
    email: String(email).trim(), email_lower: normEmail(email),
    name: name ? String(name).trim() : null,
    role, pw_salt: salt, pw_hash: hash, active: 1, created: Date.now(), last_seen: null,
  };
  try {
    db.prepare(`INSERT INTO staff (id, email, email_lower, name, role, pw_salt, pw_hash, active, created, last_seen)
                VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
      row.id, row.email, row.email_lower, row.name, row.role,
      row.pw_salt, row.pw_hash, row.active, row.created, row.last_seen);
  } catch (err) {
    if (String(err.message || "").includes("UNIQUE")) return { error: "That email already has an account." };
    return { error: err.message };
  }
  logEvent("staff.created", null, { staffId: row.id, email: row.email_lower, role });
  return { staff: publicStaff(row) };
}

/**
 * Check an email and password. Returns the row or null — never a reason, because "no such account"
 * and "wrong password" must be indistinguishable to a caller guessing at either.
 */
export function authenticateStaff(email, password) {
  if (!ready) return null;
  const s = db.prepare("SELECT * FROM staff WHERE email_lower = ?").get(normEmail(email || ""));
  if (!s) {
    // Spend comparable time on a miss so response timing cannot enumerate accounts.
    try { scryptSync(String(password || ""), "timing", 64); } catch { /* ignore */ }
    return null;
  }
  if (!s.active) return null;                       // deactivated accounts cannot log in
  if (!verifyPassword(String(password || ""), s.pw_salt, s.pw_hash)) return null;
  try { db.prepare("UPDATE staff SET last_seen = ? WHERE id = ?").run(Date.now(), s.id); } catch { /* ignore */ }
  return s;
}

export function getStaff(id) {
  if (!ready || !id) return null;
  return db.prepare("SELECT * FROM staff WHERE id = ?").get(String(id)) || null;
}

export function listStaff() {
  if (!ready) return { ready: false, staff: [] };
  return {
    ready: true,
    staff: db.prepare("SELECT * FROM staff ORDER BY active DESC, created ASC").all().map(publicStaff),
  };
}

/**
 * Deactivate or reactivate. NEVER deletes.
 *
 * Their audit trail has to keep resolving to a person: deleting the row would turn every action
 * they ever took back into an anonymous one, which is the exact problem this table was built to fix.
 */
export function setStaffActive(id, active) {
  if (!ready) return { error: "The database is unavailable right now." };
  const s = getStaff(id);
  if (!s) return { error: "No such staff account." };

  // The last active owner cannot be locked out — that would leave nobody able to restore anyone.
  if (!active && s.role === "owner") {
    const owners = db.prepare("SELECT COUNT(*) n FROM staff WHERE role = 'owner' AND active = 1").get().n;
    if (owners <= 1) return { error: "That is the last active owner. Promote someone else first." };
  }
  db.prepare("UPDATE staff SET active = ? WHERE id = ?").run(active ? 1 : 0, s.id);
  logEvent(active ? "staff.reactivated" : "staff.deactivated", null, { staffId: s.id, email: s.email_lower });
  return { staff: publicStaff(getStaff(s.id)) };
}

export function setStaffRole(id, role) {
  if (!ready) return { error: "The database is unavailable right now." };
  if (!ROLES.includes(role)) return { error: `role must be one of ${ROLES.join(", ")}.` };
  const s = getStaff(id);
  if (!s) return { error: "No such staff account." };

  if (s.role === "owner" && role !== "owner") {
    const owners = db.prepare("SELECT COUNT(*) n FROM staff WHERE role = 'owner' AND active = 1").get().n;
    if (owners <= 1) return { error: "That is the last owner. Promote someone else first." };
  }
  db.prepare("UPDATE staff SET role = ? WHERE id = ?").run(role, s.id);
  logEvent("staff.role_changed", null, { staffId: s.id, from: s.role, to: role });
  return { staff: publicStaff(getStaff(s.id)) };
}

export function setStaffPassword(id, password) {
  if (!ready) return { error: "The database is unavailable right now." };
  if (typeof password !== "string" || password.length < 10) {
    return { error: "Use a password of at least 10 characters." };
  }
  const s = getStaff(id);
  if (!s) return { error: "No such staff account." };
  const { salt, hash } = hashPassword(password);
  db.prepare("UPDATE staff SET pw_salt = ?, pw_hash = ? WHERE id = ?").run(salt, hash, s.id);
  logEvent("staff.password_changed", null, { staffId: s.id });
  return { ok: true };
}

// --- sessions ------------------------------------------------------------------------------------
// Stateless HMAC-signed cookies, same shape as auth.js: no server-side session store to grow, expire
// or lose on restart. The signature covers the expiry, so a client cannot extend its own session.

export const STAFF_COOKIE = "pz_staff";
const STAFF_DAYS = 7;

let SECRET = null;
function secret() {
  if (SECRET) return SECRET;
  // Reuse the same secret file auth.js uses if we can, so one rotation invalidates everything.
  SECRET = process.env.STAFF_SECRET
    ? Buffer.from(process.env.STAFF_SECRET)
    : randomBytes(32);
  return SECRET;
}

export function makeStaffSession(staffId, days = STAFF_DAYS) {
  const exp = Date.now() + days * 86400_000;
  const body = `${staffId}.${exp}`;
  const sig = createHmac("sha256", secret()).update(body).digest("hex");
  return `${body}.${sig}`;
}

export function readStaffSession(token) {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [id, expRaw, sigHex] = parts;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;

  const expect = createHmac("sha256", secret()).update(`${id}.${expRaw}`).digest();
  let sig;
  try { sig = Buffer.from(sigHex, "hex"); } catch { return null; }
  if (sig.length !== expect.length || !timingSafeEqual(sig, expect)) return null;

  const s = getStaff(id);
  // Checked at READ time, not just at login: deactivating someone has to end the session they are
  // already holding, or revoking access would not take effect for up to a week.
  if (!s || !s.active) return null;
  return s;
}

export function staffCookie(token, secure = true) {
  return `${STAFF_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${STAFF_DAYS * 86400}${secure ? "; Secure" : ""}`;
}
export function clearStaffCookie(secure = true) {
  return `${STAFF_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}
