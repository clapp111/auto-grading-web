import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { gradingApi, type GradeUpdateRequest } from '@/api/grading'
import { problemsApi } from '@/api/problems'
import { sheetsApi } from '@/api/sheets'
import { regionsApi } from '@/api/regions'
import { useJobPolling } from '@/hooks/common/useJobPolling'
import type {
  GradingProgressResponse,
  GradeResponse,
  ModelAnswerResponse,
  AnswerRegionResponse,
  AnswerSheetResponse,
} from '@/types/dto'
import type { ProblemType, ProgrammingLanguage } from '@/types/enums'

const AUTO_TYPES: ProblemType[] = ['MULTIPLE_CHOICE', 'SHORT_ANSWER']

type PageView = 'list' | 'detail'

export interface ProblemRow {
  problem_id: number
  label: string
  type: ProblemType
  max_score: number
  confirmed_count: number
  total_count: number
  percent: number
}

export function useStep6(examId: number) {
  const qc = useQueryClient()
  const [view, setView] = useState<PageView>('list')
  const [selectedProblem, setSelectedProblem] = useState<ProblemRow | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)

  // LLM 뷰: grade 목록 기준 네비게이션
  const [selectedGradeIdx, setSelectedGradeIdx] = useState(0)
  // AUTO 뷰: sheet 목록 기준 네비게이션
  const [selectedSheetIdx, setSelectedSheetIdx] = useState(0)

  // ── 전체 채점 진행률 ──────────────────────────────────────────────────
  const progressQuery = useQuery({
    queryKey: ['grading-progress', examId],
    queryFn: () => gradingApi.getProgress(examId).then((r) => r.data),
    enabled: !!examId,
    refetchInterval: view === 'list' ? 10_000 : false,
  })
  const progress: GradingProgressResponse | null | undefined = progressQuery.data

  // ── 답안지 목록 (학생 목록) ───────────────────────────────────────────
  const { data: sheetsData = [] } = useQuery({
    queryKey: ['sheets', examId],
    queryFn: () => sheetsApi.list(examId).then((r) => r.data ?? []),
    enabled: !!examId,
  })

  // ── 모범답안 (자동채점 뷰의 정답 표시용) ─────────────────────────────
  const modelAnswersQuery = useQuery({
    queryKey: ['model-answers', examId],
    queryFn: () => problemsApi.listModelAnswers(examId).then((r) => r.data ?? []),
    enabled: !!selectedProblem && view === 'detail' && AUTO_TYPES.includes(selectedProblem.type),
  })
  const allModelAnswers: ModelAnswerResponse[] = modelAnswersQuery.data ?? []
  const selectedModelAnswer =
    allModelAnswers.find((ma) => ma.problem_id === selectedProblem?.problem_id) ?? null

  // ── 선택된 문제의 채점 결과 ───────────────────────────────────────────
  const gradesQuery = useQuery({
    queryKey: ['grades', selectedProblem?.problem_id],
    queryFn: () =>
      gradingApi.getProblemGrades(selectedProblem!.problem_id).then((r) => r.data ?? []),
    enabled: !!selectedProblem && view === 'detail',
  })
  const grades: GradeResponse[] = gradesQuery.data ?? []

  // ── 채점 job 폴링 ────────────────────────────────────────────────────
  const { isRunning: isGrading, job: gradingJob } = useJobPolling({
    jobId,
    onComplete: () => {
      setJobId(null)
      qc.invalidateQueries({ queryKey: ['grades', selectedProblem?.problem_id] })
      qc.invalidateQueries({ queryKey: ['grading-progress', examId] })
      qc.invalidateQueries({ queryKey: ['model-answers', examId] })
    },
    onError: () => {
      setJobId(null)
      toast.error('채점 중 오류가 발생했습니다')
    },
  })

  // ── 채점 실행 (LLM 타입용) ────────────────────────────────────────────
  const runGrading = useCallback(async () => {
    if (!selectedProblem) return
    try {
      const res = await gradingApi.runForProblem(examId, selectedProblem.problem_id)
      if (res.data?.job_id) setJobId(String(res.data.job_id))
    } catch {
      toast.error('채점 실행에 실패했습니다')
    }
  }, [examId, selectedProblem])

  // ── 개별 확정 (LLM 뷰용) ─────────────────────────────────────────────
  const confirmMutation = useMutation({
    mutationFn: (gradeId: number) => gradingApi.confirmGrade(gradeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grades', selectedProblem?.problem_id] })
      qc.invalidateQueries({ queryKey: ['grading-progress', examId] })
      setSelectedGradeIdx((i) => Math.min(i + 1, grades.length - 1))
    },
    onError: () => toast.error('확정에 실패했습니다'),
  })

  // ── 일괄 확정 ─────────────────────────────────────────────────────────
  const confirmAllMutation = useMutation({
    mutationFn: () => gradingApi.confirmAllGrades(selectedProblem!.problem_id),
    onSuccess: (res) => {
      toast.success(`${res.data?.confirmed_count ?? 0}명 채점이 확정되었습니다`)
      qc.invalidateQueries({ queryKey: ['grades', selectedProblem?.problem_id] })
      qc.invalidateQueries({ queryKey: ['grading-progress', examId] })
    },
    onError: () => toast.error('일괄 확정에 실패했습니다'),
  })

  // ── 점수/루브릭 수정 (LLM 뷰용) ──────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ gradeId, body }: { gradeId: number; body: GradeUpdateRequest }) =>
      gradingApi.updateGrade(gradeId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grades', selectedProblem?.problem_id] })
    },
    onError: () => toast.error('수정에 실패했습니다'),
  })

  // ── AUTO 뷰: grade 생성 후 즉시 확정 (학생별 확정 시) ────────────────
  const createGradeMutation = useMutation({
    mutationFn: async ({
      problemId,
      studentId,
      score,
    }: {
      problemId: number
      studentId: number
      score: number
    }) => {
      const res = await gradingApi.createGrade(problemId, studentId, { score })
      if (res.data?.grade_id) {
        await gradingApi.confirmGrade(res.data.grade_id)
      }
      return res
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grades', selectedProblem?.problem_id] })
      qc.invalidateQueries({ queryKey: ['grading-progress', examId] })
      setSelectedSheetIdx((i) => Math.min(i + 1, sheetsData.length - 1))
    },
    onError: () => toast.error('채점 저장에 실패했습니다'),
  })

  // ── 채점 초기화 ───────────────────────────────────────────────────────
  const deleteGradesMutation = useMutation({
    mutationFn: (problemId: number) => gradingApi.deleteGrades(problemId),
    onSuccess: () => {
      toast.success('채점이 초기화되었습니다')
      qc.invalidateQueries({ queryKey: ['grades', selectedProblem?.problem_id] })
      qc.invalidateQueries({ queryKey: ['grading-progress', examId] })
    },
    onError: () => toast.error('채점 초기화에 실패했습니다'),
  })

  // ── AUTO 뷰: grade 수정 후 즉시 확정 (수정 모드 확정 시) ────────────
  const updateAutoGradeMutation = useMutation({
    mutationFn: async ({ gradeId, score }: { gradeId: number; score: number }) => {
      await gradingApi.updateGrade(gradeId, { score })
      await gradingApi.confirmGrade(gradeId)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grades', selectedProblem?.problem_id] })
      qc.invalidateQueries({ queryKey: ['grading-progress', examId] })
      setSelectedSheetIdx((i) => Math.min(i + 1, sheetsData.length - 1))
    },
    onError: () => toast.error('수정에 실패했습니다'),
  })

  // ── 네비게이션 헬퍼 ──────────────────────────────────────────────────
  const openDetail = useCallback((problem: ProblemRow) => {
    setSelectedProblem(problem)
    setSelectedGradeIdx(0)
    setSelectedSheetIdx(0)
    setJobId(null)
    setView('detail')
  }, [])

  const goToList = useCallback(() => {
    setView('list')
    setSelectedProblem(null)
    setJobId(null)
  }, [])

  const navGrade = useCallback(
    (delta: number) =>
      setSelectedGradeIdx((i) => Math.max(0, Math.min(i + delta, grades.length - 1))),
    [grades.length],
  )

  const navSheet = useCallback(
    (delta: number) =>
      setSelectedSheetIdx((i) => Math.max(0, Math.min(i + delta, sheetsData.length - 1))),
    [sheetsData.length],
  )

  const selectedGrade = grades[selectedGradeIdx] ?? null
  const isLastGrade = selectedGradeIdx === grades.length - 1

  const selectedSheet: AnswerSheetResponse | null = sheetsData[selectedSheetIdx] ?? null
  const isLastSheet = selectedSheetIdx >= sheetsData.length - 1

  // 현재 sheet의 학생에 대한 grade (없으면 null)
  const currentGrade: GradeResponse | null =
    selectedSheet?.student_id != null
      ? (grades.find((g) => g.student_id === selectedSheet.student_id) ?? null)
      : null

  // ── 문제 목록 (language 조회용) ──────────────────────────────────────
  const { data: problemsList = [] } = useQuery({
    queryKey: ['problems', examId],
    queryFn: () => problemsApi.list(examId).then((r) => r.data ?? []),
    enabled: !!examId,
  })

  const selectedProblemLanguage: ProgrammingLanguage | null =
    problemsList.find((p) => p.problem_id === selectedProblem?.problem_id)?.language ?? null

  // ── 답안지 PDF & 영역 (AUTO 뷰용) ────────────────────────────────────
  const isAutoView =
    !!selectedProblem && AUTO_TYPES.includes(selectedProblem.type) && view === 'detail'

  const selectedAnswerSheetId = selectedSheet?.answer_sheet_id ?? null

  const { data: sheetDownloadRes } = useQuery({
    queryKey: ['sheet-download', selectedAnswerSheetId],
    queryFn: () => sheetsApi.getDownloadUrl(selectedAnswerSheetId!).then((r) => r.data),
    enabled: !!selectedAnswerSheetId && isAutoView,
  })

  const { data: sheetRegionsRes } = useQuery({
    queryKey: ['regions', selectedAnswerSheetId],
    queryFn: () => regionsApi.getSheetRegions(selectedAnswerSheetId!),
    enabled: !!selectedAnswerSheetId && isAutoView,
  })

  const selectedSheetRegions: AnswerRegionResponse[] = sheetRegionsRes?.data ?? []

  return {
    view,
    progress,
    isProgressLoading: progressQuery.isLoading,
    selectedProblem,
    openDetail,
    goToList,
    grades,
    isGradesLoading: gradesQuery.isLoading,
    isGrading,
    gradingJobProgress: gradingJob?.progress_json ?? null,
    runGrading,
    // LLM 뷰 네비게이션
    selectedGradeIdx,
    setSelectedGradeIdx,
    navGrade,
    selectedGrade,
    isLastGrade,
    confirmGrade: (gradeId: number) => confirmMutation.mutate(gradeId),
    isConfirming: confirmMutation.isPending,
    confirmAll: () => confirmAllMutation.mutate(),
    isConfirmingAll: confirmAllMutation.isPending,
    updateGrade: (gradeId: number, body: GradeUpdateRequest) =>
      updateMutation.mutate({ gradeId, body }),
    isUpdating: updateMutation.isPending,
    // AUTO 뷰 네비게이션
    sheets: sheetsData,
    selectedSheetIdx,
    navSheet,
    selectedSheet,
    isLastSheet,
    currentGrade,
    createAutoGrade: (studentId: number, score: number) =>
      selectedProblem &&
      createGradeMutation.mutate({
        problemId: selectedProblem.problem_id,
        studentId,
        score,
      }),
    isCreatingAutoGrade: createGradeMutation.isPending,
    updateAutoGrade: (gradeId: number, score: number) =>
      updateAutoGradeMutation.mutate({ gradeId, score }),
    isUpdatingAutoGrade: updateAutoGradeMutation.isPending,
    deleteGrades: () =>
      selectedProblem && deleteGradesMutation.mutate(selectedProblem.problem_id),
    isDeletingGrades: deleteGradesMutation.isPending,
    // 공통
    selectedModelAnswer,
    selectedProblemLanguage,
    selectedSheetPdfUrl: sheetDownloadRes?.url ?? null,
    selectedSheetRegions,
  }
}
