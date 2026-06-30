import type { ApiResponse, JobStartedResponse, OcrProgressResponse, OcrResultResponse } from '@/types/dto'
import { apiClient } from './client'

export interface UpdateOcrResultBody {
  text?: string | null
  marked_choice?: number | null
}

export const ocrApi = {
  run: (examId: number) =>
    apiClient
      .post<ApiResponse<JobStartedResponse>>(`/exams/${examId}/ocr/run`)
      .then((r) => r.data),

  getProgress: (examId: number) =>
    apiClient
      .get<ApiResponse<OcrProgressResponse>>(`/exams/${examId}/ocr/progress`)
      .then((r) => r.data),

  getStudentResults: (studentId: number) =>
    apiClient
      .get<ApiResponse<OcrResultResponse[]>>(`/students/${studentId}/ocr-results`)
      .then((r) => r.data),

  updateResult: (resultId: number, body: UpdateOcrResultBody) =>
    apiClient
      .patch<ApiResponse<OcrResultResponse>>(`/ocr-results/${resultId}`, body)
      .then((r) => r.data),

  confirmResult: (resultId: number) =>
    apiClient
      .post<ApiResponse<OcrResultResponse>>(`/ocr-results/${resultId}/confirm`)
      .then((r) => r.data),

  runSheetOcr: (sheetId: number) =>
    apiClient
      .post<ApiResponse<JobStartedResponse>>(`/answer-sheets/${sheetId}/ocr`)
      .then((r) => r.data),
}
