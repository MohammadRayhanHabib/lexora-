# Reading question-pattern coverage

- **Request:** Add the missing Reading patterns to the full mock exam: Matching Sentence Endings, Summary Completion with clues, and Title or Subtitle Finding.
- **Scope:** Reading question contracts, admin authoring and preview, mock/standalone Reading rendering, and implementation documentation. No database migration or non-Reading module change.
- **Changes:** Added `title_subtitle_finding`; added a reusable sentence-ending matching panel; connected optional Summary clue lists; synchronized sentence-ending answer arrays in the admin form; updated previews and Reading runners.
- **Validation:** Frontend TypeScript compilation and repository whitespace checks passed; frontend/backend enum parity was verified; clean backend and frontend Docker builds passed; all four Compose services started; backend, MongoDB, and Redis reported healthy; frontend `/` and backend `/health` returned HTTP 200.
- **Limitations:** Existing `summary_completion` records remain compatible; clue mode is selected by providing a non-empty `wordBank`.
- **Status:** Completed and running in Docker.
