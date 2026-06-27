import type { ApiResponse, JobStartedResponse, OcrProgressResponse, OcrResultResponse } from '@/types/dto'
import { apiClient } from './client'

export const ocrApi = {
  run: (examId: number) =>
    apiClient.post<ApiResponse<JobStartedResponse>>(`/exams/${examId}/ocr/run`).then((r) => r.data),

  getProgress: (examId: number) =>
    apiClient.get<ApiResponse<OcrProgressResponse>>(`/exams/${examId}/ocr/progress`).then((r) => r.data),

  getResults: (examId: number) =>
    apiClient.get<ApiResponse<OcrResultResponse[]>>(`/exams/${examId}/ocr/results`).then((r) => r.data),

  updateResult: (examId: number, resultId: number, body: { correctedText: string }) =>
    apiClient.patch<ApiResponse<OcrResultResponse>>(`/exams/${examId}/ocr/results/${resultId}`, body).then((r) => r.data),
}
