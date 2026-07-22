# Frontend Practice UI — Senior Developer Handoff

## Request and scope

The frontend task was to build the Cambridge Section Practice and Mock Practice
interfaces without changing backend code.

This document replaces the previous detailed task logs. It explains:

- which frontend files were added or modified;
- where each component is called;
- how Section and Mock Practice differ;
- what is reusable;
- what still needs backend integration.

## Quick result

- **Section Practice:** students can open Listening, Reading, Writing, or
  Speaking individually. A Section full-test preview is also available.
- **Mock Practice:** the catalog uses the same visual layout, but module rows are
  display-only. Clicking a test card starts the complete sequence:
  Listening → Reading → Writing → Speaking.
- Both modes reuse the same exam header and module UI components.
- Current test content and progress are frontend fixtures/browser-local data.

## Component call flow

```text
App.tsx
└── /practice/:slug
    └── EnrolledPracticePage
        ├── SectionPracticeBoard
        │   └── /practice/:slug/section/:testId/:module
        │       └── SectionPracticeWorkspacePage
        │           ├── PracticeExamShell
        │           └── PracticeModuleWorkspace
        │
        └── MockPracticeBoard
            └── /practice/:slug/mock/:testId
                └── MockPracticeWorkspacePage
                    ├── PracticeExamShell
                    └── PracticeModuleWorkspace

PracticeModuleWorkspace
├── ListeningPracticeUI
├── ReadingPracticeUI
├── WritingPracticeUI
└── SpeakingPracticeUI
```

## Existing files modified

| File | Change |
| --- | --- |
| `frontend/src/App.tsx` | Registers the protected Section and Mock full-screen routes. |
| `frontend/src/pages/practice/EnrolledPracticePage.tsx` | Calls `SectionPracticeBoard` or `MockPracticeBoard` based on the selected tab. Section shows module filters; Mock hides them. |
| `frontend/src/index.css` | Adds scoped small/large typography rules for readable exam content controlled from the shared practice menu. |
| `frontend/.dockerignore` | Corrects ignore patterns so the Docker frontend build receives the required source files. |
| `frontend/tsconfig.tsbuildinfo` | Generated TypeScript build metadata only; no application logic. |

## New pages

### `frontend/src/pages/practice/SectionPracticeWorkspacePage.tsx`

- Called by the Section route in `App.tsx`.
- Checks Cam Official Book enrollment.
- Owns the Section timer, pause state, submit/save dialogs, and module progress.
- Renders `PracticeExamShell` and `PracticeModuleWorkspace`.

### `frontend/src/pages/practice/MockPracticeWorkspacePage.tsx`

- Called by the Mock route in `App.tsx`.
- Checks Cam Official Book enrollment.
- Owns one full-test timer and forces the IELTS module order.
- Submit advances to the next module; Save & Exit stores browser-local progress.
- Renders the same `PracticeExamShell` and `PracticeModuleWorkspace` used by
  Section Practice.

## New catalog components

### `frontend/src/components/practice/section-practice/SectionPracticeBoard.tsx`

- Called from `EnrolledPracticePage.tsx` when the Section tab is active.
- Shows Cambridge Academic 20, 19, and 18 test groups.
- Module rows are buttons, so modules can be opened individually.
- Also contains the Section full-test confirmation action.

### `frontend/src/components/practice/section-practice/MockPracticeBoard.tsx`

- Called from `EnrolledPracticePage.tsx` when the Mock tab is active.
- Uses the same purple grouped/compact test-card design as Section Practice.
- Module rows are not individual buttons.
- The complete test card is one Start/Continue/Retake full-mock action.

## Shared exam components

### `frontend/src/components/practice/section-practice/PracticeExamShell.tsx`

Shared by both workspace pages. It provides:

- Lexora Academy logo;
- full-test timer;
- Pause, Submit, Save & Exit, and menu controls;
- full-test module progress;
- pause overlay;
- persistent `A− / A / A+` question-text controls.

