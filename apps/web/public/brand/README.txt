Brand assets for Frendz & Foes.

Drop your image files here (this folder is served at /brand/... by the app).

Needed:
  brain.png   <- the colorful brain + lightbulb artwork (used as the hero on the
                 Home and Display title screens). Transparent PNG looks best.

Optional (the app already recreates these in code, but a file here overrides):
  logo.png    <- a full "FRENDZ AND FOES" wordmark, if you have one assembled.

After adding brain.png, rebuild/redeploy (git push) — the hero image appears
automatically. If the file is missing, the app falls back to the styled logo.
