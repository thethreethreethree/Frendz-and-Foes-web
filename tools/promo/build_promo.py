"""Render the 60-second 9:16 PlayZoo promo from the art already in the repo.

1080x1920, 30fps, SILENT and caption-driven: most vertical video is watched muted, and platform
music reaches further than an embedded track — so every beat carries its point on screen.

Everything here composites the REAL assets in apps/web/public/. Nothing is invented, and every
factual line is one the product already states (14 games, no app, no accounts, the $3,500 goal and
the three tiers all come from apps/server/productKnowledge.js).

Frames are composed with PIL and piped straight into ffmpeg — no intermediate PNGs on disk, which
is what makes 1800 frames tolerable. Each shot pre-scales its source ONCE and then crops per frame,
because a per-frame resize of a 1920px image is what would make this take an hour.

THREE THINGS THIS FILE GETS RIGHT THAT THE FIRST CUT DID NOT, each found by looking at frames:

  1. THE HOST IS REX, AND REX IS NOT A LION. The first cut captioned Duke's lion art with "Rex runs
     the whole night". Per the cast roster, Rex is the human zookeeper who hosts; Duke is a player
     character, "The Big Shot". Naming your own host wrong in your own promo is the kind of error a
     backer notices, so the two host beats now composite the REAL Rex cutouts (kind "hero").
     rex-warning.png is deliberately NOT used here: its helmet badge reads "Rlay2e", not "PlayZoo".

  2. A CENTRE CROP MISSES SUBJECTS THAT ARE NOT CENTRED. "GET IN EARLY" cropped to pure confetti
     with a tail and a briefcase in the corner, because John stands at the right edge of
     beat-getaway. Every "fill" shot now carries `ax` — where its subject actually is across the
     SOURCE width — and the crop is aimed there instead of at the middle.

  3. BACKDROPS SPREAD SIDEWAYS, SO THEY MUST BE FITTED, NOT CROPPED. "fit" shows the whole 16:9
     scene inside a blurred surround and does NOT pan, because there is nothing to pan into.
"""
import os, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS, SECONDS = 1080, 1920, 30, 60
ART = "apps/web/public/art"
CREW = "apps/web/public/crew"
OUT = "tools/promo/playzoo-promo-9x16.mp4"

BG = (10, 14, 24)
INK = (244, 247, 255)
PINK, VIOLET, TEAL, LIME, AMBER = (236, 72, 153), (139, 92, 246), (45, 212, 191), (163, 230, 53), (245, 158, 11)

FONT_DIR = "C:/Windows/Fonts"
def font(px, black=True):
    for name in (("ariblk.ttf", "arialbd.ttf") if black else ("arialbd.ttf",)):
        p = os.path.join(FONT_DIR, name)
        if os.path.exists(p):
            return ImageFont.truetype(p, px)
    return ImageFont.load_default()

# --- the 60 seconds -------------------------------------------------------------------------------
# One dict per shot. The `kind` decides how its art is turned into a 9:16 frame:
#   "fit"  = backdrop; show the WHOLE 16:9 scene in a blurred surround, held still
#   "fill" = character beat; crop to the subject and pan. `ax` = the subject's centre as a fraction
#            of the SOURCE width (0.5 = centred). This is the field that stops a crop from landing
#            on empty scenery.
#   "hero" = a transparent character cutout composited over a blurred ground
#   "logo" = title/end card; the real wordmark over a dimmed fitted scene
def fit(secs, art, big, small, accent):
    return dict(secs=secs, kind="fit", art=art, big=big, small=small, accent=accent)
def fill(secs, art, big, small, accent, ax=0.5):
    return dict(secs=secs, kind="fill", art=art, big=big, small=small, accent=accent, ax=ax)
def hero(secs, ground, cutout, big, small, accent):
    return dict(secs=secs, kind="hero", art=ground, cutout=cutout, big=big, small=small, accent=accent)
def logo_shot(secs, art, small, accent):
    return dict(secs=secs, kind="logo", art=art, big="", small=small, accent=accent)