The latest control alignment matches the supplied close-up references: Pause
and Save & Exit use warm cream pills with asymmetric upper highlights, Submit
uses a glossy red reflection plus a lighter lower-right finish, and the closed
menu uses three custom black horizontal lines. The action text prefers a rounded
system font. The timer uses a wide black gradient capsule, clean white digits,
and a custom two-oval separator instead of a font-dependent colon. Because this
is the shared shell, the adjustment appears in every Section and Mock workspace.
The font-size choice is saved in browser `localStorage`. Marked Reading,
Listening, Writing, and Speaking question content responds immediately; `A`
keeps the original component typography.

### `frontend/src/components/practice/section-practice/PracticeModuleWorkspace.tsx`

Shared module switcher. The parent page passes a module name and this component
renders the matching UI:

```tsx
<PracticeModuleWorkspace module="reading" />
```

It calls:

- `ListeningPracticeUI.tsx`
- `ReadingPracticeUI.tsx`
- `WritingPracticeUI.tsx`
- `SpeakingPracticeUI.tsx`

## Module UI files

| Component | Main frontend responsibility |
| --- | --- |
| `ListeningPracticeUI.tsx` | Audio preview controls, answer table, input fields, and question navigator. |
| `ReadingPracticeUI.tsx` | Split passage/question panes, answer options, layered peach previous/next controls with thick long-stem arrows, Q1–Q10 navigator, confidence and connection controls. |
| `WritingPracticeUI.tsx` | Task switching, prompt/diagram panel, essay input, and word counter. |
| `SpeakingPracticeUI.tsx` | Speaking parts, prompt player, examiner view, waveform, and recording-state simulation. |

`ReadingPracticeUI` already accepts typed content through props. The other three
module components currently contain their preview content internally.

## Data and browser progress files

### `frontend/src/components/practice/section-practice/sectionPracticeData.ts`

- Shared module types and metadata.
- Cambridge 20, 19, and 18 fixture test sets.
- Section Practice browser-local progress helpers.

### `frontend/src/components/practice/section-practice/mockPracticeData.ts`

- Separate Mock Practice attempt/progress model.
- Total mock duration calculation.
- Current module, completed modules, remaining timer, and resume helpers.

## Routes added

```text
/practice/:slug/section/:testId/:module
/practice/:slug/mock/:testId
```

Both routes use the existing `ProtectedRoute` and check active Cam Official Book
enrollment inside the workspace page.

## Section vs Mock behavior

| Behavior | Section Practice | Mock Practice |
| --- | --- | --- |
| Same catalog design | Yes | Yes |
| Module filter | Yes | No |
| Open one module | Yes | No |
| Full sequence | Optional preview | Required |
| Shared module UI | Yes | Yes |
| Progress storage | Browser local | Browser local |

## Backend integration notes

No backend, API client, MongoDB, or Redis code was changed.

When backend APIs are ready, the frontend will need:

1. catalog/test-content endpoints to replace fixture data;
2. create/resume attempt endpoints;
3. save-answer endpoints for each module;
4. module-submit and final mock-submit endpoints;
5. server-side timer/progress as the source of truth;
6. result/score endpoints.

The catalog components, `PracticeExamShell`, `PracticeModuleWorkspace`, and the
four module layouts can remain as the presentation layer.

## Validation completed

- TypeScript project build: passed.
- Docker frontend production build: passed.
- Docker frontend container restart: passed.
- `localhost:3000` and the frontend practice routes: HTTP 200.
- Backend, MongoDB, and Redis containers remained healthy.

Latest shared-control task validation:

- User request: align the Pause, Submit, Save & Exit, menu, timer, and Reading
  previous/next controls with the supplied references.
- Scope: `PracticeExamShell.tsx` and `ReadingPracticeUI.tsx` styling only; no
  interaction or backend change.
- TypeScript project build: passed.
- Docker frontend production build and restart: passed.
- Frontend health check: HTTP 200.
- Status: completed.

Latest question-font task validation:

- User request: allow students to increase question text from the shared menu.
- Scope: shared menu state, scoped typography rules, and readable question-copy
  markers in all four module UI files.
