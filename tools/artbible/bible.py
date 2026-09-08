"""Generate ONE art-bible artifact per PlayZoo game.

Structure copies the Enclosure Banners artifact: one card = one image = one complete, standalone,
copy-ready prompt. No {SLOT} templates, no elided lists, no counter that promises more than the
page delivers.

Usage:  python bible.py <gameId>
"""
import io, json, re, sys

REPO = 'C:/Users/johns/OneDrive/Documents/GitHub/Frendz and Foes'
SCRATCH = ('C:/Users/johns/AppData/Local/Temp/claude/'
           'c--Users-johns-OneDrive-Documents-GitHub-Frendz-and-Foes/'
           '047034f9-6b4c-4425-b44f-01449cbba44f/scratchpad')

DNA = (
"STYLE: bold adult animated-sitcom art \u2014 the PlayZoo house look. Thick, confident, slightly uneven "
"black outlines of varying weight; flat cel shading with one soft highlight and one shadow tone; a "
"saturated neon palette that pops on a near-black screen (violet #8b5cf6, hot pink #ec4899, teal "
"#2dd4bf, lime #a3e635, amber #f59e0b); subtle paper grain; clean vector-like finish. Irreverent, "
"comedic, grown-up energy \u2014 prime-time adult cartoon, NOT for children, and never cute.\n\n"
"Any animal is an anthropomorphic party guest, not a pet: expressive face, real attitude, dressed "
"like a person on a late night out. Lighting is nightclub-meets-zoo \u2014 neon rim light on the edges, "
"warm key from below.\n\n"
"Avoid: watermarks, signatures, gibberish or misspelled text, random letters, kids' picture-book "
"style, cutesy chibi, photorealistic, 3D render, CGI, claymation, muddy or desaturated colours, "
"harsh white background, cluttered composition, extra fingers, deformed hands, gore, blood, "
"nudity, explicit sexual content."
)

# ---------- prompt builders -----------------------------------------------------------------------
def bg(gid, state, desc, colours):
    return dict(kind="Backdrop", name=state, file=f"art/{gid}/bg-{state}.webp", ratio="16:9",
        prompt=(f"A wide background plate for a PlayZoo party-game screen. {desc} {colours} "
                f"Deep near-black room so white text sits over it cleanly, and the centre of the frame "
                f"left uncluttered \u2014 the app draws the game on top of this.\n\n"
                f"Aspect ratio: 16:9. Solid background, not transparent. No text, letters or numbers anywhere.\n\n"
                + DNA))

def prop(gid, slug, desc, glow):
    return dict(kind="Prop", name=slug, file=f"art/{gid}/prop-{slug}.webp", ratio="1:1",
        prompt=(f"A single party-game prop drawn as one chunky isolated object: {desc} Tactile and "
                f"cartoon-exaggerated, thick black outline, a bright highlight and a {glow} neon glow, "
                f"centred with a little padding around it.\n\n"
                f"Aspect ratio: 1:1. Transparent background (PNG). No text.\n\n" + DNA))

def beat(gid, slug, moment, char, look, burst):
    return dict(kind="Event beat", name=slug, file=f"art/{gid}/event-{slug}.webp", ratio="16:9",
        prompt=(f"A punchy full-bleed reaction card for the moment: {moment} {char} \u2014 {look} \u2014 "
                f"reacting hugely to exactly that. Comic-book impact framing with radiating speed lines "
                f"and a burst of {burst} Fills the frame, dramatic and funny.\n\n"
                f"Aspect ratio: 16:9. No text.\n\n" + DNA))

# ---------- the games -----------------------------------------------------------------------------
def load_dares():
    src = io.open(REPO + '/packages/engine/src/bingoDares.ts', encoding='utf-8').read()
    body = src[src.index('['):src.rindex(']') + 1]
    d = [x.replace('\\"', '"') for x in re.findall(r'"((?:[^"\\]|\\.)*)"', body)]
    assert len(d) == 75, len(d)
    return d

