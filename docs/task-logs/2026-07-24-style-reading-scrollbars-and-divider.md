# Style Reading Scrollbars and Divider

## User request

Make the Reading client-preview scrollbars and center resize control resemble
the supplied IELTSMate reference.

## Scope

- Add square, high-contrast scrollbars to both Reading preview panels.
- Refine the center divider rail and resize handle.
- Keep global site scrollbars and backend-driven mock tests unchanged.

## Files changed

- `frontend/src/pages/tests/IELTSExamPage.tsx` — scopes the new scrollbar class
  to the client showcase and applies the reference-style divider/handle.
- `frontend/src/index.css` — defines the square grey preview scrollbar track,
  thumb, hover state, and Firefox colours.
- `docs/task-logs/2026-07-24-style-reading-scrollbars-and-divider.md` — records
  this implementation task.

## Validation

- TypeScript project build completed successfully with `tsc -b`.
- Docker production frontend build completed successfully.
- Local browser inspection confirmed both Reading panels use the scoped
  scrollbar class.
- Computed-style validation confirmed a 14 px scrollbar, square 0 px-radius
  dark-grey thumb, light-grey track, and a 32 × 32 px white resize handle with
  a one-pixel dark border.
- Keyboard resizing and double-click reset remained functional.
- Visual review confirmed the controls align with the supplied reference.

## Known limitations or follow-up work

- Native scrollbar rendering can vary slightly between operating systems.
- The public Cloudflare Pages preview requires a separate direct deployment.

## Final status

Implemented and locally validated; ready for the next public direct deployment.