- TypeScript project build: passed.
- Docker frontend production build and restart: passed.
- Frontend health check: HTTP 200.
- Known limitation: the preference is browser-local until user display settings
  are backed by an API.
- Status: completed.

## Latest action-button reference task

- **User request:** make the shared Pause, Submit, and Save & Exit controls
  match the supplied close-up reference.
- **Scope:** frontend presentation only. Button click behavior, exam state, routes,
  API code, and backend services were not changed.
- **Files changed:**
  - `frontend/src/components/practice/section-practice/PracticeExamShell.tsx`:
    added reusable cream/red surface layers and adjusted the pill proportions,
    gradients, rounded font treatment, asymmetric highlights, shadows, and
    responsive widths. Since this shell is shared, Section and Mock Practice
    receive the same update.
  - `docs/task-logs/2026-07-18-frontend-practice-handoff.md`: recorded this
    implementation and validation result.
- **Validation:** targeted TypeScript build passed; Docker frontend production
  build passed; the frontend container was recreated and remains up; the served
  CSS contains the new face gradients and 13% inset rule; `localhost:3000`
  returned HTTP 200.
- **Known limitation:** the protected workspace redirected an anonymous browser
  check to Login, so an authenticated workspace screenshot was not captured in
  this task. The compiled styling and running build were verified directly.
- **Status:** completed.

## Latest practice-card sizing task

- **User request:** increase the test-card height and typography so the
  Cambridge catalog feels less cramped.
- **Scope:** Section and Mock Practice catalog presentation only; routing,
  progress behavior, test actions, and backend code were unchanged.
- **Files changed:**
  - `frontend/src/components/practice/section-practice/SectionPracticeBoard.tsx`:
    increased the group padding, left summary width/type, test header height,
    module-row height, icons, typography, and spacing between cards.
  - `frontend/src/components/practice/section-practice/MockPracticeBoard.tsx`:
    applied the same sizing and spacing system to full Mock Practice cards.
  - `docs/task-logs/2026-07-18-frontend-practice-handoff.md`: recorded this task.
- **Validation:** TypeScript build passed; Docker frontend production build
  passed; the frontend container was recreated; `localhost:3000` returned
  HTTP 200.
- **Known limitation:** sizing was tuned for the existing responsive grid; final
  visual preference may still be adjusted after product review.
- **Status:** completed.

## Latest restored button-offset task

- **User request:** restore the previous asymmetric button-layer placement and
  reduce the visibility of the extra background.
- **Scope:** shared exam-header button presentation only; interactions and
  backend code were unchanged.
- **Files changed:**
  - `frontend/src/components/practice/section-practice/PracticeExamShell.tsx`:
    restored the earlier right-shifted cream/red face placement, reduced the
    cream outer-layer alpha to 62%, reduced the red outer-layer alpha to 70%,
    and softened both outer shadows.
  - `docs/task-logs/2026-07-18-frontend-practice-handoff.md`: recorded this task.
- **Validation:** TypeScript build passed; Docker frontend production build
  passed; the frontend container was recreated; `localhost:3000` returned
  HTTP 200.
- **Known limitation:** exact color blending depends on the header background
  beneath the translucent outer layer.
- **Status:** completed.

## Latest Mock Practice confirmation task

- **User request:** show the full-test confirmation popup in Mock Practice when
  a test card is clicked and darken the catalog behind the popup.
- **Scope:** Mock Practice start/continue confirmation and shared popup
  presentation only; test execution and backend code were unchanged.
- **Files changed:**
  - `frontend/src/components/practice/section-practice/FullPracticeTestModal.tsx`:
    added a reusable full-test confirmation dialog with module durations,
    estimated total time, Cancel/close actions, a confirm action, and a 60%
    dark backdrop.
  - `frontend/src/components/practice/section-practice/MockPracticeBoard.tsx`:
    changed test-card clicks to select a test and open the confirmation dialog;
    the Mock route now opens only after the user confirms.
  - `frontend/src/components/practice/section-practice/SectionPracticeBoard.tsx`:
    replaced its local popup copy with the new shared dialog while preserving
    existing Section behavior.
  - `docs/task-logs/2026-07-18-frontend-practice-handoff.md`: recorded this task.
