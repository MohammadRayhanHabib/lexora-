# Mock Reading UI

## Purpose

The mock-exam Reading workspace provides an IELTS computer-test-style interface while keeping test content, question configuration, answers, autosave, and submission connected to the existing backend APIs.

This implementation is a visual and interaction layer. It does not introduce a separate content source, scoring engine, or database schema.

## Runtime files

The initial UI refresh updated the exam page and completion-gap component. The later question-pattern coverage adds one reusable Reading component and extends the existing authoring and type contracts.

| File | Responsibility | Changes |
| --- | --- | --- |
| `frontend/src/pages/tests/IELTSExamPage.tsx` | Full mock-exam runner | Reworked the Reading section into a two-pane workspace; added part instructions, passage and question scrolling, a resizable divider, grouped question rendering, previous/next controls, part-based question navigation, answered and flagged states, matching-headings drag and drop, and passage selection actions for notes and highlights. |
| `frontend/src/components/reading/NoteCompletionGaps.tsx` | Note and summary completion inputs | Keeps the question number visible while a gap is empty, hides it after an answer is entered, and centers the entered value without changing the answer-array contract. |
| `frontend/src/components/reading/SentenceEndingMatchingPanel.tsx` | Matching sentence endings | New reusable stems-and-endings interface with drag/drop, click placement, keyboard-accessible controls, distractors, moving answers, and clearing answers. |
| `frontend/src/api/reading.ts` | Frontend Reading contract | Adds the `title_subtitle_finding` type and its display label. |
| `backend/src/entities/ReadingQuestion.ts` | Backend Reading contract | Accepts and stores the new `title_subtitle_finding` wire value. |
| `frontend/src/pages/admin/reading/ReadingQuestionFormFields.tsx` | Question authoring | Adds Title/Subtitle Finding, keeps sentence-ending answer arrays aligned with stems, and makes the Summary clue list optional. |
| `frontend/src/pages/admin/reading/AdminReadingPreview.tsx` | Admin preview | Previews Title/Subtitle options and Summary clue lists. |
| `frontend/src/pages/tests/ReadingTestPage.tsx` | Standalone Reading runner | Uses the same Title/Subtitle type and Summary clue-list behavior outside the full mock exam. |

## Integration and call flow

```text
App.tsx
└── ProtectedRoute: /exam/:examId
    └── IELTSExamPage
        ├── ReadingSection (only while section === "reading")
        │   ├── ReadingHeadingBank
        │   ├── ReadingHeadingDropZone
        │   ├── SentenceEndingMatchingPanel
        │   ├── CompactReadingQuestion
        │   └── NoteCompletionGaps
        └── ReadingBottomNav (only while Reading has questions)
```

| Caller | Callee | Condition or purpose |
| --- | --- | --- |
| `frontend/src/App.tsx` | `IELTSExamPage` | The protected `/exam/:examId` route opens the full-screen mock exam. |
| `IELTSExamPage` | `ReadingSection` | Rendered when the active exam section is `reading` and Reading parts have loaded. |
| `IELTSExamPage` | `ReadingBottomNav` | Rendered only for Reading when at least one Reading question exists. |
| `ReadingSection` | `ReadingHeadingBank` | Rendered for a matching-headings question with a non-empty backend `wordBank`. |
| `ReadingSection` | `ReadingHeadingDropZone` | Rendered beside each derived passage section for matching-headings placement. |
| `ReadingSection` | `SentenceEndingMatchingPanel` | Rendered for `matching_sentence_endings`; `options` provide stems and `wordBank` provides the lettered endings. |
| `ReadingSection` | `CompactReadingQuestion` | Renders compatible supplementary questions from the active Reading part. |
| `ReadingSection` | `NoteCompletionGaps` | Renders note completion, summary completion, and compatible short-answer gap groups. |

The heading bank, drop zone, compact question renderer, Reading section, and bottom navigation are local components inside `IELTSExamPage.tsx`. `NoteCompletionGaps` is the only imported Reading component changed by this refresh.

## Non-Reading impact

No dedicated Listening, Writing, Speaking, backend, database, or API source file was changed for this Reading UI refresh.

`IELTSExamPage.tsx` is shared by the complete mock exam. Its top exam header and common action-button presentation were updated alongside the Reading workspace, so those shared visual changes are also visible while the candidate is in Listening, Writing, or Speaking. Section-specific behavior remains conditional: Reading annotations, Reading flags, `ReadingSection`, and `ReadingBottomNav` render only during Reading. The existing Listening, Writing, and Speaking component flows were not replaced.

After Reading submission, the existing flow still submits each Reading attempt, updates the parent mock attempt, and continues to Writing.

## Data flow

The page continues to use backend-provided mock-exam and Reading data:

- `mockExamApi.getExam()` loads the mock-exam configuration.
- `readingApi.getTest()` loads each Reading passage and its student-safe questions.
- `readingApi.startAttempt()` creates or resumes an attempt for each Reading part.
- `readingApi.autoSave()` saves entered answers every 30 seconds.
- Existing Reading submission APIs calculate and return the result; the UI does not score answers locally.

The Reading interface renders passage fields such as `passageTitle`, `passageContent`, and `passageImage`. Question instructions, options, word banks, and input values come from the existing Reading question payload.

## Interaction details

### Matching headings

- Heading text is rendered from the question `wordBank`.
- Passage slots are derived from the question `options` count and distributed across passage sections.
- Empty slots show their question number.
- A heading can be dragged to a slot or selected and placed with a click.
- Once placed, the slot displays only the heading text; the empty-state number is hidden.
- A placed heading can be cleared or moved to another slot.
- Answers remain in the existing `string[]` answer shape.

### Matching sentence endings

- Sentence stems come from `options`; lettered endings and distractors come from `wordBank`.
- Students can drag an ending, select it and click a slot, move it to another stem, or clear it.
- Each ending can be used once and answers are stored as an ordered `string[]` of letters.

### Summary completion

- `summary_completion` supports both variants without changing existing records.
- A non-empty `wordBank` renders an A/B/C clue list above the summary.
- An empty `wordBank` keeps the existing without-clue input layout.
- Correct answers continue to use the ordered gap-answer array and existing backend scoring.

### Title or subtitle finding

- The dedicated wire value is `title_subtitle_finding`.
- Admins configure the title/subtitle choices in `options` and select one correct answer.
- The mock and standalone Reading runners display the choices as a single-answer lettered question.

### Passage annotations

- Selecting passage text opens a compact Note/Highlight toolbar near the selection.
- Highlight applies a visual mark to the selected passage range.
- Note stores the selected range with optional note text and exposes that text as the mark title.
- Annotation state is scoped to the active Reading part.

### Navigation and accessibility

- The divider supports pointer resizing, keyboard arrow resizing, and double-click reset.
- Question navigation reports active, answered, and flagged states.
- Review flags are available from both the active question and the bottom navigation.
- Previous and next buttons respect the first and last question boundaries.

## Scope boundaries

- Passage notes, highlights, and review flags currently live in page state and are not persisted by the backend.
- Passage splitting for matching-headings slots is based on HTML block structure; clean semantic passage markup produces the best placement.
- The UI follows the supplied references for layout and behavior but does not use IELTS branding assets or copy an official product implementation.

## Validation

- TypeScript project build: passed.
- Staged whitespace check: passed.
- Backend storage schema remains unchanged; the Reading question enum accepts the new title/subtitle value.
