#!/usr/bin/env python3
"""Export the PlayZoo Kickstarter page as story images for Kickstarter's editor.

WHY THIS EXISTS
  Kickstarter's story editor takes text + images only. Each of the ten campaign
  blocks is screenshotted as one PNG and pasted in, with the plain-text copy in
  kickstarter-copy.txt for the caption/alt fields.

WHY THE RENDER WIDTH IS 560px, NOT 980px
  Kickstarter displays story images in a column ~680px wide. The first export
  rendered the DESKTOP layout at a 980px viewport (1888px PNGs); Kickstarter then
  downscaled those to 680px -- 0.72x -- so 17px body text arrived on the page at
  ~12px, smaller than Kickstarter's own surrounding text. That is the "text is too
  small" bug.

  The fix is the RENDER WIDTH, not the font CSS. Rendering the same page at a
  560px CSS viewport and 3x device scale gives a 1680px PNG whose text occupies
  ~3.0% of the image width instead of ~1.8%. Displayed at 680px, the 17px body
  text lands at ~21px -- comfortably readable, ~1.9x the old export.

  560px is chosen deliberately over a phone-width (~430px) render: at 560px the
  page's own breakpoints still give a 2-across games grid and a 4-across cast
  grid, so the block structure survives. Below 34rem (544px) the games grid
  collapses to a single column and the layout the owner likes is lost.

Run:  python kickstarter/build.py && python kickstarter/export_ks.py
Out:  kickstarter/dist/story/NN-slug.png  +  kickstarter-copy.txt
"""
import base64, json, os, subprocess, tempfile, time

import requests
import websocket
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "dist", "story")
os.makedirs(OUT, exist_ok=True)

CHROME = r"C:/Program Files/Google/Chrome/Application/chrome.exe"
PORT = 9231

# --- the sizing decision, in one place -------------------------------------
WIDTH_CSS = 560      # narrow enough for big text, wide enough to keep the grids
SCALE = 3            # device pixel ratio -> 1680px-wide PNGs
# Block tabs overhang the top (negative margin) and shadows spill bottom-right;
# both sit OUTSIDE getBoundingClientRect, so pad the capture clip to include them.
PAD_TOP, PAD_LR, PAD_BOT = 46, 14, 18
# --- presentation of the exported PNG --------------------------------------
MARGIN = 28          # css px of transparent breathing room around each block
RADIUS = 18          # css px corner radius on the exported card
SHADOW_BLUR = 14     # css px

SECTIONS = [
    ("what",   "01-what-it-is",            "What this is"),
    ("why",    "02-why",                   "Why we're doing this"),
    ("how",    "03-how-it-works",          "How it works"),
    ("rex",    "04-meet-rex",              "Meet Rex"),
    ("games",  "05-the-games",             "The games"),
    ("cast",   "06-the-cast",              "The cast"),
    ("show",   "07-the-show",              "The show"),
    ("venues", "08-venues",                "Venues"),
    ("money",  "09-where-the-money-goes",  "Where the money goes"),
    ("back",   "10-back-us",               "Back us"),
    ("john",   "11-ask-john",              "Ask John"),
]

# Prefer the locally built, fully self-contained preview (all art inlined as
# base64) over the live site: no server round-trip, no risk of exporting a stale
# deploy, and no same-origin image paths to break.
PREVIEW = os.path.join(HERE, "dist", "preview.html")
if os.path.exists(PREVIEW):
    URL = "file:///" + PREVIEW.replace("\\", "/")
else:
    URL = "https://playzoo.snapaweb.com/kickstarter"