def game_coverops():
    gid = "coverops"
    JOHN = "John, a scheming cartoon RACCOON in a loud shirt and a trench coat"
    a = [bg(gid, s, d, "Hot pink and teal neon.") for s, d in [
        ("lobby", "A dark spy briefing room in a neon zoo: venetian blinds throwing stripes, a bare corkboard, cigarette smoke hanging in the air, nobody in it yet."),
        ("grid", "The same briefing room lit low, one wall covered in blank filing cards strung together with red thread."),
        ("assassin", "The same briefing room drowned in alarm red, the blinds throwing hard stripes across everything, smoke rolling."),
    ]]
    for slug, desc in [
        ("red-agent", "a cartoon animal agent in a RED trench coat and fedora giving a sly two-finger salute"),
        ("blue-agent", "a cartoon animal agent in a BLUE trench coat and fedora giving a crisp salute"),
        ("bystander", "a bored civilian cartoon animal in a cardigan holding a takeaway coffee, entirely uninvolved and slightly annoyed"),
        ("assassin", "a black-clad cartoon silhouette with glowing eyes and a small skull motif on the lapel, genuinely menacing"),
    ]:
        a.append(dict(kind="Card face", name=slug, file=f"art/{gid}/card-{slug}.webp", ratio="3:4",
            prompt=(f"A single upright spy dossier card, its face revealing {desc}. Battered manila card "
                    f"stock with a thick black outline, a heavy neon rim light and a stamped classification "
                    f"mark rendered as a SHAPE rather than readable words.\n\n"
                    f"Aspect ratio: 3:4. Transparent background (PNG). No readable text.\n\n" + DNA)))
    for i in range(1, 26):
        a.append(dict(kind="Grid tile", name=f"tile {i:02d}", file=f"art/{gid}/tile-{i:02d}.webp", ratio="3:4",
            prompt=(f"A single blank spy-dossier card BACK \u2014 variant {i} of a set of 25. A manila folder "
                    f"card with a thick black outline and its own distinct arrangement of rubber stamps, "
                    f"creases, coffee rings and solid black redaction bars: clearly the same set as the "
                    f"others, visibly not identical to them. Muted card tone with a faint hot-pink neon edge.\n\n"
                    f"Aspect ratio: 3:4. Transparent background (PNG). NO readable text \u2014 redaction bars "
                    f"and stamp shapes only.\n\n" + DNA)))
    for slug, desc in [
        ("clue-token", "a brass token stamped with a keyhole, meaning a clue has been given."),
        ("number-chip", "a chunky blank chip ringed in neon, meaning the number that came with the clue."),
        ("spymaster-badge", "a battered enamel badge with a single eye motif."),
        ("assassin-skull", "a small sinister skull charm hanging on a fine chain."),
    ]:
        a.append(prop(gid, slug, desc, "hot pink"))
    for slug, moment, look, burst in [
        ("clue-given", "the spymaster gives a one-word clue and the team starts arguing.", "tapping his nose, insufferably pleased with himself", "hot pink and teal smoke."),
        ("hit", "the team taps one of their OWN agents and it lands.", "punching the air, coat flying open", "hot pink confetti."),
        ("bystander", "the team taps an innocent bystander and the turn dies.", "cringing with a paw clamped over his mouth", "grey smoke with teal sparks."),
        ("enemy-agent", "the team taps the OTHER side's agent and hands them a point.", "horrified, both paws on top of his head", "hot pink and red smoke."),
        ("assassin", "the team taps the ASSASSIN and instantly loses the whole game.", "frozen in genuine terror, trench coat collar up around his ears", "alarm-red light and black smoke."),
        ("win", "the team cracks the entire grid and wins.", "strolling away with a briefcase, whistling", "hot pink and teal confetti."),
    ]:
        a.append(beat(gid, slug, moment, JOHN, look, burst))
    return dict(id=gid, name="Cover Ops", accent="#ec4899", accent2="#2dd4bf",
        cast="John the raccoon", role="the schemer",
        rule="Crack the grid on your spymaster's one-word clues. Never tap the assassin.",
        why=("Cover Ops draws ZERO images today \u2014 the whole game is coloured rectangles and text. "
             "The four reveals below are the entire drama of it, and right now they are four background colours."),
        assets=a)

GAMES = {"coverops": game_coverops}

