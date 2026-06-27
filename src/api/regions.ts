import type { ApiResponse, AnswerRegionResponse } from '@/types/dto'
import type { RegionShape, LayoutMode } from '@/types/enums'
import { apiClient } from './client'

export interface SaveRegionRequest {
  problemId: number
  shape: RegionShape
  points: { x: number; y: number }[]
  pageNumber: number
}

export interface SaveIdRegionRequest {
  shape: RegionShape
  points: { x: number; y: number }[]
  pageNumber: number
  layoutMode: LayoutMode
}

export const regionsApi = {
  // 답안 영역
  list: (examId: number) =>
    apiClient.get<ApiResponse<AnswerRegionResponse[]>>(`/exams/${examId}/regions`).then((r) => r.data),

  save: (examId: number, body: SaveRegionRequest[]) =>
    apiClient.put<ApiResponse<AnswerRegionResponse[]>>(`/exams/${examId}/regions`, body).then((r) => r.data),

  // 학번 인식 영역
  getIdRegion: (examId: number) =>
    apiClient.get<ApiResponse<AnswerRegionResponse>>(`/exams/${examId}/id-region`).then((r) => r.data),

  saveIdRegion: (examId: number, body: SaveIdRegionRequest) =>
    apiClient.put<ApiResponse<AnswerRegionResponse>>(`/exams/${examId}/id-region`, body).then((r) => r.data),

  // 영역 템플릿
  applyTemplate: (examId: number, templateExamId: number) =>
    apiClient.post<ApiResponse<AnswerRegionResponse[]>>(`/exams/${examId}/region-template`, { templateExamId }).then((r) => r.data),
}
