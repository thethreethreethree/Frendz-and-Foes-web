"""Rebuild the three Cover Ops props. The soft neon bloom is DROPPED and re-added in CSS.

FOUR dead ends, recorded so nobody repeats them:
  1. Plain flood-fill (key.py) leaves the halo mottled with checker squares. A semi-transparent
     glow over a two-tone checker produces colours matching NEITHER tone, so the fill never sees
     them and they stay fully opaque.
  2. Two-background matting from a local max/min window DESTROYED the art: inside the token the
     object's own shading has more local contrast than the checker does, so the ratio read the
     artwork as background and zeroed its alpha. Only a specular highlight survived.
  3. Flooding inward from the image border, stopping at "dark = the outline", leaked on
     prop-token, whose checkerboard is ITSELF near-black -- the background registered as outline
     and nothing propagated. Worse, in the halo the dark checker squares act as barriers and
     isolate the bright ones, so the mottling survives anyway.
  4. Choosing the barrier by PIXEL COUNT cut prop-chip's neon ring off: its inner disc outline has
     more pixels than the outer rim, so the fill stopped at the wrong ring.

What works: seed from the checker background that key.py DID identify, then grow inward through
everything that is not the OUTERMOST dark outline -- selected by bounding-box area, which is what
identifies the ring enclosing the whole object. The growth stops exactly at the ink, so the entire
bloom beyond it is discarded, whatever tone the checker happened to be.

Every output was composited on the real game ground (#0a0e18) and looked at before shipping.
"""
import io, json, sys
from collections import deque
from PIL import Image, ImageFilter
import numpy as np
sys.path.insert(0, "tools/coverops")
from key import key_out

OUT = "apps/web/public/art/coverops"
PROPS = ("prop-token", "prop-badge", "prop-chip")

def outermost_dark(dark):
    h, w = dark.shape
    seen = np.zeros_like(dark); best = None; best_area = 0
    for sy in range(0, h, 4):
        for sx in range(0, w, 4):
            if dark[sy, sx] and not seen[sy, sx]:
                comp = []; q = deque([(sy, sx)]); seen[sy, sx] = True
                y0 = y1 = sy; x0 = x1 = sx
                while q:
                    y, x = q.popleft(); comp.append((y, x))
                    y0 = min(y0, y); y1 = max(y1, y); x0 = min(x0, x); x1 = max(x1, x)
                    for ny, nx in ((y+1,x),(y-1,x),(y,x+1),(y,x-1)):
                        if 0 <= ny < h and 0 <= nx < w and dark[ny,nx] and not seen[ny,nx]:
                            seen[ny,nx] = True; q.append((ny,nx))
                area = (y1-y0+1) * (x1-x0+1)
                if area > best_area: best_area = area; best = comp
    m = np.zeros_like(dark)
    for y, x in best: m[y, x] = True
    return m

def cut(src, dark_thr=70):
    keyed = key_out(src)
    rgb = np.asarray(keyed.convert("RGB")).astype(np.int16)
    bg  = np.asarray(keyed.getchannel("A")) == 0
    dark = (rgb.mean(axis=2) < dark_thr) & (~bg)
    outline = outermost_dark(dark)
    h, w = dark.shape
    outside = bg.copy(); q = deque(zip(*np.nonzero(bg)))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y+1,x),(y-1,x),(y,x+1),(y,x-1)):
            if 0 <= ny < h and 0 <= nx < w and not outside[ny,nx] and not outline[ny,nx]:
                outside[ny,nx] = True; q.append((ny,nx))
    a = Image.fromarray(((~outside)*255).astype(np.uint8), "L")
    a = a.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    out = keyed.convert("RGBA"); out.putalpha(a)
    return out.crop(out.getbbox())

if __name__ == "__main__":
    man = json.load(io.open("tools/coverops/manifest.json", encoding="utf-8"))
    by_slug = {m["slug"]: m for m in man if m["verdict"] == "applied"}
    for slug in PROPS:
        im = cut("GRAPHIC ASSETS/COVER OPS/" + by_slug[slug]["src"])
        im.thumbnail((1024, 1024), Image.LANCZOS)
        im.save(f"{OUT}/{slug}.webp", "WEBP", quality=90, method=6)
        print(f"  {slug:<12} {im.size}")
