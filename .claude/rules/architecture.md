# Architecture & Types

## Entry point

`src/main.tsx` bootstraps the app directly with `RouterProvider` (no `App.tsx` wrapper). `QueryClientProvider` and `Toaster` live here as well.

## Path alias

`@/` maps to `src/`.

## Routing & auth

Routes are defined in [src/router/index.tsx](../../src/router/index.tsx). All `/exam/*`, `/dashboard`, and `/account` routes are wrapped in a `PrivateRoute` component that reads the JWT from `useAuthStore` and redirects to `/` on failure.

Auth state ([src/stores/authStore.ts](../../src/stores/authStore.ts)) is a Zustand store that mirrors the token to `localStorage` (`access_token`). The Axios client ([src/api/client.ts](../../src/api/client.ts)) reads the token from `localStorage` on every request and auto-clears auth + redirects to `/` on 401.

## Layouts

Exam step pages do not use `ExamLayout`; they inline the sidebar directly as a 252px `<aside>` to allow per-page control. `ExamLayout` exists but is only used in a few non-step pages.

## Types

- **[src/types/enums.ts](../../src/types/enums.ts)**: All string literal union types (`ExamStatus`, `ProblemType`, `JobType`, `GradeMethod`, etc.)
- **[src/types/dto.ts](../../src/types/dto.ts)**: All API request/response interfaces
- **[src/types/constants.ts](../../src/types/constants.ts)**: UI color/label mappings keyed on `ProblemType`
