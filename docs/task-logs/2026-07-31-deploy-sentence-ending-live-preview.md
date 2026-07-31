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
- Live deployment verification is pending.

## Known limitations or follow-up

- Direct Wrangler upload was unavailable because the local CLI had no API token
  and its OAuth callback was rejected by Cloudflare.
- The release therefore uses the repository-connected Pages deployment flow.

## Final status

In progress.
