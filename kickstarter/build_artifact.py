# Builds the compliance artifact.
#
# FIELD TEXT IS PARSED FROM campaign-fields.md ON EVERY RUN. It used to come from a ks_fields.json
# snapshot, and that snapshot went stale the moment the Risks field was rewritten out of the host's
# comic voice: the published artifact served the OLD 4,303-character Risks under a chip that said
# "PLAIN REGISTER", so the label and the payload disagreed and the owner would have pasted the
# superseded text into the one field a Kickstarter reviewer reads first.
#
# That is the same defect this very session recorded a memory about -- a frozen second copy of
# campaign copy is a compliance hazard, not a backup -- reproduced inside the tool that documents it.
# There is now no second copy to drift: the repo file is the only source, and REQUIRED below fails
# loudly if a heading it expects is ever renamed, rather than silently emitting an empty block.
import io, os, sys, re, json, html
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HERE = os.path.dirname(os.path.abspath(__file__))
MD   = os.path.join(HERE, "campaign-fields.md")          # the ONLY source of field text
TPL  = os.path.join(HERE, "artifact-template.html")
OUT  = os.path.join(HERE, "dist", "ks-compliance.html")  # dist/ is gitignored; publish from here
e = html.escape


def load_fields(path):
    """Every fenced block in the file, keyed by the heading above it, plus the subtitle."""
    md = open(path, encoding="utf-8").read()
    out = {}
    for m in re.finditer(r"```\n(.*?)```", md, re.S):
        before = md[:m.start()].rstrip().split("\n")
        head = next((l for l in reversed(before) if l.startswith("#")), "?").strip("# ").strip()
        out.setdefault(head, m.group(1).strip())
    sub = re.search(r"\*\*Recommended -- Option A \(\d+/135\):\*\*\n\n> (.+)", md)
    if sub:
        out["Subtitle"] = sub.group(1).strip()
    return out


F = load_fields(MD)

PAIRS = [
 ("Block 01 &middot; What this is", "kickstarter/body.html",
  "It already works &mdash; you can play it today &mdash; and this campaign is about making it louder.",
  "PlayZoo is in development &mdash; the fourteen games are built and the rules work, but most of them still run on a plain background and I still talk in text. This money builds the rest of it. It does not keep anything running, because nothing is running yet.",
  "The claim was also false: <code>/api/status</code> returns <code>gamesOpen:false</code>."),
 ("Spend bucket 2 of 4", "kickstarter/body.html",
  "<b>Keep the zoo standing.</b> Servers and hosting that don&rsquo;t fall over the moment twelve people join on game night.",
  "<b>System development.</b> The engineering left to finish version one &mdash; the fourteen games finished off, the phone controllers hardened, and the whole thing packaged up as a release you can actually get your hands on.",
  "The exact trigger: a continuous cost as a funded line item. Your call, 10 Sep."),
 ("Risks &mdash; opening paragraph", "campaign-fields.md &sect;3",
  "You can go and prod the whole thing right now and see for yourself &mdash; that&rsquo;s not a promise, it&rsquo;s a link.",
  "PlayZoo is in development. It is not open to the public, it is not trading, and this campaign is not raising money to cover the costs of an existing operation.",
  "Risks is the field the reviewer quoted on Zwaptz. That link would have shown them a lock screen."),
 ("Risk 4 &mdash; ongoing costs", "campaign-fields.md &sect;3",
  "MORE PLAYING COSTS MORE MONEY. Every game night is more AI calls and more hosting. The subscriptions are what pays for that once the campaign&rsquo;s over.",
  "RUNNING COSTS ARE REAL, AND THIS CAMPAIGN DOES NOT FUND THEM. Those are ongoing operational costs and they are funded by subscription revenue, not by pledges. A pledge completes the build and pays for the rewards promised to that backer.",
  "Same honesty, but it now denies the pledge funds operations instead of implying it."),
 ("Block 10 &middot; For venues", "kickstarter/body.html",
  "It&rsquo;s a real revenue line, not a someday &mdash; the branding engine already exists in the product today.",
  "This one comes after launch &mdash; it isn&rsquo;t part of what this campaign funds, and nobody is being sold anything today.",
  "Found by the grep sweep, not by reading. A revenue pitch is the most business-shaped sentence a campaign page can carry."),
 ("What Rex and John tell backers", "apps/server/productKnowledge.js",
  "modest, because the thing already works; the money makes it louder rather than building it from scratch.",
  "modest, because the fourteen games are already built &hellip; the system development left to finish version one. It does NOT pay running costs &mdash; subscriptions do that after launch.",
  "A compliant page plus a stale knowledge file means the two characters contradict the campaign in live chat."),
 ("Refund policy", "campaign-fields.md &sect;6",
  None,
  "Collected pledges are not refundable. Kickstarter has no refund button and we are not offering one alongside it.",
  "Did not exist. It was the <em>other</em> field the reviewer named. Your call, 10 Sep: promise nothing the platform cannot deliver."),
]

