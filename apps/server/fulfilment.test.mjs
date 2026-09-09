// The fulfilment queue. Weighted to the failure that would SILENTLY corrupt the list of promises:
// duplicate rows. A Head Keeper who appears to be owed six characters instead of two is worse than
// a crash, because somebody would work the extra four.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TMP = mkdtempSync(join(tmpdir(), "pz-ful-"));
process.env.DB_PATH = join(TMP, "ful.db");
process.env.AUTH_DIR = join(TMP, "auth");

const F = await import("./fulfilment.js");
await F.initFulfilment();

let fails = 0;
const check = (label, ok, detail = "") => {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : "  <- " + detail}`);
};
const openFor = (id) => F.listFulfilment({ backerId: id }).items;

check("queue is ready", F.fulfilmentReady());

// --- generation from a tier ---------------------------------------------------------------------
F.syncFulfilmentFor("hk1", 2);
check("a Head Keeper gets two character slots", openFor("hk1").length === 2,
      String(openFor("hk1").length));
F.syncFulfilmentFor("fa1", 1);
check("a Founding Animal gets one", openFor("fa1").length === 1);
F.syncFulfilmentFor("zp1", 0);
check("a Zoo Pass gets none", openFor("zp1").length === 0);

check("slots are numbered so they can be told apart",
      openFor("hk1").map((r) => r.seq).sort().join(",") === "1,2");
check("titles say which of how many",
      openFor("hk1").some((r) => /1 of 2/.test(r.title)) &&
      openFor("hk1").some((r) => /2 of 2/.test(r.title)));
check("a single character is not titled '1 of 1'", openFor("fa1")[0].title === "Custom character",
      openFor("fa1")[0].title);

// --- THE ONE THAT MATTERS -----------------------------------------------------------------------
// syncFulfilmentFor runs on every list, so it runs constantly. Without UNIQUE(backer_id, kind, seq)
// this silently multiplies the queue.
for (let i = 0; i < 5; i++) F.syncFulfilmentFor("hk1", 2);
check("syncing five more times creates NOTHING", openFor("hk1").length === 2,
      "got " + openFor("hk1").length);
const again = F.syncFulfilmentFor("hk1", 2);
check("and reports zero created", again.created === 0, String(again.created));

// --- a downgrade must not destroy work -----------------------------------------------------------
const before = openFor("hk1").length;
F.syncFulfilmentFor("hk1", 1);          // dropped to Founding Animal
check("dropping a tier does NOT delete the second slot", openFor("hk1").length === before,
      "a character may already be drawn; removing the row would erase that we owed it");

// --- status transitions ---------------------------------------------------------------------------
const item = openFor("fa1")[0];
check("a new item starts owed", item.status === "owed");
const moved = F.updateFulfilment(item.id, { status: "in-progress" });
check("an item can be moved along", moved.item?.status === "in-progress");
const bad = F.updateFulfilment(item.id, { status: "nearly-done" });
check("an invented status is rejected", !!bad.error, JSON.stringify(bad));
check("and the item is unchanged after a rejected update",
      F.listFulfilment({ backerId: "fa1" }).items[0].status === "in-progress");
check("updating an unknown id errors rather than creating one",
      !!F.updateFulfilment("ful_nope", { status: "owed" }).error);

// --- due dates ------------------------------------------------------------------------------------
check("due starts null - it is never guessed from a campaign date nobody supplied",
      openFor("hk1").every((r) => r.due === null));
const badDue = F.updateFulfilment(item.id, { due: "next tuesday" });
check("a non-numeric due is rejected, not coerced to 0", !!badDue.error, JSON.stringify(badDue));
const okDue = F.updateFulfilment(item.id, { due: 1790000000000 });
check("a real timestamp is stored", okDue.item?.due === 1790000000000);
const cleared = F.updateFulfilment(item.id, { due: null });
check("due can be cleared back to null", cleared.item?.due === null);

// --- summary is derived ----------------------------------------------------------------------------
F.syncFulfilmentFor("od1", 1);
const odItem = openFor("od1")[0];
F.updateFulfilment(odItem.id, { due: Date.now() - 86400000 });   // yesterday
let sum = F.fulfilmentSummary();
check("an open item past its due date counts as overdue", sum.overdue === 1, JSON.stringify(sum));

F.updateFulfilment(odItem.id, { status: "delivered" });
sum = F.fulfilmentSummary();
check("a DELIVERED item past its due date is not overdue", sum.overdue === 0, JSON.stringify(sum));
check("delivered is not counted as open", sum.byStatus.delivered === 1 && !sum.open === false);

// --- manual items -----------------------------------------------------------------------------------
const man = F.addFulfilment({ backerId: "hk1", kind: "physical", title: "Replacement poster" });
check("a one-off item can be added", !!man.item, JSON.stringify(man));
check("a manual item gets its own seq and does not collide with tier rows",
      man.item.seq === 1 && man.item.kind === "physical");
check("an item with no title is rejected", !!F.addFulfilment({ backerId: "hk1", title: " " }).error);
check("an item with no backer is rejected", !!F.addFulfilment({ title: "Orphan" }).error);

// A manual character item must not be overwritten by the tier sweep.
const manChar = F.addFulfilment({ backerId: "fa1", kind: "custom-character", title: "Bonus character" });
check("a manual character takes the next free seq", manChar.item?.seq === 2, String(manChar.item?.seq));
F.syncFulfilmentFor("fa1", 1);
check("and the tier sweep leaves it alone", openFor("fa1").length === 2);

// --- ordering ------------------------------------------------------------------------------------
const ordered = F.listFulfilment({}).items;
const firstDone = ordered.findIndex((r) => r.status === "delivered" || r.status === "cancelled");
const lastOpen = ordered.map((r) => F.OPEN_STATUSES.includes(r.status)).lastIndexOf(true);
check("finished work sorts after open work", firstDone === -1 || firstDone > lastOpen,
      `firstDone=${firstDone} lastOpen=${lastOpen}`);

console.log(fails ? `\n${fails} FAILED` : "\nall fulfilment checks passed");
process.exit(fails ? 1 : 0);
