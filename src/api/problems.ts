import type {
  ApiResponse,
  ProblemResponse,
  ModelAnswerResponse,
  RubricResponse,
  PresignedUrlResponse,
  JobStartedResponse,
  Region,
} from '@/types/dto'
import type { ProblemType, ProgrammingLanguage } from '@/types/enums'
import { apiClient } from './client'

// ── Request 타입 ──────────────────────────────────────────────────────

export interface ProblemCreateRequest {
  label: string
  type: ProblemType
  max_score: number
  region?: Region
}

export interface ProblemUpdateRequest {
  label?: string
  type?: ProblemType
  max_score?: number
  region?: Region
  problem_text?: string | null
}

export interface ModelAnswerOcrRequest {
  region: Region
  language?: ProgrammingLanguage
}

export interface ModelAnswerUpdateRequest {
  correct_choice?: number
  choice_count?: number
  accepted_answers?: string[]
  model_answer_text?: string
  region?: Region
}

export interface RubricSaveRequest {
  criteria: { text: string; allocated_score: number }[]
}

export interface RubricCreateRequest {
  text: string
  allocated_score: number
  order_index: number
}

export interface RubricUpdateRequest {
  text?: string
  allocated_score?: number
  order_index?: number
}

// ── API ───────────────────────────────────────────────────────────────

export const problemsApi = {
  // 서브스텝 1/3 · 문제 영역 + 유형 ──────────────────────────────────

  getProblemSheetUploadUrl: (examId: number, fileName: string, contentType: string) =>
    apiClient
      .post<ApiResponse<PresignedUrlResponse>>(`/exams/${examId}/problem-sheet`, {
        file_name: fileName,
        content_type: contentType,
      })
      .then((r) => r.data),

  list: (examId: number) =>
    apiClient
      .get<ApiResponse<ProblemResponse[]>>(`/exams/${examId}/problems`)
      .then((r) => r.data),

  create: (examId: number, body: ProblemCreateRequest) =>
    apiClient
      .post<ApiResponse<ProblemResponse>>(`/exams/${examId}/problems`, body)
      .then((r) => r.data),

  update: (problemId: number, body: ProblemUpdateRequest) =>
    apiClient
      .patch<ApiResponse<ProblemResponse>>(`/problems/${problemId}`, body)
      .then((r) => r.data),

  delete: (problemId: number) =>
    apiClient
      .delete<ApiResponse<null>>(`/problems/${problemId}`)
      .then((r) => r.data),

  runProblemOcr: (problemId: number) =>
    apiClient
      .post<ApiResponse<JobStartedResponse>>(`/problems/${problemId}/ocr`)
      .then((r) => r.data),

  // 서브스텝 2/3 · 모범답안 영역 지정 · OCR ───────────────────────────

  getModelAnswerUploadUrl: (examId: number, fileName: string, contentType: string) =>
    apiClient
      .post<ApiResponse<PresignedUrlResponse>>(`/exams/${examId}/model-answer`, {
        file_name: fileName,
        content_type: contentType,
      })
      .then((r) => r.data),

  listModelAnswers: (examId: number) =>
    apiClient
      .get<ApiResponse<ModelAnswerResponse[]>>(`/exams/${examId}/model-answers`)
      .then((r) => r.data),

  runModelAnswerOcr: (problemId: number, body: ModelAnswerOcrRequest) =>
    apiClient
      .post<ApiResponse<JobStartedResponse>>(`/problems/${problemId}/model-answer/ocr`, body)
      .then((r) => r.data),

  updateModelAnswer: (problemId: number, body: ModelAnswerUpdateRequest) =>
    apiClient
      .put<ApiResponse<ModelAnswerResponse>>(`/problems/${problemId}/model-answer`, body)
      .then((r) => r.data),

  // 루브릭 (step2에서 사용, folder.md 기준 problems.ts 소속) ──────────

  suggestRubric: (problemId: number) =>
    apiClient
      .post<ApiResponse<JobStartedResponse>>(`/problems/${problemId}/rubric/suggest`)
      .then((r) => r.data),

  getRubric: (problemId: number) =>
    apiClient
      .get<ApiResponse<RubricResponse[]>>(`/problems/${problemId}/rubric`)
      .then((r) => r.data),

  saveRubric: (problemId: number, body: RubricSaveRequest) =>
    apiClient
      .put<ApiResponse<RubricResponse[]>>(`/problems/${problemId}/rubric`, body)
      .then((r) => r.data),

  createRubricCriteria: (problemId: number, body: RubricCreateRequest) =>
    apiClient
      .post<ApiResponse<RubricResponse>>(`/problems/${problemId}/rubric/criteria`, body)
      .then((r) => r.data),

  updateRubricCriteria: (rubricId: number, body: RubricUpdateRequest) =>
    apiClient
      .patch<ApiResponse<RubricResponse>>(`/rubrics/${rubricId}`, body)
      .then((r) => r.data),

  deleteRubricCriteria: (rubricId: number) =>
    apiClient
      .delete<ApiResponse<null>>(`/rubrics/${rubricId}`)
      .then((r) => r.data),
}
