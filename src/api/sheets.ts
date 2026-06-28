import type {
  ApiResponse,
  AnswerSheetResponse,
  AnswerSheetDownloadResponse,
  AnswerSheetPresignedUrlResponse,
  UploadCompleteResponse,
  JobStartedResponse,
  Region,
} from '@/types/dto'
import { apiClient } from './client'

export interface AnswerSheetPatchRequest {
  name?: string | null
  student_no?: string | null
}

export interface IdRegionSaveRequest {
  name_region: Region
  student_no_region: Region
}

export const sheetsApi = {
  list: (examId: number) =>
    apiClient
      .get<ApiResponse<AnswerSheetResponse[]>>(`/exams/${examId}/answer-sheets`)
      .then((r) => r.data),

  getPresignedUrl: (examId: number, body: { file_name: string; content_type: string }) =>
    apiClient
      .post<ApiResponse<AnswerSheetPresignedUrlResponse>>(`/exams/${examId}/answer-sheets`, body)
      .then((r) => r.data),

  completeUpload: (sheetId: number) =>
    apiClient
      .post<ApiResponse<UploadCompleteResponse>>(`/answer-sheets/${sheetId}/complete`)
      .then((r) => r.data),

  delete: (sheetId: number) =>
    apiClient.delete<ApiResponse<null>>(`/answer-sheets/${sheetId}`).then((r) => r.data),

  patch: (sheetId: number, body: AnswerSheetPatchRequest) =>
    apiClient
      .patch<ApiResponse<AnswerSheetResponse>>(`/answer-sheets/${sheetId}`, body)
      .then((r) => r.data),

  getDownloadUrl: (sheetId: number) =>
    apiClient
      .get<ApiResponse<AnswerSheetDownloadResponse>>(`/answer-sheets/${sheetId}/download`)
      .then((r) => r.data),

  saveIdRegions: (examId: number, body: IdRegionSaveRequest) =>
    apiClient
      .post<ApiResponse<JobStartedResponse>>(`/exams/${examId}/id-regions`, body)
      .then((r) => r.data),
}
