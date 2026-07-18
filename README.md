# 🚢 Ocean Cruiser

A tiny sample browser game: steer a cruise ship across the open ocean, dodge icebergs, rocks and storms, and rescue passengers / collect treasure for points. No build step, no dependencies — just HTML, CSS and vanilla JavaScript running on an HTML5 `<canvas>`.

## Play it

**Live demo (GitHub Pages):** enable once under *Settings → Pages → Source: GitHub Actions* on this repo (see below), then the game is live at:

```
https://<your-username>.github.io/<repo-name>/
```

A GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) automatically builds and deploys the site to GitHub Pages on every push to `main` or this branch — nothing to install.

### One-time setup to turn on the live link

1. Go to the repo on GitHub → **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push (or re-run) the workflow — the **Deploy Ocean Cruiser to GitHub Pages** action will publish the site and print the live URL in its summary / the *Actions* tab.

Once that's done, the link above works for anyone you share it with — no cloning or local setup required.

## Run it locally

No build tools needed — just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Controls

- **Move:** Arrow keys / WASD, or click-drag / touch-drag the ship
- **Pause:** `P`
- Dodge 🧊 icebergs, 🪨 rocks and 🌀 storms (they cost a life)
- Collect 🛟 life rings, 💰 treasure and 🧑 passengers for points
- Speed and spawn rate ramp up the longer you survive
- Your best score is saved locally in the browser (`localStorage`)

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure, HUD, start/game-over overlay |
| `style.css` | Styling and layout |
| `game.js` | Game loop, physics, spawning, collisions, rendering |
| `.github/workflows/deploy-pages.yml` | Auto-deploys the static site to GitHub Pages |

This is a sample project meant to be easy to read, tweak and share.
