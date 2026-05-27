# Respire — Claude Code instructions

## Git workflow

Never commit directly to `master`. All changes go through a PR:

1. Create a feature branch: `git checkout -b <short-kebab-description>`
2. Commit work to that branch
3. **Before pushing:** run `node --check app.js` — a syntax error breaks the live site instantly (GitHub Pages, no CI gate)
4. Push: `git push -u origin <branch>`
5. Open a PR targeting `master` with `gh pr create`
6. Review the diff, then merge with `gh pr merge --squash`

Branch names: short and descriptive, e.g. `fix-slider-scroll`, `add-vocal-guidance`, `update-defaults`

## Local testing

A local server can be started for manual testing before pushing:

```bash
cd ~/repos/respire && python3 -m http.server 9876
```

Smoke-test the running app with headless Chrome:

```bash
google-chrome --headless=new --no-sandbox --disable-gpu \
  --virtual-time-budget=3000 --dump-dom http://localhost:9876/ \
  | grep -q 'data-theme' && echo 'PASS' || echo 'FAIL: JS did not initialise'
```

## Deployment

The site is served via **GitHub Pages** from the `master` branch root.  
Live URL: `https://martynjj.github.io/respire/`  
Deploys automatically on every push to `master` (~30 s propagation).  
There is no CI — a bad merge goes live immediately.
