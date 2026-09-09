// Named staff accounts. Weighted to the failures that would hand someone access they should not
// have, or lock everyone out — both of which are worse than a crash, because neither is obvious.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TMP = mkdtempSync(join(tmpdir(), "pz-staff-"));
process.env.DB_PATH = join(TMP, "staff.db");
process.env.AUTH_DIR = join(TMP, "auth");

const S = await import("./staff.js");
await S.initStaff();

let fails = 0;
const check = (label, ok, detail = "") => {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : "  <- " + detail}`);
};

check("staff accounts are ready", S.staffReady());

// --- creating -----------------------------------------------------------------------------------
const owner = S.createStaff({ email: "owner@playzoo.test", password: "correct-horse-battery", role: "owner", name: "Owner" });
check("an owner can be created", !!owner.staff, JSON.stringify(owner));
check("a new account is active", owner.staff.active === true);

check("a short password is refused",
      !!S.createStaff({ email: "x@y.test", password: "short", role: "admin" }).error);
check("a junk email is refused",
      !!S.createStaff({ email: "not-an-email", password: "correct-horse-battery" }).error);
check("an invented role is refused",
      !!S.createStaff({ email: "z@y.test", password: "correct-horse-battery", role: "superuser" }).error);
check("the same email twice is refused",
      !!S.createStaff({ email: "OWNER@playzoo.test", password: "correct-horse-battery" }).error,
      "email match must be case-insensitive");

// --- secrets never leave -------------------------------------------------------------------------
const json = JSON.stringify(S.listStaff());
check("no password hash is ever serialised", !/pw_hash|pw_salt/.test(json), json.slice(0, 120));

// --- authentication --------------------------------------------------------------------------------
check("the right password authenticates", !!S.authenticateStaff("owner@playzoo.test", "correct-horse-battery"));
check("email is case-insensitive at login", !!S.authenticateStaff("Owner@PlayZoo.test", "correct-horse-battery"));
check("a wrong password does not", !S.authenticateStaff("owner@playzoo.test", "wrong-horse-battery"));
check("an unknown email does not", !S.authenticateStaff("nobody@playzoo.test", "correct-horse-battery"));

// --- roles decide capability ------------------------------------------------------------------------
check("an owner can manage staff", S.can("owner", "staff") === true);
check("an admin CANNOT manage staff", S.can("admin", "staff") === false,
      "otherwise an admin could promote themselves to owner");
check("an admin can see money", S.can("admin", "money") === true);
check("support CANNOT see money", S.can("support", "money") === false);
check("support can work the fulfilment queue", S.can("support", "fulfilment") === true);
check("readonly cannot touch fulfilment", S.can("readonly", "fulfilment") === false);
check("an unknown role is denied everything, not defaulted",
      S.can("wizard", "activity") === false && S.capabilitiesFor("wizard").length === 0);

// --- sessions ----------------------------------------------------------------------------------------
const tok = S.makeStaffSession(owner.staff.id);
check("a session round-trips", S.readStaffSession(tok)?.id === owner.staff.id);
check("a tampered signature is rejected", !S.readStaffSession(tok.slice(0, -2) + "00"));
check("garbage is rejected", !S.readStaffSession("nonsense"));
check("an expired session is rejected", !S.readStaffSession(S.makeStaffSession(owner.staff.id, -1)),
      "a client must not be able to outlive its own expiry");

// A client must not be able to extend its own session by rewriting the expiry.
const [id0, , sig0] = tok.split(".");
const forged = `${id0}.${Date.now() + 999 * 86400000}.${sig0}`;
check("an extended expiry is rejected", !S.readStaffSession(forged),
      "the signature covers the expiry, so rewriting it invalidates the token");

// --- deactivation ends access IMMEDIATELY ----------------------------------------------------------
const helper = S.createStaff({ email: "help@playzoo.test", password: "correct-horse-battery", role: "support" });
const helperTok = S.makeStaffSession(helper.staff.id);
check("the helper's session works", !!S.readStaffSession(helperTok));
S.setStaffActive(helper.staff.id, false);
check("deactivating ends the session they are ALREADY holding", !S.readStaffSession(helperTok),
      "checked at read time, not just at login, or revoking would take a week to bite");
check("and they cannot log back in", !S.authenticateStaff("help@playzoo.test", "correct-horse-battery"));
check("the account still exists, so their audit trail still resolves",
      S.listStaff().staff.some((x) => x.id === helper.staff.id));

// --- you cannot lock everyone out --------------------------------------------------------------------
check("the last active owner cannot be deactivated",
      !!S.setStaffActive(owner.staff.id, false).error);
check("and cannot be demoted", !!S.setStaffRole(owner.staff.id, "admin").error);

const owner2 = S.createStaff({ email: "second@playzoo.test", password: "correct-horse-battery", role: "owner" });
check("with a second owner, the first CAN be demoted", !S.setStaffRole(owner.staff.id, "admin").error,
      JSON.stringify(owner2));
check("the demoted owner loses the staff capability",
      S.can(S.listStaff().staff.find((x) => x.id === owner.staff.id).role, "staff") === false);

// --- passwords ---------------------------------------------------------------------------------------
check("a password can be changed", !!S.setStaffPassword(owner.staff.id, "a-brand-new-passphrase").ok);
check("the old password stops working", !S.authenticateStaff("owner@playzoo.test", "correct-horse-battery"));
check("the new one works", !!S.authenticateStaff("owner@playzoo.test", "a-brand-new-passphrase"));
check("a short replacement is refused", !!S.setStaffPassword(owner.staff.id, "abc").error);

console.log(fails ? `\n${fails} FAILED` : "\nall staff checks passed");
process.exit(fails ? 1 : 0);
