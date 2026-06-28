import type { ApiResponse, AnswerRegionResponse, JobStartedResponse, Region, Point } from '@/types/dto'
import type { RegionShape } from '@/types/enums'
import { apiClient } from './client'

export interface RegionTemplateItem {
  problem_id: number
  shape: RegionShape
  bbox_region?: Region
  polygon_points?: Point[]
}

export interface AnswerRegionCreateRequest {
  problem_id: number
  shape: RegionShape
  bbox_region?: Region
  polygon_points?: Point[]
}

export interface AnswerRegionUpdateRequest {
  problem_id?: number
  shape?: RegionShape
  bbox_region?: Region
  polygon_points?: Point[]
}

export const regionsApi = {
  // FIXED 모드: 첫 답안지 기준 영역 템플릿 저장
  saveTemplate: (examId: number, regions: RegionTemplateItem[]) =>
    apiClient
      .put<ApiResponse<AnswerRegionResponse[]>>(`/exams/${examId}/region-template`, { regions })
      .then((r) => r.data),

  // FIXED 모드: 템플릿을 전체 답안지에 적용 (비동기 Job)
  applyTemplate: (examId: number) =>
    apiClient
      .post<ApiResponse<JobStartedResponse>>(`/exams/${examId}/regions/apply-template`)
      .then((r) => r.data),

  // 특정 답안지의 영역·매핑 조회
  getSheetRegions: (sheetId: number) =>
    apiClient
      .get<ApiResponse<AnswerRegionResponse[]>>(`/answer-sheets/${sheetId}/regions`)
      .then((r) => r.data),

  // 영역 추가 (FREE 모드 / 미세조정)
  addRegion: (sheetId: number, body: AnswerRegionCreateRequest) =>
    apiClient
      .post<ApiResponse<AnswerRegionResponse>>(`/answer-sheets/${sheetId}/regions`, body)
      .then((r) => r.data),

  // 영역 bbox·문제 매핑 수정
  updateRegion: (regionId: number, body: AnswerRegionUpdateRequest) =>
    apiClient
      .patch<ApiResponse<AnswerRegionResponse>>(`/answer-regions/${regionId}`, body)
      .then((r) => r.data),

  // 영역 삭제
  deleteRegion: (regionId: number) =>
    apiClient
      .delete<ApiResponse<null>>(`/answer-regions/${regionId}`)
      .then((r) => r.data),
}
