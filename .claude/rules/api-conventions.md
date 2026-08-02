# API Conventions

## API layer
All API modules in [src/api/](../../src/api/) use a shared `apiClient` (Axios instance pointed at `VITE_API_BASE_URL` or `/api/v1`). Every response is typed as `ApiResponse<T>`:

```ts
{ data: T | null; meta: PageMeta | CursorMeta | null; error: ApiError | null }
```

API modules: `auth`, `exams`, `problems`, `sheets`, `ocr`, `grading`, `regions`.

## File uploads
Files are uploaded directly to S3 via presigned URLs. The flow is: request a presigned URL from the backend → PUT the file with `axios` (not `apiClient`) → notify the backend of the `file_key`. The `usePresignedUpload` hook ([src/hooks/common/usePresignedUpload.ts](../../src/hooks/common/usePresignedUpload.ts)) handles the PUT step with progress tracking.

## Async jobs
Long-running operations (OCR, grading, CSV export, rubric suggestion, etc.) return a `JobStartedResponse` with a `job_id`. Use `useJobPolling` ([src/hooks/common/useJobPolling.ts](../../src/hooks/common/useJobPolling.ts)) to poll `/jobs/:id` via React Query's `refetchInterval` until status reaches `DONE`, `FAILED`, or `CANCELED`.