# ---------- the page ------------------------------------------------------------------------------
PAGE = """<title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Inter:wght@400;600;700;800&display=swap">
<style>
  :root{{
    --bg:#0a0e18; --card:#141a2c; --card2:#182140;
    --ink:#f4f7ff; --muted:#9aa6c2; --line:#28304a;
    --accent:{accent}; --accent2:{accent2};
    --font-d:"Bricolage Grotesque",system-ui,sans-serif;
    --font-b:"Inter",system-ui,sans-serif;
    --mono:ui-monospace,Menlo,Consolas,monospace;
  }}
  *{{box-sizing:border-box}}
  body{{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font-b);line-height:1.55}}
  .wrap{{max-width:1180px;margin:0 auto;padding:0 20px}}

  header.hero{{padding:56px 0 34px;border-bottom:1px solid var(--line);
    background:
      radial-gradient(900px 460px at 10% -10%, color-mix(in srgb,var(--accent) 34%,transparent), transparent 60%),
      radial-gradient(760px 440px at 100% 4%, color-mix(in srgb,var(--accent2) 26%,transparent), transparent 55%),
      var(--bg)}}
  .eyebrow{{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;
    color:var(--muted);border:1px solid var(--line);background:rgba(20,26,44,.6);padding:6px 14px;border-radius:999px}}
  h1.title{{font-family:var(--font-d);font-weight:800;letter-spacing:-.03em;font-size:clamp(38px,7vw,70px);
    margin:18px 0 6px;line-height:1.02;text-wrap:balance;
    background:linear-gradient(100deg,#fff 0%,var(--accent) 55%,var(--accent2) 100%);
    -webkit-background-clip:text;background-clip:text;color:transparent}}
  .rule{{max-width:660px;color:var(--muted);font-size:18px;margin:0}}
  .cast{{margin-top:14px;font-size:15px}}
  .cast b{{color:var(--accent)}}
  .why{{max-width:720px;margin-top:12px;font-size:15px;color:#c3cbe4}}
  .stats{{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}}
  .stat{{border:1px solid var(--line);background:rgba(20,26,44,.7);border-radius:12px;padding:10px 14px}}
  .stat b{{display:block;font-family:var(--font-d);font-size:22px;line-height:1.1}}
  .stat span{{font-size:12px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase}}

  section{{padding:32px 0}}
  .panel{{background:linear-gradient(180deg,var(--card2),var(--card));border:1px solid var(--line);
    border-radius:18px;padding:20px 22px}}
  .panel h2{{font-family:var(--font-d);font-weight:800;font-size:20px;margin:0 0 4px}}
  .kicker{{font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--accent)}}
  ul.steps{{margin:8px 0 0;padding-left:18px;color:var(--muted);font-size:14px}}
  ul.steps li{{margin:6px 0}} ul.steps b{{color:var(--ink)}}
  .toolbar{{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:16px}}
  .count{{color:var(--muted);font-size:14px}}

  .btn{{cursor:pointer;border:1px solid var(--line);background:#0b1020;color:var(--ink);font-weight:700;
    font-family:var(--font-b);font-size:13px;padding:9px 14px;border-radius:10px;transition:.15s}}
  .btn:hover{{border-color:var(--accent);transform:translateY(-1px)}}
  .btn:focus-visible{{outline:2px solid var(--accent);outline-offset:2px}}
  .btn.primary{{background:linear-gradient(120deg,var(--accent),var(--accent2));border:none;color:#0a0e18}}
  .btn.copied{{border-color:var(--accent2);color:var(--accent2)}}
  .btn.sm{{font-size:12px;padding:6px 11px}}

  .groups{{display:flex;flex-direction:column;gap:30px}}
  .grouphead{{display:flex;flex-wrap:wrap;align-items:baseline;gap:12px;margin-bottom:12px}}
  .grouphead h3{{font-family:var(--font-d);font-weight:800;font-size:22px;margin:0}}
  .grouphead .n{{font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}}
  .grouphead p{{width:100%;margin:0;color:var(--muted);font-size:14px;max-width:70ch}}

  .grid{{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}}
  @media(max-width:820px){{.grid{{grid-template-columns:1fr}}}}
  .card{{background:var(--card);border:1px solid var(--line);border-radius:16px;display:flex;
    flex-direction:column;overflow:hidden}}
  .card .top{{display:flex;gap:12px;align-items:flex-start;padding:14px 16px 8px}}
  .num{{font-family:var(--font-d);font-weight:800;font-size:20px;line-height:1;color:transparent;
    -webkit-text-stroke:1.4px var(--accent);min-width:34px}}
  .who{{flex:1;min-width:0}}
  .name{{font-family:var(--font-d);font-weight:800;font-size:18px;line-height:1.15;word-break:break-word}}
  .tag{{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;
    padding:2px 8px;border-radius:999px;margin-top:5px;
    color:var(--accent);border:1px solid color-mix(in srgb,var(--accent) 40%,transparent);
    background:color-mix(in srgb,var(--accent) 13%,transparent)}}
  .file{{font-family:var(--mono);font-size:11.5px;color:var(--accent2);margin-top:6px;word-break:break-all}}
  .note{{margin:0 16px;font-size:13px;color:#c3cbe4;font-style:italic}}
  .pwrap{{padding:10px 16px 16px;margin-top:auto}}
  .plabel{{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}}
  .plabel span{{font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}}
  code.prompt{{display:block;white-space:pre-wrap;background:#0b1020;border:1px solid var(--line);
    border-radius:11px;padding:12px;color:#d7def5;font-size:12px;font-family:var(--mono);
    max-height:220px;overflow:auto}}

  footer{{padding:34px 0 60px;color:var(--muted);font-size:13px;border-top:1px solid var(--line);margin-top:26px}}
  .toast{{position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(20px);opacity:0;
    background:var(--accent2);color:#04231f;font-weight:800;padding:11px 20px;border-radius:999px;
    transition:.25s;pointer-events:none;z-index:50}}
  .toast.show{{opacity:1;transform:translateX(-50%) translateY(0)}}
  @media(prefers-reduced-motion:reduce){{*{{transition:none!important}}}}
</style>

<header class="hero"><div class="wrap">
  <span class="eyebrow">PlayZoo \u00b7 Game Art \u00b7 {name}</span>
  <h1 class="title">{name}</h1>
  <p class="rule">{rule}</p>
  <p class="cast">Fronted by <b>{cast}</b> \u2014 {role}. He appears on every reaction card.</p>
  <p class="why">{why}</p>
  <div class="stats">
    <div class="stat"><b>{total}</b><span>finished prompts</span></div>
    <div class="stat"><b>{groupn}</b><span>asset sets</span></div>
    <div class="stat"><b>0</b><span>images today</span></div>
  </div>
  <div class="toolbar">
    <button class="btn primary" id="copyAll">Copy all {total} prompts</button>
    <span class="count">Every card below is a complete prompt \u2014 nothing to fill in.</span>
  </div>
</div></header>

<section class="wrap">
  <div class="panel">
    <div class="kicker">How to run this</div>
    <h2>One card, one image</h2>
    <ul class="steps">
      <li>Each card is a <b>complete, standalone prompt</b>. Copy it, paste it into Nanobanana2, generate once.</li>
      <li>The <b>house style block is already inside every prompt</b>, so the whole set matches.</li>
      <li>Use the <b>aspect ratio</b> named in the prompt, and ask for a <b>transparent PNG</b> where it says so.</li>
      <li>Save each image at the <b>exact file path</b> on its card \u2014 that is where the code will look for it.</li>
      <li>Hand them back and I wire them in.</li>
    </ul>
  </div>
</section>

<section class="wrap"><div class="groups" id="groups"></div></section>

<footer class="wrap">
  PlayZoo \u00b7 {name} art set \u00b7 original characters and props, adult animated-sitcom style \u00b7
  casting from the twenty canonical PlayZoo animals \u00b7 {total} prompts, none of them templates.
</footer>

<div class="toast" id="toast">Copied</div>

<script>
const ASSETS = {assets_json};
const GROUP_NOTES = {notes_json};

const groups = [];
for (const a of ASSETS) {{
  let g = groups.find(x => x.kind === a.kind);
  if (!g) {{ g = {{kind: a.kind, items: []}}; groups.push(g); }}
  g.items.push(a);
}}

const esc = s => String(s).replace(/</g, "&lt;");
let idx = 0;
document.getElementById("groups").innerHTML = groups.map(g => `
  <div>
    <div class="grouphead">
      <h3>${{g.kind}}${{g.items.length > 1 ? "s" : ""}}</h3>
      <span class="n">${{g.items.length}} image${{g.items.length === 1 ? "" : "s"}}</span>
      <p>${{GROUP_NOTES[g.kind] || ""}}</p>
    </div>
    <div class="grid">
      ${{g.items.map(a => {{
        const i = ++idx;
        return `<div class="card">
          <div class="top">
            <div class="num">${{String(i).padStart(2, "0")}}</div>
            <div class="who">
              <div class="name">${{esc(a.name)}}</div>
              <div><span class="tag">${{esc(a.kind)}} \u00b7 ${{a.ratio}}</span></div>
              <div class="file">${{esc(a.file)}}</div>
            </div>
          </div>
          ${{a.note ? `<p class="note">\u201c${{esc(a.note)}}\u201d</p>` : ""}}
          <div class="pwrap">
            <div class="plabel"><span>Complete prompt</span>
              <button class="btn sm" data-i="${{i - 1}}">Copy</button></div>
            <code class="prompt">${{esc(a.prompt)}}</code>
          </div>
        </div>`;
      }}).join("")}}
    </div>
  </div>`).join("");

const flat = groups.flatMap(g => g.items);
const toast = document.getElementById("toast");
let tT;
function ping(m) {{ toast.textContent = m; toast.classList.add("show"); clearTimeout(tT);
  tT = setTimeout(() => toast.classList.remove("show"), 1500); }}
async function copy(text, btn) {{
  try {{ await navigator.clipboard.writeText(text); }}
  catch {{ const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta);
           ta.select(); document.execCommand("copy"); ta.remove(); }}
  if (btn) {{ const o = btn.textContent; btn.textContent = "Copied \u2713"; btn.classList.add("copied");
    setTimeout(() => {{ btn.textContent = o; btn.classList.remove("copied"); }}, 1400); }}
  ping("Copied to clipboard");
}}
document.addEventListener("click", e => {{
  const b = e.target.closest("[data-i]");
  if (b) {{ copy(flat[+b.dataset.i].prompt, b); }}
}});
document.getElementById("copyAll").addEventListener("click", e => {{
  const NL = String.fromCharCode(10);
  const SEP = NL + NL + "─".repeat(15) + NL + NL;
  copy(flat.map((a, i) =>
    `—— ${{i + 1}}/${{flat.length}} · ${{a.name}} · save as ${{a.file}}` + NL + NL + a.prompt
  ).join(SEP), e.currentTarget);
}});
</script>
"""

