# List Matching Official Layout

## User request

Update the Reading R-01 List Matching question so its layout follows the
provided IELTS-style reference.

## Scope

- Show numbered statements with compact letter-answer lines.
- Show the A–G answer bank as a simple bordered vertical list.
- Preserve typed-letter and drag-and-drop interactions.
- Keep Classification and the other Reading question types unchanged.

## Files changed

- `frontend/src/components/reading/ListMatchingPanel.tsx` adds the dedicated
  List Matching presentation.
- `frontend/src/pages/tests/IELTSExamPage.tsx` shows the List Matching prompt.
- `frontend/src/pages/tests/ReadingTestPage.tsx` keeps the same prompt behavior
  in the standalone Reading test.
- `frontend/src/data/readingPart1Showcase.ts` updates the R-01 preview wording.
- This task log records the implementation and validation.

## Validation

- `npm.cmd run build` completed successfully.
- Opened the production build on temporary local port `3111`.
- Verified R-01 renders five numbered statements with individual underlined
  letter inputs and a solid bordered vertical A–G option list.
- Entered `B` in Question 1 and confirmed the controlled answer value and
  answer styling update correctly.
- Confirmed the page produced no browser console errors.
- A focused ESLint command could not run because ESLint is not included in the
  locked frontend dependencies; TypeScript and Vite build validation passed.

## Known limitations or follow-up work

- The updated UI is local only until it is committed, pushed, and deployed.

## Final status

Completed.
