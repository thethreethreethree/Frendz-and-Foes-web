// Do Rex and John actually CARRY the shared delivery rules?
//
// WHY THIS EXISTS: john.js records that JOHN_AGENT_RULES was written, imported, and then never
// referenced — so /ask-john accepted agent mode end to end and silently ignored it. John answered in
// character but never once tried to sell anyone anything, and nothing failed.
//
// I repeated that exact mistake within the hour: BREVITY_RULE was imported into both files and used
// in neither, and the edit reported success. An imported-but-unused constant is invisible to the
// type checker, invisible to every existing test, and invisible in a diff that looks right.
//
// So this reads the sources and asserts the rules are ASSEMBLED, not merely present.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(join(HERE, f), "utf8");

let fails = 0;
const check = (label, ok, detail = "") => {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : "  <- " + detail}`);
};

const V = await import("./voice.js");
const john = read("john.js");
const host = read("host.js");

// --- the rule itself is a MEASUREMENT, not an adjective -------------------------------------------
check("the brevity rule names a sentence count", /ONE or TWO short sentences/i.test(V.BREVITY_RULE));
check("and a word count", /under 40 words/i.test(V.BREVITY_RULE),
      '"short" is an opinion; a number is an instruction');
check("it forbids the padding that makes a bot sound like a bot",
      /do not pad/i.test(V.BREVITY_RULE) && /offering further help/i.test(V.BREVITY_RULE));
check("it protects the humour rather than just cutting words",
      /pick the best one/i.test(V.BREVITY_RULE),
      "cutting length must not mean cutting the joke");

// --- BOTH characters must ASSEMBLE it, not merely import it ------------------------------------------
check("John's system prompt assembles the brevity rule",
      /JOHN_PERSONA \+ "\\n\\n" \+ BREVITY_RULE/.test(john),
      "imported-and-unused is the JOHN_AGENT_RULES bug all over again");
check("Rex's chat prompt assembles the brevity rule",
      /REX_PERSONA \+ "\\n\\n" \+ BREVITY_RULE/.test(host),
      "Rex's free chat had no length rule AT ALL before this");

// It must reach agent mode too — /ask-john builds on the same base.
check("John's support-desk mode inherits it",
      /return mode === "agent" \? base \+ "\\n\\n" \+ JOHN_AGENT_RULES : base/.test(john),
      "agent mode extends `base`, so it only inherits brevity if base carries it");

// --- the token cap is HEADROOM, not the brake ---------------------------------------------------------
check("the cap is above what a compliant reply needs", V.CHAT_MAX_TOKENS >= 110, String(V.CHAT_MAX_TOKENS));
check("but well below the old runaway 220", V.CHAT_MAX_TOKENS < 200, String(V.CHAT_MAX_TOKENS));
check("John uses the shared cap, not a literal", /max_tokens: CHAT_MAX_TOKENS/.test(john));
check("Rex's chat uses the shared cap", /max_tokens: CHAT_MAX_TOKENS/.test(host));
check("no chat path still hard-codes 220", !/max_tokens: 220/.test(john + host),
      "220 is what made both of them run long");

// Rex's in-GAME one-liners are a different job and must stay tight and separate.
check("Rex's game one-liners keep their own tighter cap", /max_tokens: 80/.test(host),
      "a between-rounds holler is not a conversation");
check("and their own one-liner rule", /ONE_LINER_RULE/.test(host));

console.log(fails ? `\n${fails} FAILED` : "\nall voice checks passed");
process.exit(fails ? 1 : 0);