FIELDS = [
 ("Risks and challenges", "REWRITTEN · PLAIN REGISTER", "rewritten", "3. Risks and challenges",
  "The field the reviewer quoted on Zwaptz. Rewritten twice: once for compliance, then again out of the host's comic voice into a plain professional register &mdash; a risk disclosure delivered by a cartoon character reads as not taking the review seriously. Every other field keeps the campaign voice."),
 ("Refund policy", "NEW", "new", "6. Refund policy",
  "The other field they named. You had none &mdash; which is not a safe way to have no violation in one."),
 ("Frequently asked questions", "2 ANSWERS CHANGED", "rewritten", "4. Frequently Asked Questions",
  "&ldquo;When do I get my stuff?&rdquo; and &ldquo;Who&rsquo;s actually behind this?&rdquo; both claimed a running product. Kickstarter adds these one at a time."),
 ("Use of AI", "UNCHANGED", "unchanged", "Straight version (recommended for this field)",
  "Already compliant &mdash; it states plainly that no funding builds AI. Here so you can do the whole set in one sitting."),
 ("Subtitle", "UNCHANGED", "unchanged", "Subtitle",
  "130 of 135 characters. Left as the marketing hook: reviewers judge on Risks and the refund policy, and this has one line to earn a click."),
]


def pair(t, f, old, new, why):
    if old:
        o = '<div class="side old"><span class="tag">Was</span><p>%s</p></div>' % old
    else:
        o = '<div class="side none"><span class="tag">Was</span><p>Nothing. This field did not exist.</p></div>'
    return ('<article class="pair">\n'
            ' <header><h3>%s</h3><code class="loc">%s</code></header>\n'
            ' <div class="sides">%s<div class="side new"><span class="tag">Now</span><p>%s</p></div></div>\n'
            ' <p class="why">%s</p></article>') % (t, f, o, new, why)


def field(i, name, chip, cls, key, note):
    return ('<article class="field">\n'
            ' <header><div><h3>%s</h3><p class="note">%s</p></div><span class="chip %s">%s</span></header>\n'
            ' <div class="box"><pre>%s</pre></div>\n'
            ' <footer><button class="copy" data-i="%d">Copy field</button>\n'
            ' <label class="done"><input type="checkbox" data-k="f%d"> Pasted into the dashboard</label>\n'
            ' <span class="len">%s characters</span></footer></article>') % (
        name, note, cls, chip, e(F[key]), i, i, format(len(F[key]), ","))


# A heading rename would otherwise produce a KeyError deep in a comprehension, or worse, an empty
# paste block that looks like a styling bug. Fail here, naming what is missing.
missing = [k for _, _, _, k, _ in FIELDS if k not in F]
if missing:
    print("MISSING headings in campaign-fields.md:")
    for k in missing:
        print("   " + k)
    print("\navailable:")
    for k in F:
        print("   " + k)
    sys.exit(1)

tpl = open(TPL, encoding="utf-8").read()
raw = [F[k] for _, _, _, k, _ in FIELDS]
out = (tpl.replace("__PAIRS__", "\n".join(pair(*p) for p in PAIRS))
          .replace("__FIELDS__", "\n".join(field(i, *f) for i, f in enumerate(FIELDS)))
          .replace("__JSON__", json.dumps(raw, ensure_ascii=False)))
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, "w", encoding="utf-8").write(out)
print("wrote %d bytes  |  %d pairs  |  %d fields  ->  %s" % (len(out), len(PAIRS), len(FIELDS), OUT))
