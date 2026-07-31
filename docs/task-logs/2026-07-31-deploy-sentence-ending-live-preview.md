# Deploy Sentence-Ending Live Preview

## User request

Publish the current Reading client-preview update so the client can test the
Sentence-Ending Matching two-way drag-and-drop interaction on the live URL.

## Scope

- Reading client-preview frontend bundle only.
- Existing Cloudflare Pages project: `lexora-reading-preview`.
- Exclude backend, Docker, Writing, and result-page work.

## Files changed

- Reading client-preview source files required by the current production build.
- This task log records the release and verification result.

## Validation

- Frontend production build passed before publication.
- Local client-preview route returned HTTP 200.
- Scoped release commit `d6a66e8` was pushed to `origin/main`.
- The public Pages route continued to serve the previous asset bundle during
  two bounded monitoring windows.

## Known limitations or follow-up

- Direct Wrangler upload was unavailable because the local CLI had no API token
  and its OAuth callback was rejected by Cloudflare.
- The signed-in browser could not be controlled because the browser connector
  failed to start under the current Windows ACL sandbox.
- The repository push did not trigger a Pages build, so Cloudflare
  authentication or a working dashboard session is still required.

## Final status

Source published to GitHub; live deployment blocked on Cloudflare
authentication.
