# Answer Number and Navigation Consistency

## User request

Fix Reading answer fields so the question number is centered while empty and
disappears after the learner enters an answer. Also make the Previous and Next
arrow buttons equal and larger.

## Scope

- Audit numbered text and matching answer slots used by Reading questions.
- Center empty-state numbers and hide them whenever an answer is present.
- Standardize the main Reading Previous and Next arrow button dimensions.

## Files changed

- `frontend/src/components/reading/StatementMatchingPanel.tsx` — centers
  Matching Features numbers in empty boxes and removes them after input.
- `frontend/src/components/reading/ListMatchingPanel.tsx` — applies the same
  empty-number behavior to legacy boxed list/classification answers.
- `frontend/src/components/reading/NoteCompletionGaps.tsx` — standardizes
  numbered note and summary gaps.
- `frontend/src/components/reading/TableCompletionPanel.tsx` — standardizes
  numbered table gaps.
- `frontend/src/components/reading/DiagramLabelCompletionPanel.tsx` —
  standardizes numbered diagram-label boxes and removes the duplicate number.
- `frontend/src/components/reading/SentenceEndingMatchingPanel.tsx` — shows the
  question number only while the drop zone is empty.
- `frontend/src/pages/tests/IELTSExamPage.tsx` — standardizes flow-chart gaps and
  enlarges both main Reading navigation buttons to matching 56-by-56-pixel
  controls.
- `frontend/src/pages/tests/ReadingTestPage.tsx` — applies the same flow-chart
  and sentence-ending empty-number behavior to the standalone Reading page.
- `docs/task-logs/2026-07-25-answer-number-and-navigation-consistency.md` —
  records implementation and validation.

## Validation

- Production frontend build passed (`npm.cmd run build`).
- Browser checks confirmed Matching Features, Note Completion, Table
  Completion, Flow-chart Completion, and Diagram Label Completion numbers
  disappear immediately after an answer is entered.
- Browser measurement confirmed both navigation buttons are 56 by 56 pixels.
  At the first question, Previous is grey and disabled while Next is black and
  enabled.
- Browser console reported no errors during the checks.
- `git diff --check` passed; only existing line-ending warnings were reported.

## Known limitations or follow-up work

- Changes are local and require a separate commit, push, and deployment when
  requested.

## Final status

Completed.