def present(png_bytes):
    """Transparent margin + rounded corners + a soft drop shadow, so each block
    reads as a card on Kickstarter's white story background."""
    im = Image.open(__import__("io").BytesIO(png_bytes)).convert("RGBA")
    m, r, blur = MARGIN * SCALE, RADIUS * SCALE, SHADOW_BLUR * SCALE

    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.width - 1, im.height - 1], r, fill=255)
    im.putalpha(mask)

    out = Image.new("RGBA", (im.width + 2 * m, im.height + 2 * m), (0, 0, 0, 0))
    shadow = Image.new("RGBA", out.size, (0, 0, 0, 0))
    shadow.paste((0, 0, 0, 90), (m, m + blur // 2), mask)
    out = Image.alpha_composite(out, shadow.filter(ImageFilter.GaussianBlur(blur / 2)))
    out.paste(im, (m, m), im)
    return out


udd = tempfile.mkdtemp()
proc = subprocess.Popen([
    CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
    f"--remote-debugging-port={PORT}", "--remote-allow-origins=*",
    f"--user-data-dir={udd}", "--allow-file-access-from-files",
    f"--force-device-scale-factor={SCALE}",
    f"--window-size={WIDTH_CSS},1200", "about:blank",
])


def wait_ws():
    for _ in range(40):
        try:
            r = requests.get(f"http://localhost:{PORT}/json", timeout=1).json()
            pages = [t for t in r if t.get("type") == "page"]
            if pages:
                return pages[0]["webSocketDebuggerUrl"]
        except Exception:
            pass
        time.sleep(0.25)
    raise RuntimeError("no devtools")


try:
    ws = websocket.create_connection(wait_ws(), max_size=None)
    mid = [0]

    def cmd(method, params=None):
        mid[0] += 1
        i = mid[0]
        ws.send(json.dumps({"id": i, "method": method, "params": params or {}}))
        while True:
            m = json.loads(ws.recv())
            if m.get("id") == i:
                return m

    def ev(js):
        r = cmd("Runtime.evaluate", {"expression": js, "returnByValue": True})
        return r.get("result", {}).get("result", {}).get("value")

    cmd("Page.enable")
    cmd("Runtime.enable")
    cmd("Emulation.setDeviceMetricsOverride",
        {"width": WIDTH_CSS, "height": 1200, "deviceScaleFactor": SCALE, "mobile": False})
    cmd("Page.navigate", {"url": URL})
    time.sleep(5)

    # Scroll the whole page once to trigger lazy loading, then return to the top.
    total = ev("document.body.scrollHeight") or 6000
    y = 0
    while y < total:
        ev(f"window.scrollTo(0,{y})")
        time.sleep(0.4)
        y += 800
    ev("window.scrollTo(0,0)")
    time.sleep(2)

    # The sticky nav floats over the page and would land in a clip; hide it.
    ev("(function(){var h=document.querySelector('header');if(h)h.style.display='none';})()")
    time.sleep(0.5)

    text_parts = ["# PlayZoo -- Kickstarter story copy\n"]
    for sid, fname, title in SECTIONS:
        rect = ev(
            f"(function(){{var e=document.getElementById('{sid}');if(!e)return null;"
            f"var r=e.getBoundingClientRect();"
            f"return {{x:r.left+window.scrollX,y:r.top+window.scrollY,w:r.width,h:r.height}};}})()"
        )
        if not rect:
            print("MISSING", sid)
            continue
        x = max(0, rect["x"] - PAD_LR)
        y = max(0, rect["y"] - PAD_TOP)
        clip = {"x": x, "y": y,
                "width": rect["w"] + (rect["x"] - x) + PAD_LR,
                "height": rect["h"] + (rect["y"] - y) + PAD_BOT,
                "scale": 1}
        shot = cmd("Page.captureScreenshot",
                   {"format": "png", "clip": clip, "captureBeyondViewport": True})
        data = shot.get("result", {}).get("data")
        if data:
            img = present(base64.b64decode(data))
            img.save(os.path.join(OUT, fname + ".png"))
            print(f"saved {fname}.png  {img.width}x{img.height}px "
                  f"({int(rect['w'])}x{int(rect['h'])} css)")
        txt = ev(f"(function(){{var e=document.getElementById('{sid}');return e?e.innerText:'';}})()") or ""
        text_parts.append(f"\n\n===== {title} =====\n\n{txt.strip()}")

    open(os.path.join(OUT, "kickstarter-copy.txt"), "w", encoding="utf-8").write("\n".join(text_parts))
    print("saved kickstarter-copy.txt")
    print("OUT:", OUT)
finally:
    proc.terminate()
