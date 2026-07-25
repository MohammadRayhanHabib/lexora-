# Reading Navigation Arrow Shape

## User request

Match the Reading Previous and Next arrow shapes to the supplied reference.

## Scope

- Replace chevron-only icons with full arrows that include a horizontal stem.
- Keep both 64-by-64-pixel navigation buttons and their existing colour states.
- Validate the client-preview rendering.

## Files changed

- `frontend/src/pages/tests/IELTSExamPage.tsx` — replaces the chevrons with
  heavier 32-by-32-pixel Feather left/right arrows.
- `docs/task-logs/2026-07-25-reading-navigation-arrow-shape.md` — records the
  implementation and validation.

## Validation

- Frontend production build passed (`npm.cmd run build`).
- The production build was opened on temporary local port `3113`.
- Visual browser inspection confirmed both controls use full arrows with
  horizontal stems, matching the supplied reference rather than chevrons.
- Both buttons remained 64 by 64 pixels; the arrows measured 32 by 32 pixels
  with a 3.5-pixel rounded stroke.
- No browser console errors were reported.

## Known limitations or follow-up work

- Changes are local until separately committed, pushed, and deployed.
- Docker configuration is explicitly outside this task.

## Final status

Completed.
