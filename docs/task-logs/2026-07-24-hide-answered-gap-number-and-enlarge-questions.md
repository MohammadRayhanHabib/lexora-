# Hide Answered Gap Number and Enlarge Questions

## User request

Hide a completion gap's question number after the user enters an answer and
increase the Reading client-preview question font size by one step.

## Scope

- Update numbered Note and Summary Completion answer boxes.
- Increase client-showcase question, instruction, option, and answer text.
- Keep passage typography and backend-provided question data unchanged.

## Files changed

- `frontend/src/components/reading/NoteCompletionGaps.tsx` — conditionally hides
  a gap number when its input contains an answer and respects the configured
  line/input text size.
- `frontend/src/pages/tests/IELTSExamPage.tsx` — applies one-step-larger
  typography to client-showcase question content.
- `docs/task-logs/2026-07-24-hide-answered-gap-number-and-enlarge-questions.md`
  — records this implementation task.

## Validation

- TypeScript project build completed successfully with `tsc -b`.
- Docker production frontend build completed successfully.
- Local Summary Completion interaction confirmed the number disappears after
  typing and returns when the answer is emptied.
- Browser style inspection confirmed the question body increased from the
  standard 16 px reading size to 18 px in the client showcase.
- The removed `Clear answer` control remains absent.

## Known limitations or follow-up work

- The public Cloudflare Pages preview requires a separate direct deployment.

## Final status

Implemented and locally validated; ready for the next public direct deployment.
