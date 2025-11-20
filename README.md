# github-flow-TicTacToe

Vanilla HTML/CSS/JavaScript Tic-Tac-Toe demo built with a simple GitHub Flow:
use short-lived feature branches → PR → review → merge to `main`.  
This repo is designed as a small demo to show front-end coding, branching and basic UX polish.

## Live demo
You can deploy via GitHub Pages (Settings → Pages → Source: `main` / root) after merging to `main`.

## Features
- 3×3 TicTacToe board (X / O)
- Keyboard support (keys `1`..`9`)
- Simple AI (optional toggle)
- Reset with animated board refresh
- Accessibility: `aria-live`, `role="grid"`/`gridcell` and focus styles
- Animations & sound polish (place/win/reset) — branch: `feature/ux-sound`

## Files
- `index.html` — markup and controls
- `style.css` — styles + animations
- `script.js` — game logic, animations trigger, WebAudio-based sound
- `.gitignore`, `README.md`

