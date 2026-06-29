import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { gradingApi, type GradeUpdateRequest } from '@/api/grading'
import { problemsApi } from '@/api/problems'
import { useJobPolling } from '@/hooks/common/useJobPolling'
import type { GradingProgressResponse, GradeResponse, ModelAnswerResponse } from '@/types/dto'
import type { ProblemType } from '@/types/enums'

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
  const [selectedGradeIdx, setSelectedGradeIdx] = useState(0)

  // ── 전체 채점 진행률 ──────────────────────────────────────────────────
  const progressQuery = useQuery({
    queryKey: ['grading-progress', examId],
    queryFn: () => gradingApi.getProgress(examId).then((r) => r.data),
    enabled: !!examId,
    refetchInterval: view === 'list' ? 10_000 : false,
  })
  const progress: GradingProgressResponse | null | undefined = progressQuery.data

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
    queryFn: () => gradingApi.getProblemGrades(selectedProblem!.problem_id).then((r) => r.data ?? []),
    enabled: !!selectedProblem && view === 'detail',
  })
  const grades: GradeResponse[] = gradesQuery.data ?? []

  // ── 채점 job 폴링 ────────────────────────────────────────────────────
  const { isRunning: isGrading } = useJobPolling({
    jobId,
    onComplete: () => {
      setJobId(null)
      qc.invalidateQueries({ queryKey: ['grades', selectedProblem?.problem_id] })
      qc.invalidateQueries({ queryKey: ['grading-progress', examId] })
    },
    onError: () => {
      setJobId(null)
      toast.error('채점 중 오류가 발생했습니다')
    },
  })

  // ── 채점 실행 ─────────────────────────────────────────────────────────
  const runGrading = useCallback(async () => {
    if (!selectedProblem) return
    try {
      const res = await gradingApi.runForProblem(examId, selectedProblem.problem_id)
      if (res.data?.job_id) setJobId(String(res.data.job_id))
    } catch {
      toast.error('채점 실행에 실패했습니다')
    }
  }, [examId, selectedProblem])

  // ── 개별 확정 ─────────────────────────────────────────────────────────
  const confirmMutation = useMutation({
    mutationFn: (gradeId: number) => gradingApi.confirmGrade(gradeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grades', selectedProblem?.problem_id] })
      qc.invalidateQueries({ queryKey: ['grading-progress', examId] })
      // 다음 학생으로 이동
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

  // ── 점수/루브릭 수정 ──────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ gradeId, body }: { gradeId: number; body: GradeUpdateRequest }) =>
      gradingApi.updateGrade(gradeId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grades', selectedProblem?.problem_id] })
    },
    onError: () => toast.error('수정에 실패했습니다'),
  })

  // ── 네비게이션 헬퍼 ──────────────────────────────────────────────────
  const openDetail = useCallback((problem: ProblemRow) => {
    setSelectedProblem(problem)
    setSelectedGradeIdx(0)
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

  const selectedGrade = grades[selectedGradeIdx] ?? null
  const isLastGrade = selectedGradeIdx === grades.length - 1

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
    runGrading,
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
    selectedModelAnswer,
  }
}
