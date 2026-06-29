import type { ApiResponse, ExamResponse } from '@/types/dto'
import type { LayoutMode } from '@/types/enums'
import { apiClient } from './client'

export interface ExamCreateRequest {
  name: string
  description?: string
}

export interface ExamUpdateRequest {
  name?: string
  description?: string
  layout_mode?: LayoutMode
}

export const examsApi = {
  list: () =>
    apiClient.get<ApiResponse<ExamResponse[]>>('/exams').then((r) => r.data),

  get: (examId: number) =>
    apiClient.get<ApiResponse<ExamResponse>>(`/exams/${examId}`).then((r) => r.data),

  create: (body: ExamCreateRequest) =>
    apiClient.post<ApiResponse<ExamResponse>>('/exams', body).then((r) => r.data),

  update: (examId: number, body: ExamUpdateRequest) =>
    apiClient.patch<ApiResponse<ExamResponse>>(`/exams/${examId}`, body).then((r) => r.data),

  delete: (examId: number) =>
    apiClient.delete<ApiResponse<null>>(`/exams/${examId}`).then((r) => r.data),

  advance: (examId: number, fromStep: number) =>
    apiClient.post<ApiResponse<ExamResponse>>(`/exams/${examId}/advance`, { from_step: fromStep }).then((r) => r.data),
}
