# Reading note-completion reference UI

- **User request:** Update the Reading client-preview R-06 Note Completion screen to match the supplied IELTS-style reference.
- **Scope:** Client-preview R-06 content, numbering, instructions, structural headings, bullets, and inline answer fields; preserve general mock-test behavior.
- **Files changed:**
  - `frontend/src/api/reading.ts` skips structural note headings when counting gaps.
  - `frontend/src/components/reading/NoteCompletionGaps.tsx` adds an official-style note layout with theme-compatible numbered inputs.
  - `frontend/src/data/readingPart1Showcase.ts` supplies the seven-gap Finland note example.
  - `frontend/src/pages/tests/IELTSExamPage.tsx` wires the R-06-only Questions 7-13 header, instructions, count, and layout.
- **Validation:** `npm.cmd run build` passed with 2,614 modules transformed. The generated bundle contains the new R-06 assets.
- **Known limitations:** Automated browser screenshot verification was unavailable because the browser runtime hit a Windows sandbox ACL error; the production build completed successfully.
- **Status:** Implemented and validated; live deployment is being published through the connected main branch.
