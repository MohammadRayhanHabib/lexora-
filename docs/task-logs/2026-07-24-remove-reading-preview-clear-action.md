# Remove Reading Preview Clear Action

## User request

Remove the `Clear answer` control from the client-facing Reading preview.

## Scope

- Hide the shared clear-answer action only for the dedicated client showcase.
- Preserve the existing behaviour for backend-driven Reading mock tests.

## Files changed

- `frontend/src/pages/tests/IELTSExamPage.tsx` — prevents the clear-answer control
  from rendering when the active test is the client Reading showcase.
- `docs/task-logs/2026-07-24-remove-reading-preview-clear-action.md` — records
  this implementation task.

## Validation

- TypeScript project build completed successfully with `tsc -b`.
- Docker production frontend build completed successfully.
- Local client-preview interaction was checked after entering an answer; the
  `Clear answer` control was absent.

## Known limitations or follow-up work

- The dedicated Cloudflare Pages preview uses direct uploads, so future changes
  still require a new deployment.

## Final status

Implemented and locally validated; ready for deployment.
