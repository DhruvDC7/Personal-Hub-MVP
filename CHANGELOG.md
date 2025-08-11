# MVP Hardening

## Changes
- Converted Next.js config to JavaScript and removed TypeScript remnants.
- Added MongoDB v6 singleton connection and automatic index creation.
- Consolidated document API with presigned upload support via AWS S3 utility.
- Hardened accounts and transactions APIs with ObjectId validation and richer query filters.
- Added shared S3 helper with presign and delete utilities.
- Updated client fetcher, components, and pages to follow `/api` conventions and refresh data after mutations.
- Marked shared UI components as client components.
- Introduced Personal Hub dashboard with stats cards, charts, and lists.

## Known TODOs
- Support transaction transfers between accounts.
- Add authentication and comprehensive automated tests.
- Record uploaded document size after S3 upload.
