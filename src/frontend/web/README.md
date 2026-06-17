# VSF AI Annotation Platform UI

React/Vite frontend shell for the VSF AI Annotation Platform.

The app is UI-only: authentication and workflow actions go through the backend API. Backend business routes that are still scaffolded may return `501`, and the UI surfaces that state instead of simulating local workflow changes.

## Run Locally

Prerequisites: Node.js.

1. Install dependencies:
   `npm install`
2. Configure backend URL in `.env.local` when the API is not served under the same origin:
   `VITE_API_BASE_URL=http://localhost:8000/api/v1`
3. Run the app:
   `npm run dev`

## Backend Contract

Default API base: `/api/v1`.

Current calls:

- `POST /auth/login`
- `GET /projects`
- `GET /tasks`
- `GET /audit-logs`
- `POST /tasks/{claim_id}/submit`
- `POST /qa-reviews/{claim_id}/approve`
- `POST /qa-reviews/{claim_id}/return`
- `POST /exports`