- **Validation:** TypeScript build passed; Docker frontend production build
  passed; the frontend container was recreated; `localhost:3000` returned
  HTTP 200.
- **Known limitation:** Mock attempt status is still sourced from browser-local
  fixture progress until backend attempt APIs are connected.
- **Status:** completed.

## Latest Mock test-title pill task

- **User request:** add a small transparent black background behind each Mock
  Practice test title.
- **Scope:** Mock Practice title styling only; Section Practice, click behavior,
  modal flow, and backend code were unchanged.
- **Files changed:**
  - `frontend/src/components/practice/section-practice/MockPracticeBoard.tsx`:
    wrapped each test title in a compact rounded pill with 30% black fill,
    white text, and a subtle shadow.
  - `docs/task-logs/2026-07-18-frontend-practice-handoff.md`: recorded this task.
- **Validation:** TypeScript build passed; Docker frontend production build
  passed; the frontend container was recreated; `localhost:3000` returned
  HTTP 200.
- **Known limitation:** none for the frontend-only styling change.
- **Status:** completed.

## Latest alternate-port task

- **User request:** run Lexora on a different frontend port because the earlier
  ports were reserved for another project.
- **Scope:** Docker host-port configuration and local service startup only;
  application source and backend behavior were unchanged.
- **Files changed:**
  - `docker-compose.yml`: changed the frontend host mapping to `3100:80`.
  - `docs/task-logs/2026-07-18-frontend-practice-handoff.md`: recorded this task.
- **Validation:** port 3100 was free before startup; Docker services started;
  the frontend is published on `0.0.0.0:3100`; frontend and backend health
  requests both returned HTTP 200; MongoDB and Redis are healthy.
- **Known limitation:** backend remains published on port 5000.
- **Status:** completed.

## Known frontend-only limitations

- Fixture content is not official test content.
- Section and Mock progress currently use browser `localStorage`.
- Module answer fields can reset after a page refresh.
- Speaking recording is only a UI simulation and uploads no audio.
- Submitting the preview creates no backend score or result.

## Final status

Frontend implementation and this consolidated senior-developer handoff are
complete.

## Latest Section Practice mode chooser task

- **User request:** add a choice before an individual Section Practice module
  starts: flexible Practice mode or full Simulation test mode.
- **Scope:** frontend Section Practice selection, route configuration, timer,
  progress semantics, and session summary only. Mock Practice and backend code
  were not changed.
- **Files changed:**
  - `frontend/src/components/practice/section-practice/PracticeModeChooserModal.tsx`:
    added the reusable two-column mode chooser, module-specific part/task
    checkboxes, custom Practice time, and fixed Simulation information/actions.
  - `frontend/src/components/practice/section-practice/SectionPracticeBoard.tsx`:
    opens the chooser from an individual module row and passes mode, parts, and
    minutes through the workspace URL.
  - `frontend/src/components/practice/section-practice/sectionPracticeData.ts`:
    added typed per-module part/task definitions and Simulation durations.
  - `frontend/src/pages/practice/SectionPracticeWorkspacePage.tsx`: validates
    the URL selection, applies its timer, shows partial/full completion behavior,
    and keeps partial Practice sessions In progress.
  - `frontend/src/components/practice/section-practice/PracticeModuleWorkspace.tsx`:
    displays the active mode, selected parts/tasks, and time limit while keeping
    the shared Section/Mock module renderer reusable.
- **Validation:** Docker TypeScript/Vite production build passed; the frontend
  image was rebuilt and its container recreated; frontend port 3100 and backend
  health port 5000 both returned HTTP 200; MongoDB and Redis remained healthy.
- **Known limitations:** the four module screens still use frontend fixture
  question content. The selected part IDs are route/session configuration ready
  for future API payloads, but real per-part content loading and answer saving
  require backend endpoints. Authenticated visual interaction was not performed
  because the isolated test browser redirected to Login.