NOTES = {
  "Backdrop": "The room the game happens in. Today every screen is the same flat gradient, so no game has a place of its own.",
  "Card face": "The four reveals are the entire drama of Cover Ops. Right now they are four background colours.",
  "Grid tile": "Twenty-five distinct card backs so the board reads as a wall of dossiers instead of a spreadsheet.",
  "Prop": "The objects the game is played with. Every one is currently a styled button or a coloured div.",
  "Event beat": "The moments the display announces. Murder Mystery has a card for each of these; this game has none.",
}

def build(gid):
    g = GAMES[gid]()
    total = len(g["assets"])
    kinds = []
    for a in g["assets"]:
        if a["kind"] not in kinds: kinds.append(a["kind"])
    html = PAGE.format(
        title=f"{g['name']} Art Set", name=g["name"], rule=g["rule"], cast=g["cast"], role=g["role"],
        why=g["why"], accent=g["accent"], accent2=g["accent2"], total=total, groupn=len(kinds),
        assets_json=json.dumps(g["assets"], ensure_ascii=False),
        notes_json=json.dumps(NOTES, ensure_ascii=False))
    path = f"{SCRATCH}/art-{gid}.html"
    io.open(path, "w", encoding="utf-8", newline="").write(html)
    print(f"{g['name']}: {total} prompts across {len(kinds)} sets -> {path}")
    return path

if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else "coverops")
