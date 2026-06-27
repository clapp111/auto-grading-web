import type { ApiResponse, ProblemResponse, ModelAnswerResponse, RubricResponse, PresignedUrlResponse } from '@/types/dto'
import type { ProblemType, ProgrammingLanguage, RubricSource } from '@/types/enums'
import { apiClient } from './client'

export interface CreateProblemRequest {
  number: number
  type: ProblemType
  maxScore: number
  programmingLanguage?: ProgrammingLanguage
}

export interface UpdateRubricRequest {
  source: RubricSource
  content?: string
}

export const problemsApi = {
  list: (examId: number) =>
    apiClient.get<ApiResponse<ProblemResponse[]>>(`/exams/${examId}/problems`).then((r) => r.data),

  create: (examId: number, body: CreateProblemRequest) =>
    apiClient.post<ApiResponse<ProblemResponse>>(`/exams/${examId}/problems`, body).then((r) => r.data),

  delete: (examId: number, problemId: number) =>
    apiClient.delete<ApiResponse<null>>(`/exams/${examId}/problems/${problemId}`).then((r) => r.data),

  // 모범답안
  getModelAnswerUploadUrl: (examId: number, problemId: number) =>
    apiClient.get<ApiResponse<PresignedUrlResponse>>(`/exams/${examId}/problems/${problemId}/model-answer/upload-url`).then((r) => r.data),

  getModelAnswer: (examId: number, problemId: number) =>
    apiClient.get<ApiResponse<ModelAnswerResponse>>(`/exams/${examId}/problems/${problemId}/model-answer`).then((r) => r.data),

  // 루브릭
  getRubric: (examId: number, problemId: number) =>
    apiClient.get<ApiResponse<RubricResponse>>(`/exams/${examId}/problems/${problemId}/rubric`).then((r) => r.data),

  updateRubric: (examId: number, problemId: number, body: UpdateRubricRequest) =>
    apiClient.put<ApiResponse<RubricResponse>>(`/exams/${examId}/problems/${problemId}/rubric`, body).then((r) => r.data),
}