- **Status:** completed.

## Latest compact themed mode-popup task

- **User request:** make the Section Practice mode chooser smaller and match
  the existing Lexora site theme.
- **Scope:** frontend modal presentation only; mode-selection behavior, routes,
  Mock Practice, APIs, and backend services were unchanged.
- **Files changed:**
  - `frontend/src/components/practice/section-practice/PracticeModeChooserModal.tsx`:
    reduced the modal width, spacing, controls, icons, typography, and card
    height; added viewport-safe scrolling; replaced teal/cyan styling with the
    site's primary red, pale-pink gradient, white/cream surfaces, and red-tinted
    borders and shadows.
  - `docs/task-logs/2026-07-18-frontend-practice-handoff.md`: recorded the task.
- **Validation:** Docker TypeScript/Vite production build passed and the
  frontend container was rebuilt and restarted on port 3100.
- **Known limitations:** authenticated visual review still requires a signed-in
  browser session.
- **Status:** completed.

## Latest dynamic IELTS/UKVI catalog-label task

- **User request:** make the Academic text shown beside each Cambridge book
  number change according to the selected sidebar IELTS/UKVI item.
- **Scope:** frontend shared layout state and Section/Mock catalog labels only;
  test data, routes, APIs, and backend services were unchanged.
- **Files changed:**
  - `frontend/src/components/layout/MainLayout.tsx`: exposes the active sidebar
    IELTS/UKVI selection to nested pages through typed outlet context.
  - `frontend/src/pages/practice/EnrolledPracticePage.tsx`: converts the active
    selection into `Academic`, `General`, `UKVI Academic`, or `UKVI General`
    and passes it to both catalogs.
  - `frontend/src/components/practice/section-practice/SectionPracticeBoard.tsx`:
    renders the dynamic variant label beside each Cambridge book number.
  - `frontend/src/components/practice/section-practice/MockPracticeBoard.tsx`:
    applies the same dynamic label behavior to Mock Practice.
  - `docs/task-logs/2026-07-18-frontend-practice-handoff.md`: recorded the task.
- **Validation:** Docker TypeScript/Vite production build passed; the frontend
  image/container was rebuilt and restarted; port 3100 returned HTTP 200.
- **Known limitations:** the selection is presentation state only until separate
  IELTS/UKVI content catalogs are provided by future APIs.
- **Status:** completed.

## Latest Section Practice Full-action removal task

- **User request:** remove the Full button from Section Practice and retain the
  implementation record in the frontend handoff log.
- **Scope:** Section Practice catalog/full-test entry only. Individual module
  Practice/Simulation selection and the Mock Practice full-test flow remain.
  Backend code and APIs were not changed.
- **Files changed:**
  - `frontend/src/components/practice/section-practice/SectionPracticeBoard.tsx`:
    removed the Full badge/button, full-test target state, confirmation popup,
    and `mode=full` navigation from Section Practice; test headers are now
    presentation-only while module rows remain interactive.
  - `docs/task-logs/2026-07-18-frontend-practice-handoff.md`: recorded the task.
- **Validation:** Docker TypeScript/Vite production build passed; the frontend
  image/container was rebuilt and restarted; port 3100 returned HTTP 200.
- **Known limitations:** the old Section workspace `mode=full` handling remains
  backward-compatible for direct legacy URLs, but the Section catalog no longer
  exposes a way to start that flow.
- **Status:** completed.

## Latest Docker full-restart task

- **User request:** rebuild and run the complete project again with Docker.
- **Scope:** Docker image rebuild and force-recreation of frontend, backend,
  MongoDB, and Redis containers. Existing volumes and application files were
  preserved; no source or environment configuration was changed.
- **Files changed:** this handoff log only.
- **Validation:** all four containers are running; backend, MongoDB, and Redis
  report healthy; frontend port 3100 and backend health port 5000 both returned
  HTTP 200.
- **Known limitations:** the backend still uses the local MongoDB configuration
  currently stored in `backend/.env`; no remote/live database switch occurred.
- **Status:** completed.