SHOTS = [
    logo_shot(4.5, "feud/bg-lobby", "party games with a real AI host", PINK),
    # Rex, the actual host. rex-wave is the full-body hello — arm up, laughing, sticker rim-light.
    hero(4.0, "feud/bg-finale", "rex-wave.png",
         "MEET YOUR HOST", "Rex runs the whole night", AMBER),
    fit(4.0, "feud/bg-stage-alt", "14 GAMES", "one screen, everyone's phone", TEAL),
    fit(4.0, "feud/bg-board", "NO APP", "nobody downloads anything", LIME),
    fill(4.0, "coverops/beat-clue", "NO ACCOUNTS", "they scan a code and they're in", VIOLET),
    fit(4.5, "coverops/bg-alarm", "HE READS THE ROOM", "real AI — never the same line twice", PINK),
    # rex-bust is Rex mid-sentence, palm open, eyebrow up. The lion card this replaced was the
    # WRONG-ANSWER beat — Duke clawing his own face — which read as taking a hit, not landing one.
    hero(4.0, "feud/bg-board", "rex-bust.png",
         "HE ROASTS YOU", "warmly. mostly.", AMBER),
    # The populated briefing, not the empty boardroom the first cut used: the shot that sells the
    # game should have somebody in it.
    fit(4.0, "coverops/bg-briefing", "COVER OPS", "crack the grid before the assassin", TEAL),
    fit(4.0, "feud/bg-finale", "SURVEY SHOWDOWN", "two teams, one board, no mercy", LIME),
    fill(4.0, "coverops/beat-caught", "MURDER MYSTERY", "one of you is lying", PINK),
    fill(4.0, "coverops/beat-win", "AND ELEVEN MORE", "trivia, bingo, and the 18+ one", VIOLET),
    fill(5.0, "feud/beat-win", "BACK IT", "Kickstarter — goal $3,500", AMBER),
    # ax=0.76: John walks off at the RIGHT of beat-getaway; the confetti blast owns the left.
    fill(5.0, "coverops/beat-getaway", "GET IN EARLY", "backers play first", PINK, ax=0.76),
    logo_shot(5.0, "feud/bg-lobby", "playzoo.snapaweb.com", TEAL),
]

def load_cover(rel):
    """Scale to COVER the 9:16 frame with room to pan, for CHARACTER BEATS."""
    im = Image.open(os.path.join(ART, rel + ".webp")).convert("RGB")
    scale = max(W / im.width, H / im.height) * 1.15
    return im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)

