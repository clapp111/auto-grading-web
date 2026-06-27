import type { ApiResponse, JobStartedResponse, GradingProgressResponse, GradeResponse, ExamResultResponse, ExamStatisticsResponse, StudentDetailResultResponse } from '@/types/dto'
import { apiClient } from './client'

export const gradingApi = {
  run: (examId: number) =>
    apiClient.post<ApiResponse<JobStartedResponse>>(`/exams/${examId}/grading/run`).then((r) => r.data),

  getProgress: (examId: number) =>
    apiClient.get<ApiResponse<GradingProgressResponse>>(`/exams/${examId}/grading/progress`).then((r) => r.data),

  getGrades: (examId: number) =>
    apiClient.get<ApiResponse<GradeResponse[]>>(`/exams/${examId}/grading/grades`).then((r) => r.data),

  updateGrade: (examId: number, gradeId: number, body: { score: number; feedback?: string }) =>
    apiClient.patch<ApiResponse<GradeResponse>>(`/exams/${examId}/grading/grades/${gradeId}`, body).then((r) => r.data),

  confirmGrades: (examId: number) =>
    apiClient.post<ApiResponse<null>>(`/exams/${examId}/grading/confirm`).then((r) => r.data),

  // 결과 및 통계
  getResults: (examId: number) =>
    apiClient.get<ApiResponse<ExamResultResponse[]>>(`/exams/${examId}/results`).then((r) => r.data),

  getStatistics: (examId: number) =>
    apiClient.get<ApiResponse<ExamStatisticsResponse>>(`/exams/${examId}/results/statistics`).then((r) => r.data),

  getStudentDetail: (examId: number, studentId: number) =>
    apiClient.get<ApiResponse<StudentDetailResultResponse>>(`/exams/${examId}/results/students/${studentId}`).then((r) => r.data),

  exportCsv: (examId: number) =>
    apiClient.get(`/exams/${examId}/results/export`, { responseType: 'blob' }).then((r) => r.data),
}
