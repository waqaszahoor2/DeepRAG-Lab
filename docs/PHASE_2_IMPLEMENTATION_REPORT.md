# Phase 2 Implementation Report

Date: 2026-08-30
Scope: public try-without-login demo mode.

## Implemented

- Preserved the existing real RAG demo route at `/chat?demo=true`.
- Added a browser-local anonymous demo session UUID sent as `X-Demo-Session-ID`.
- Added a bounded 20-message/hour demo limit per anonymous session.
- Kept demo retrieval restricted to vectors tagged `demo=true`.
- Kept anonymous demo history out of authenticated chat history.
- Kept demo uploads disabled and directed users to account creation for private documents.
- Added the three demo document names to the demo banner.
- Added a direct “Try the public demo without signing in” link to the login page.
- Confirmed the existing seed content contains stable document IDs, page numbers, chunk IDs, and factual searchable text.

## Files Changed

- `lib/api.ts`
- `backend/app/api/v1/endpoints/chat.py`
- `components/DemoBanner.tsx`
- `app/login/page.tsx`
- `backend/tests/test_demo.py`
- `docs/PHASE_2_IMPLEMENTATION_REPORT.md`

## Database and Environment Changes

- No database schema changes.
- No environment variables or credentials added.
- No backend API route contract changes.

## Tests Added

- `test_demo_message_limit_is_isolated_by_session`

## Commands and Results

- `py -3.14 -m pytest tests/test_demo.py -v`: passed, 1 test.
- `py -3.14 -m pytest -v`: passed previously, 6 existing tests.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with two existing hook-dependency warnings.
- `npm run build`: passed; all current frontend routes prerendered.

## Remaining Risks

- Demo message limits are process-local and need shared storage for a multi-instance deployment.
- The seed script uses the Chroma implementation directly and needs provider-independent idempotent seeding before production Qdrant use.
- Full API-level anonymous demo retrieval and read-only enforcement tests require a running backend integration environment.
- The demo seed command should be rerun and verified against the configured vector store before deployment.

## Manual Verification

1. Start FastAPI on port 8000 and Next.js on port 3000.
2. Open `/chat?demo=true` while logged out.
3. Confirm the banner lists the three sample documents.
4. Ask a suggested question and confirm the response contains retrieved citations.
5. Open a citation and confirm the matching source card is selected.
6. Attempt to attach a file and confirm demo upload is rejected.
7. Open a second browser profile and confirm it receives a different demo session identifier.
8. Confirm demo activity does not appear in an authenticated user’s private history.

## Status

Phase 2 implementation and available checks are complete. Phase 3 has not been started.
