"""Key the baked background out of the Cover Ops art and write WebP with a real alpha channel.

WHY THIS EXISTS: the generator exported JPEG, which cannot store alpha, so the transparency
checkerboard was baked in as literal pixels -- in at least four different grey tones, plus one
solid-white and one solid-black background. Matching on colour was therefore unreliable (my first
detector missed 16 of 34). This flood-fills from the image EDGES instead: only background that is
connected to the border is removed, so a grey square inside the artwork is never eaten.

The neon rim glow fades out ON TOP of the checker, and JPEG has already destroyed that blend, so
some mottling can survive in the glow. Every output is re-opened and checked rather than assumed.
"""
import io, json, sys
from collections import deque
from PIL import Image

SRC = "GRAPHIC ASSETS/COVER OPS"
OUT = "apps/web/public/art/coverops"

def key_out(path, tol=26):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    px = im.load()
    seeds = [(0,0),(w-1,0),(0,h-1),(w-1,h-1)]
    tones = [px[x,y] for x,y in seeds]
    # A checkerboard corner gives one tone; sample a short way in to catch the other.
    for d in (10, 20, 30, 40):
        if d < w and d < h:
            tones += [px[d,0], px[0,d], px[w-1-d,0], px[0,h-1-d]]
    def isbg(c):
        return any(abs(c[0]-t[0])<=tol and abs(c[1]-t[1])<=tol and abs(c[2]-t[2])<=tol for t in tones)

    alpha = Image.new("L", (w,h), 255)
    ap = alpha.load()
    seen = bytearray(w*h)
    q = deque()
    for x in range(w):
        for y in (0, h-1):
            if not seen[y*w+x] and isbg(px[x,y]): seen[y*w+x]=1; q.append((x,y))
    for y in range(h):
        for x in (0, w-1):
            if not seen[y*w+x] and isbg(px[x,y]): seen[y*w+x]=1; q.append((x,y))
    while q:
        x,y = q.popleft()
        ap[x,y] = 0
        for nx,ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
            if 0<=nx<w and 0<=ny<h and not seen[ny*w+nx] and isbg(px[nx,ny]):
                seen[ny*w+nx]=1; q.append((nx,ny))
    out = im.convert("RGBA"); out.putalpha(alpha)
    return out

if __name__ == "__main__":
    man = json.load(io.open("tools/coverops/manifest.json", encoding="utf-8"))
    import os; os.makedirs(OUT, exist_ok=True)
    done = 0
    for row in man:
        if row["verdict"] != "applied": continue
        src = f'{SRC}/{row["src"]}'
        dst = f'{OUT}/{row["slug"]}.webp'
        if row["slot"] in ("backdrop","beat"):
            # Full-bleed art: no keying, just convert and downscale for the web.
            im = Image.open(src).convert("RGB")
            im.thumbnail((1920,1920), Image.LANCZOS)
            im.save(dst, "WEBP", quality=82, method=6)
        else:
            im = key_out(src)
            im.thumbnail((1024,1024), Image.LANCZOS)
            im.save(dst, "WEBP", quality=88, method=6, lossless=False)
        done += 1
        print(f"  {row['slug']:<16} <- {row['src'][:52]}")
    print(f"wrote {done} files to {OUT}")
