"""Convert the Survey Showdown art into web assets.

Reuses the Cover Ops pipeline (tools/coverops/) rather than reinventing it: backdrops and beats are
full-bleed so they only need converting, while every square prop has the transparency checkerboard
BAKED IN as pixels (the generator exported JPEG, which cannot carry alpha) and must be keyed.

Props go through props.py's outline cut, which drops the soft neon bloom and lets CSS drop-shadow
put it back — the bloom fades out ON TOP of the checkerboard, and JPEG has already destroyed that
blend, so keeping it means keeping visible checker squares. tools/coverops/props.py records the four
approaches that did not work before this one.
"""
import io, json, os, sys, shutil
from PIL import Image
sys.path.insert(0, "tools/coverops")
from props import cut as outline_cut

SRC = "GRAPHIC ASSETS/SURVEY SHOWDOWN"
OUT = "apps/web/public/art/feud"

if __name__ == "__main__":
    man = json.load(io.open("tools/feud/manifest.json", encoding="utf-8"))
    os.makedirs(OUT, exist_ok=True)
    done = 0
    for row in man:
        if row["verdict"] != "applied":
            continue
        # Resolve by FILENAME, never by position: adding one file to the folder shifts
        # every later index and would silently re-point rows at the wrong images.
        src = os.path.join(SRC, row["src"])
        dst = f'{OUT}/{row["slug"]}.webp'
        if row["slot"] in ("backdrop", "beat"):
            im = Image.open(src).convert("RGB")
            im.thumbnail((1920, 1920), Image.LANCZOS)
            im.save(dst, "WEBP", quality=82, method=6)
        else:
            im = outline_cut(src)
            im.thumbnail((1024, 1024), Image.LANCZOS)
            im.save(dst, "WEBP", quality=90, method=6)
        done += 1
        print(f"  {row['slug']:<14} {row['slot']:<9} {im.size}")
    print(f"wrote {done} files to {OUT}")
