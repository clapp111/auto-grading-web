# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite HMR)
npm run build     # Type-check then bundle for production
npm run lint      # Run oxlint
npm run preview   # Serve the production build locally
```

There is no test suite. Type-checking is done as part of `build` via `tsc -b`.

## Architecture

### Tech stack
React 19 + TypeScript, Vite, Tailwind CSS, React Query v5, Zustand, React Router v7, Axios, react-pdf + react-konva (PDF viewer with overlay drawing), Zod + React Hook Form, Radix UI primitives, Sonner toasts.

### Entry point
`src/main.tsx` bootstraps the app directly with `RouterProvider` (no `App.tsx` wrapper). `QueryClientProvider` and `Toaster` live here as well.

### Path alias
`@/` maps to `src/`.

### Routing & auth
Routes are defined in [src/router/index.tsx](src/router/index.tsx). All `/exam/*`, `/dashboard`, and `/account` routes are wrapped in a `PrivateRoute` component that reads the JWT from `useAuthStore` and redirects to `/` on failure.

Auth state ([src/stores/authStore.ts](src/stores/authStore.ts)) is a Zustand store that mirrors the token to `localStorage` (`access_token`). The Axios client ([src/api/client.ts](src/api/client.ts)) reads the token from `localStorage` on every request and auto-clears auth + redirects to `/` on 401.

### API layer
All API modules in [src/api/](src/api/) use a shared `apiClient` (Axios instance pointed at `VITE_API_BASE_URL` or `/api/v1`). Every response is typed as `ApiResponse<T>`:

```ts
{ data: T | null; meta: PageMeta | CursorMeta | null; error: ApiError | null }
```

API modules: `auth`, `exams`, `problems`, `sheets`, `ocr`, `grading`, `regions`.

### File uploads
Files are uploaded directly to S3 via presigned URLs. The flow is: request a presigned URL from the backend → PUT the file with `axios` (not `apiClient`) → notify the backend of the `file_key`. The `usePresignedUpload` hook ([src/hooks/common/usePresignedUpload.ts](src/hooks/common/usePresignedUpload.ts)) handles the PUT step with progress tracking.

### Async jobs
Long-running operations (OCR, grading, CSV export, rubric suggestion, etc.) return a `JobStartedResponse` with a `job_id`. Use `useJobPolling` ([src/hooks/common/useJobPolling.ts](src/hooks/common/useJobPolling.ts)) to poll `/jobs/:id` via React Query's `refetchInterval` until status reaches `DONE`, `FAILED`, or `CANCELED`.

### PDF viewer
`PdfCanvas` ([src/components/exam/PdfCanvas.tsx](src/components/exam/PdfCanvas.tsx)) renders a PDF page with `react-pdf` and overlays a Konva `Stage` for drawing answer regions. Supports two draw modes:
- **RECT**: drag to draw a bounding box
- **LASSO**: click vertices, double-click to close the polygon (Esc cancels)

Region coordinates are stored as fractions of the rendered stage size (`x, y, w, h` in `[0, 1]`).

### 7-step exam workflow
The core product is a linear grading workflow under `/exam/:examId/step/:step`. `ExamSidebar` ([src/components/common/ExamSidebar.tsx](src/components/common/ExamSidebar.tsx)) shows progress across all steps and allows navigation.

| Step | Route | Purpose |
|------|-------|---------|
| 1 | `step/1` | Problem sheet setup — 3 sub-steps: draw problem regions + set types, run model-answer OCR, enter correct answers |
| 2 | `step/2` | Rubric setup — only for `DESCRIPTIVE`/`CODING` problems; AI (LLM) can suggest rubric criteria |
| 3 | `step/3` | Upload student roster / answer sheets |
| 4 | `step/4` | Draw answer regions on student sheets |
| 5 | `step/5` | Review & confirm OCR results per student per problem |
| 6 | `step/6` | Run auto/LLM grading and confirm grades |
| 7 | `step/7` | View results, statistics, export CSV |

Step 1 has internal sub-step state managed in the page component itself (not via URL).

### Types
- **[src/types/enums.ts](src/types/enums.ts)**: All string literal union types (`ExamStatus`, `ProblemType`, `JobType`, `GradeMethod`, etc.)
- **[src/types/dto.ts](src/types/dto.ts)**: All API request/response interfaces
- **[src/types/constants.ts](src/types/constants.ts)**: UI color/label mappings keyed on `ProblemType`

### Layouts
Exam step pages do not use `ExamLayout`; they inline the sidebar directly as a 252px `<aside>` to allow per-page control. `ExamLayout` exists but is only used in a few non-step pages.