def load_letterbox(rel):
    """Fit the WHOLE 16:9 scene across the width and fill above/below with a blurred, darkened
    enlargement of itself.

    Backdrops spread their content horizontally -- the corkboard one side, the characters the
    other -- so a centre crop showed an empty wall with a fox sliced off at the edge. Fitting keeps
    every element, and the blurred surround reads as deliberate rather than as bars."""
    im = Image.open(os.path.join(ART, rel + ".webp")).convert("RGB")
    fit_h = int(im.height * W / im.width)
    fitted = im.resize((W, fit_h), Image.LANCZOS)
    surround = im.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(38))
    surround = Image.blend(surround, Image.new("RGB", (W, H), BG), 0.45)
    surround.paste(fitted, (0, (H - fit_h) // 2))
    return surround

CAPTION_TOP = H - 620    # the highest a caption block reaches; hero art must clear it

def load_hero(ground_rel, cutout_name):
    """A transparent character cutout standing on a blurred ground.

    The ground is blurred past recognition on purpose — it is a colour field, not a scene, so
    reusing a backdrop seen elsewhere in the cut costs nothing."""
    im = Image.open(os.path.join(ART, ground_rel + ".webp")).convert("RGB")
    g = im.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(46))
    g = Image.blend(g, Image.new("RGB", (W, H), BG), 0.58)

    cut = Image.open(os.path.join(CREW, cutout_name)).convert("RGBA")
    top, avail_h = 110, CAPTION_TOP - 110
    s = min(avail_h / cut.height, (W - 140) / cut.width)
    cut = cut.resize((max(1, int(cut.width * s)), max(1, int(cut.height * s))), Image.LANCZOS)
    g.paste(cut, ((W - cut.width) // 2, top + (avail_h - cut.height) // 2), cut)
    return g

LOGO_PATH = "apps/web/public/web/logo-playzoo.png"

def logo(width):
    im = Image.open(LOGO_PATH).convert("RGBA")
    return im.resize((width, int(im.height * width / im.width)), Image.LANCZOS)

def wrap(draw, text, f, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=f) <= maxw:
            cur = t
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines

# Caption geometry. The first cut left 22px between a 118px headline and its subline, which read as
# a collision on the two-line shots; the headline now ends 62px clear of it.
BIG_BASE, LINE_H, SMALL_Y, RULE_Y = H - 500, 120, H - 320, H - 250

def draw_text(img, big, small, accent, reveal, kind="fill"):
    """Captions sit in the lower third with a scrim, so they read over any backdrop."""
    d = ImageDraw.Draw(img, "RGBA")
    fb, fs = font(118), font(46, black=False)

    scrim = Image.new("RGBA", (W, 900), (0, 0, 0, 0))
    sd = ImageDraw.Draw(scrim)
    for i in range(900):
        sd.line([(0, i), (W, i)], fill=(6, 9, 18, int(235 * (i / 900) ** 1.4)))
    img.paste(Image.alpha_composite(img.crop((0, H - 900, W, H)).convert("RGBA"), scrim).convert("RGB"), (0, H - 900))

    def rule():
        # accent rule that grows as the shot plays — motion, without moving the words
        rw = int((W - 300) * min(1.0, reveal * 1.6))
        if rw > 4:
            d.rounded_rectangle([(W - rw) / 2, RULE_Y, (W + rw) / 2, RULE_Y + 8], radius=4, fill=accent + (255,))

    if kind == "logo":
        # The real PlayZoo wordmark, not a typed approximation of it.
        lg = logo(760)
        img.paste(lg, ((W - lg.width) // 2, H - 560), lg)
        sw = d.textlength(small, font=fs)
        d.text(((W - sw) / 2, H - 330), small, font=fs, fill=(226, 233, 250, 255))
        rule()
        return

    lines = wrap(d, big, fb, W - 140)
    y = BIG_BASE - (len(lines) - 1) * LINE_H
    for ln in lines:
        tw = d.textlength(ln, font=fb)
        x = (W - tw) / 2
        # a hard accent shadow, the way the brand's stickers are drawn
        d.text((x + 7, y + 7), ln, font=fb, fill=accent + (255,))
        d.text((x, y), ln, font=fb, fill=INK + (255,))
        y += LINE_H

    sw = d.textlength(small, font=fs)
    d.text(((W - sw) / 2, SMALL_Y), small, font=fs, fill=(200, 210, 235, 255))
    rule()

def render():
    cmd = ["ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(FPS), "-i", "-", "-an",
           "-c:v", "libx264", "-preset", "medium", "-crf", "20",
           "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    written = 0
    for si, sh in enumerate(SHOTS):
        kind, n = sh["kind"], int(sh["secs"] * FPS)
        if kind == "hero":
            src = load_hero(sh["art"], sh["cutout"])
        elif kind in ("fit", "logo"):
            src = load_letterbox(sh["art"])
        else:
            src = load_cover(sh["art"])
        if kind == "logo":
            src = Image.blend(src, Image.new("RGB", src.size, BG), 0.55)   # dim, so the mark leads
        still = kind in ("fit", "logo", "hero")   # nothing to pan into on a fitted or composed frame

        for i in range(n):
            t = i / max(1, n - 1)
            if still:
                frame = src.copy()
            else:
                # Aim the crop at the subject (ax), then drift around it — Ken Burns that cannot
                # wander off the character. Direction alternates so cuts feel deliberate.
                span_x, span_y = src.width - W, src.height - H
                dirn = 1 if si % 2 == 0 else -1
                want = sh["ax"] * src.width - W / 2
                drift = span_x * dirn * (t - 0.5) * 0.16
                px = min(max(want + drift, 0), span_x)
                py = span_y * (0.5 - dirn * (t - 0.5) * 0.35)
                frame = src.crop((int(px), int(py), int(px) + W, int(py) + H))
            draw_text(frame, sh["big"], sh["small"], sh["accent"], t, kind)

            # 8-frame dip to black on every cut, so shots do not slam into each other
            fade = min(i, n - 1 - i, 7) / 7
            if fade < 1:
                frame = Image.blend(Image.new("RGB", (W, H), (0, 0, 0)), frame, fade)

            proc.stdin.write(frame.tobytes())
            written += 1
        print(f"  shot {si+1:>2}/{len(SHOTS)}  {sh['secs']:>4.1f}s  {kind:<5} {sh['art']}")

    proc.stdin.close()
    proc.wait()
    print(f"frames written: {written} ({written / FPS:.1f}s)  ->  {OUT}")

if __name__ == "__main__":
    os.makedirs("tools/promo", exist_ok=True)
    render()
