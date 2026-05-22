# Respire — Claude Code instructions

## Git workflow

Never commit directly to `master`. All changes go through a PR:

1. Create a feature branch: `git checkout -b <short-kebab-description>`
2. Commit work to that branch
3. Push: `git push -u origin <branch>`
4. Open a PR targeting `master` with `gh pr create`
5. Review, then merge with `gh pr merge --squash` (or `--merge` if squash isn't appropriate)

Branch names: short and descriptive, e.g. `fix-slider-scroll`, `add-vocal-guidance`, `update-defaults`.
