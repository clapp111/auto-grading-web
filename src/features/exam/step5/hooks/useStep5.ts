import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ocrApi } from '@/api/ocr'
import { sheetsApi } from '@/api/sheets'
import { problemsApi } from '@/api/problems'
import { useJobPolling } from '@/hooks/useJobPolling'
import type { ApiResponse, OcrResultResponse } from '@/types/dto'
import type { UpdateOcrResultBody } from '@/api/ocr'

export type Step5View = 'list' | 'detail'
type OcrPhase = 'calling' | 'running' | 'done'

export function useStep5(examId: number) {
  const qc = useQueryClient()

  const [view, setView] = useState<Step5View>('list')
  const [selectedStudentIdx, setSelectedStudentIdx] = useState(0)
  const [selectedProblemIdx, setSelectedProblemIdx] = useState(0)
  const [localText, setLocalText] = useState('')
  const [localChoice, setLocalChoice] = useState<number | null>(null)

  // OCR job 추적
  const [ocrPhase, setOcrPhase] = useState<OcrPhase>('calling')
  const [ocrJobId, setOcrJobId] = useState<number | null>(null)

  useEffect(() => {
    ocrApi.run(examId)
      .then((res) => {
        if (res.data?.job_id) {
          setOcrJobId(res.data.job_id)
          setOcrPhase('running')
        } else {
          setOcrPhase('done')
        }
      })
      .catch(() => setOcrPhase('done'))
  }, [examId])

  useJobPolling({
    jobId: ocrJobId ? String(ocrJobId) : null,
    onComplete: () => {
      setOcrPhase('done')
      setOcrJobId(null)
    },
    onError: () => {
      setOcrPhase('done')
      setOcrJobId(null)
      toast.error('OCR 처리 중 오류가 발생했습니다.')
    },
  })

  // 학생별 인식 진행률
  const { data: progressRes, refetch: refetchProgress } = useQuery({
    queryKey: ['ocr-progress', examId],
    queryFn: () => ocrApi.getProgress(examId),
    enabled: !!examId,
  })

  const progress = progressRes?.data ?? null
  const students = progress?.students ?? []
  const selectedStudent = students[selectedStudentIdx] ?? null

  // 문제 목록 (객관식 choice_count 참조용)
  const { data: problems = [] } = useQuery({
    queryKey: ['problems', examId],
    queryFn: () => problemsApi.list(examId).then((r) => r.data ?? []),
    enabled: !!examId,
  })

  // 선택 학생의 OCR 결과
  const { data: resultsRes, refetch: refetchResults } = useQuery({
    queryKey: ['ocr-results', selectedStudent?.student_id],
    queryFn: () => ocrApi.getStudentResults(selectedStudent!.student_id),
    enabled: !!selectedStudent,
  })
  const results: OcrResultResponse[] = resultsRes?.data ?? []
  const selectedResult = results[selectedProblemIdx] ?? null

  // 선택 결과가 바뀌면 로컬 에디터 상태 동기화
  useEffect(() => {
    if (!selectedResult) return
    setLocalText(selectedResult.text ?? '')
    setLocalChoice(selectedResult.marked_choice ?? null)
  }, [selectedResult?.ocr_result_id])

  // 답안지 PDF URL (상세 뷰에서만)
  const answerSheetId = selectedResult?.answer_sheet_id ?? null
  const { data: downloadRes } = useQuery({
    queryKey: ['sheet-download', answerSheetId],
    queryFn: () => sheetsApi.getDownloadUrl(answerSheetId!).then((r) => r.data),
    enabled: !!answerSheetId && view === 'detail',
  })
  const pdfUrl = downloadRes?.url ?? null

  // 캐시 내 단일 결과 업데이트 헬퍼
  const patchCache = useCallback(
    (resultId: number, patch: Partial<OcrResultResponse>) => {
      qc.setQueryData(
        ['ocr-results', selectedStudent?.student_id],
        (old: ApiResponse<OcrResultResponse[]> | undefined) => {
          if (!old?.data) return old
          return { ...old, data: old.data.map((r) => (r.ocr_result_id === resultId ? { ...r, ...patch } : r)) }
        },
      )
    },
    [qc, selectedStudent?.student_id],
  )

  const updateMutation = useMutation({
    mutationFn: ({ resultId, body }: { resultId: number; body: UpdateOcrResultBody }) =>
      ocrApi.updateResult(resultId, body),
    onSuccess: (res, { resultId }) => {
      if (res.data) patchCache(resultId, res.data)
    },
    onError: () => toast.error('수정에 실패했습니다.'),
  })

  const confirmMutation = useMutation({
    mutationFn: (resultId: number) => ocrApi.confirmResult(resultId),
    onSuccess: (res, resultId) => {
      if (res.data) patchCache(resultId, res.data)
      if (selectedProblemIdx < results.length - 1) {
        setSelectedProblemIdx((p) => p + 1)
      } else {
        setView('list')
        refetchProgress()
      }
    },
    onError: () => toast.error('확정에 실패했습니다.'),
  })

  const openDetail = useCallback((idx: number) => {
    setSelectedStudentIdx(idx)
    setSelectedProblemIdx(0)
    setView('detail')
  }, [])

  const goToList = useCallback(() => {
    setView('list')
    refetchProgress()
  }, [refetchProgress])

  const navStudent = useCallback(
    (dir: 1 | -1) => {
      const next = selectedStudentIdx + dir
      if (next >= 0 && next < students.length) {
        setSelectedStudentIdx(next)
        setSelectedProblemIdx(0)
      }
    },
    [selectedStudentIdx, students.length],
  )

  const navProblem = useCallback(
    (dir: 1 | -1) => {
      const next = selectedProblemIdx + dir
      if (next >= 0 && next < results.length) setSelectedProblemIdx(next)
    },
    [selectedProblemIdx, results.length],
  )

  const saveText = useCallback(() => {
    if (!selectedResult) return
    if (localText === (selectedResult.text ?? '')) return
    updateMutation.mutate({ resultId: selectedResult.ocr_result_id, body: { text: localText } })
  }, [selectedResult, localText, updateMutation])

  const saveChoice = useCallback(
    (choice: number | null) => {
      if (!selectedResult) return
      setLocalChoice(choice)
      updateMutation.mutate({ resultId: selectedResult.ocr_result_id, body: { marked_choice: choice } })
    },
    [selectedResult, updateMutation],
  )

  const handleConfirm = useCallback(() => {
    if (!selectedResult) return
    // 텍스트 변경이 있으면 저장 후 확정
    if (localText !== (selectedResult.text ?? '')) {
      updateMutation.mutate(
        { resultId: selectedResult.ocr_result_id, body: { text: localText } },
        { onSuccess: () => confirmMutation.mutate(selectedResult.ocr_result_id) },
      )
    } else {
      confirmMutation.mutate(selectedResult.ocr_result_id)
    }
  }, [selectedResult, localText, updateMutation, confirmMutation])

  const isLastProblem = selectedProblemIdx === results.length - 1

  return {
    // OCR 실행 상태
    isOcrLoading: ocrPhase !== 'done',
    // 뷰 상태
    view,
    // 메인 리스트
    progress,
    students,
    // 상세 — 학생
    selectedStudentIdx,
    selectedStudent,
    navStudent,
    openDetail,
    goToList,
    // 상세 — 문제
    selectedProblemIdx,
    setSelectedProblemIdx,
    navProblem,
    results,
    selectedResult,
    problems,
    // 에디터 로컬 상태
    localText,
    setLocalText,
    saveText,
    localChoice,
    saveChoice,
    // 액션
    handleConfirm,
    isConfirming: confirmMutation.isPending,
    isUpdating: updateMutation.isPending,
    isLastProblem,
    // PDF
    pdfUrl,
  }
}
