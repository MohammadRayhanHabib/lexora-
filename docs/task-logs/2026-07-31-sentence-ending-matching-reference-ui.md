# Sentence-Ending Matching Reference UI

## User request

Update R-05 Sentence-Ending Matching in the Reading client preview to match the
supplied reference.

## Scope

- Display Questions 7-9 and the two reference instruction lines.
- Show three sentence stems with inline dashed numbered drop gaps.
- Show six bordered A-F draggable sentence endings below the gaps.
- Keep the shared production/default component appearance unchanged.

## Files changed

- `frontend/src/components/reading/SentenceEndingMatchingPanel.tsx`
  - Added a reference visual variant with compact inline gaps, larger A-F ending
    cards, and an optional functional bookmark.
  - Made completed reference gaps expand to the available width so the selected
    ending remains readable instead of wrapping inside the original number box.
  - Added two-way drag and drop: an ending can move from the bank into a gap,
    between gaps, or from a completed gap back into the ending bank.
  - Matched a completed gap to the original option card exactly: the same
    letter, text, solid border, white background, padding, and content width are
    preserved while it is placed.
  - Expanded the return drop zone to include the full whitespace above and
    around the remaining options, and kept a minimum target height when the bank
    becomes empty.
- `frontend/src/pages/tests/IELTSExamPage.tsx`
  - Routed only R-05 client preview through the reference instructions,
    numbering, full-width wrapper, bookmark, and component variant.
  - Restored the client-facing `R-05 · Sentence-Ending Matching` question-type
    card above the reference layout.
- `frontend/src/data/readingPart1Showcase.ts`
  - Replaced R-05 preview content with the three stems and six endings from the
    reference.

## Validation

- Frontend production build completed successfully.
- The running client-preview route returned HTTP 200.
- `git diff --check` passed for all implementation files and this log.

## Known limitations or follow-up

- The reference numbering and text are temporary client-preview data and are not
  supplied by the backend.

## Final status

Completed, including the question-type card, readable completed gaps, and
two-way drag-and-drop behavior.
