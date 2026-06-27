import type { ApiResponse, AnswerSheetResponse, PresignedUrlResponse } from '@/types/dto'
import { apiClient } from './client'

export const sheetsApi = {
  list: (examId: number) =>
    apiClient.get<ApiResponse<AnswerSheetResponse[]>>(`/exams/${examId}/answer-sheets`).then((r) => r.data),

  getUploadUrl: (examId: number, fileName: string) =>
    apiClient.post<ApiResponse<PresignedUrlResponse>>(`/exams/${examId}/answer-sheets/upload-url`, { fileName }).then((r) => r.data),

  confirmUpload: (examId: number, body: { s3Key: string; fileName: string }) =>
    apiClient.post<ApiResponse<AnswerSheetResponse>>(`/exams/${examId}/answer-sheets`, body).then((r) => r.data),

  delete: (examId: number, sheetId: number) =>
    apiClient.delete<ApiResponse<null>>(`/exams/${examId}/answer-sheets/${sheetId}`).then((r) => r.data),
}
