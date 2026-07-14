import type {
  ApiResponse,
  JobStartedResponse,
  GradingProgressResponse,
  GradeResponse,
  ExamResultResponse,
  ExamStatisticsResponse,
  StudentDetailResultResponse,
} from '@/types/dto'
import { apiClient } from './client'

export interface GradeCreateRequest {
  score: number
}

export interface GradeUpdateRequest {
  score?: number
  comment?: string
  rubric_breakdown?: { rubric_id: number; satisfied: boolean }[]
}

export interface GradeBulkConfirmResponse {
  confirmed_count: number
}

export const gradingApi = {
  getProgress: (examId: number) =>
    apiClient
      .get<ApiResponse<GradingProgressResponse>>(`/exams/${examId}/grading/progress`)
      .then((r) => r.data),

  runForProblem: (examId: number, problemId: number) =>
    apiClient
      .post<ApiResponse<JobStartedResponse>>(`/exams/${examId}/problems/${problemId}/grade/run`)
      .then((r) => r.data),

  getProblemGrades: (problemId: number) =>
    apiClient
      .get<ApiResponse<GradeResponse[]>>(`/problems/${problemId}/grades`)
      .then((r) => r.data),

  updateGrade: (gradeId: number, body: GradeUpdateRequest) =>
    apiClient
      .patch<ApiResponse<GradeResponse>>(`/grades/${gradeId}`, body)
      .then((r) => r.data),

  confirmGrade: (gradeId: number) =>
    apiClient
      .post<ApiResponse<GradeResponse>>(`/grades/${gradeId}/confirm`)
      .then((r) => r.data),

  deleteGrades: (problemId: number) =>
    apiClient
      .delete<ApiResponse<GradeResponse>>(`/problems/${problemId}/grades`)
      .then((r) => r.data),

  createGrade: (problemId: number, studentId: number, body: GradeCreateRequest) =>
    apiClient
      .post<ApiResponse<GradeResponse>>(`/problems/${problemId}/students/${studentId}/grades`, body)
      .then((r) => r.data),

  confirmAllGrades: (problemId: number) =>
    apiClient
      .post<ApiResponse<GradeBulkConfirmResponse>>(`/problems/${problemId}/grades/confirm-all`)
      .then((r) => r.data),

  getResults: (examId: number) =>
    apiClient
      .get<ApiResponse<ExamResultResponse>>(`/exams/${examId}/results`)
      .then((r) => r.data),

  getStatistics: (examId: number) =>
    apiClient
      .get<ApiResponse<ExamStatisticsResponse>>(`/exams/${examId}/results/statistics`)
      .then((r) => r.data),

  getStudentDetail: (examId: number, studentId: number) =>
    apiClient
      .get<ApiResponse<StudentDetailResultResponse>>(
        `/exams/${examId}/results/students/${studentId}`,
      )
      .then((r) => r.data),

  exportCsv: (examId: number) =>
    apiClient
      .get(`/exams/${examId}/results/export`, { responseType: 'blob' })
      .then((r) => r.data),
}
