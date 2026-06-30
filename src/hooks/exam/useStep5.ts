import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ocrApi } from '@/api/ocr'
import { sheetsApi } from '@/api/sheets'
import { problemsApi } from '@/api/problems'
import { useJobPolling } from '@/hooks/common/useJobPolling'
import type { ApiResponse, OcrResultResponse } from '@/types/dto'
import type { UpdateOcrResultBody } from '@/api/ocr'

export type Step5View = 'list' | 'detail'
type AllOcrPhase = 'idle' | 'calling' | 'running'

export function useStep5(examId: number) {
  const qc = useQueryClient()

  const [view, setView] = useState<Step5View>('list')
  const [selectedStudentIdx, setSelectedStudentIdx] = useState(0)
  const [selectedProblemIdx, setSelectedProblemIdx] = useState(0)
  const [localText, setLocalText] = useState('')
  const [localChoice, setLocalChoice] = useState<number | null>(null)

  // 전체 OCR 상태
  const [allOcrPhase, setAllOcrPhase] = useState<AllOcrPhase>('idle')
  const [allOcrJobId, setAllOcrJobId] = useState<number | null>(null)

  // 개별 학생 OCR 상태
  const [studentOcrJobId, setStudentOcrJobId] = useState<number | null>(null)
  const [studentOcrStudentId, setStudentOcrStudentId] = useState<number | null>(null)
  const [pendingDetailIdx, setPendingDetailIdx] = useState<number | null>(null)
  // 재실행 시 결과 캐시 무효화 대상 student_id (stale closure 방지용 ref)
  const rerunStudentIdRef = useRef<number | null>(null)

  // 학생별 인식 진행률
  const { data: progressRes, refetch: refetchProgress } = useQuery({
    queryKey: ['ocr-progress', examId],
    queryFn: () => ocrApi.getProgress(examId),
    enabled: !!examId,
  })
  const progress = progressRes?.data ?? null
  const students = progress?.students ?? []
  const selectedStudent = students[selectedStudentIdx] ?? null

  // 답안지 목록 (student_id → answer_sheet_id 매핑)
  const { data: sheetsData } = useQuery({
    queryKey: ['sheets', examId],
    queryFn: () => sheetsApi.list(examId).then(r => r.data ?? []),
    enabled: !!examId,
  })
  const sheetMap = useMemo(() => {
    const map = new Map<number, number>()
    sheetsData?.forEach(s => {
      if (s.student_id != null) map.set(s.student_id, s.answer_sheet_id)
    })
    return map
  }, [sheetsData])

  // 문제 목록 (객관식 choice_count 참조용)
  const { data: problems = [] } = useQuery({
    queryKey: ['problems', examId],
    queryFn: () => problemsApi.list(examId).then(r => r.data ?? []),
    enabled: !!examId,
  })

  // 선택 학생의 OCR 결과
  const { data: resultsRes } = useQuery({
    queryKey: ['ocr-results', selectedStudent?.student_id],
    queryFn: () => ocrApi.getStudentResults(selectedStudent!.student_id),
    enabled: !!selectedStudent && view === 'detail',
  })
  const results: OcrResultResponse[] = resultsRes?.data ?? []
  const selectedResult = results[selectedProblemIdx] ?? null

  // 선택 결과가 바뀌면 로컬 에디터 상태 동기화
  useEffect(() => {
    if (!selectedResult) return
    setLocalText(selectedResult.text ?? '')
    setLocalChoice(selectedResult.marked_choice ?? null)
  }, [selectedResult?.ocr_result_id])

  // 답안지 PDF URL
  const answerSheetId = selectedResult?.answer_sheet_id ?? null
  const { data: downloadRes } = useQuery({
    queryKey: ['sheet-download', answerSheetId],
    queryFn: () => sheetsApi.getDownloadUrl(answerSheetId!).then(r => r.data),
    enabled: !!answerSheetId && view === 'detail',
  })
  const pdfUrl = downloadRes?.url ?? null

  // 전체 OCR 폴링
  useJobPolling({
    jobId: allOcrJobId ? String(allOcrJobId) : null,
    onComplete: () => {
      qc.invalidateQueries({ queryKey: ['ocr-progress', examId] })
      setAllOcrPhase('idle')
      setAllOcrJobId(null)
      toast.success('전체 OCR이 완료되었습니다.')
    },
    onError: () => {
      setAllOcrPhase('idle')
      setAllOcrJobId(null)
      toast.error('OCR 처리 중 오류가 발생했습니다.')
    },
  })

  // 개별 학생 OCR 폴링
  useJobPolling({
    jobId: studentOcrJobId ? String(studentOcrJobId) : null,
    onComplete: () => {
      qc.invalidateQueries({ queryKey: ['ocr-progress', examId] })
      if (rerunStudentIdRef.current !== null) {
        qc.invalidateQueries({ queryKey: ['ocr-results', rerunStudentIdRef.current] })
        rerunStudentIdRef.current = null
        toast.success('OCR이 완료되었습니다.')
      }
      const idx = pendingDetailIdx
      setStudentOcrJobId(null)
      setStudentOcrStudentId(null)
      setPendingDetailIdx(null)
      if (idx !== null) {
        setSelectedStudentIdx(idx)
        setSelectedProblemIdx(0)
        setView('detail')
      }
    },
    onError: () => {
      rerunStudentIdRef.current = null
      setStudentOcrJobId(null)
      setStudentOcrStudentId(null)
      setPendingDetailIdx(null)
      toast.error('OCR에 실패했습니다.')
    },
  })

  // 전체 OCR 실행 (버튼 트리거)
  const runAllOcr = useCallback(async () => {
    if (allOcrPhase !== 'idle') return
    setAllOcrPhase('calling')
    try {
      const res = await ocrApi.run(examId)
      if (res.data?.job_id) {
        setAllOcrJobId(res.data.job_id)
        setAllOcrPhase('running')
      } else {
        setAllOcrPhase('idle')
        qc.invalidateQueries({ queryKey: ['ocr-progress', examId] })
      }
    } catch {
      setAllOcrPhase('idle')
      toast.error('OCR 실행에 실패했습니다.')
    }
  }, [allOcrPhase, examId, qc])

  // 상세 뷰에서 현재 학생 OCR 재실행
  const rerunStudentOcr = useCallback(async () => {
    if (!selectedStudent || allOcrPhase !== 'idle' || !!studentOcrJobId) return
    const sheetId = sheetMap.get(selectedStudent.student_id)
    if (!sheetId) {
      toast.error('답안지 정보를 찾을 수 없습니다.')
      return
    }
    rerunStudentIdRef.current = selectedStudent.student_id
    setStudentOcrStudentId(selectedStudent.student_id)
    try {
      const res = await ocrApi.runSheetOcr(sheetId)
      if (res.data?.job_id) {
        setStudentOcrJobId(res.data.job_id)
      } else {
        qc.invalidateQueries({ queryKey: ['ocr-results', selectedStudent.student_id] })
        qc.invalidateQueries({ queryKey: ['ocr-progress', examId] })
        setStudentOcrStudentId(null)
        rerunStudentIdRef.current = null
      }
    } catch {
      setStudentOcrStudentId(null)
      rerunStudentIdRef.current = null
      toast.error('OCR 실행에 실패했습니다.')
    }
  }, [selectedStudent, allOcrPhase, studentOcrJobId, sheetMap, examId, qc])

  // 학생 클릭 — OCR 여부에 따라 개별 실행 또는 바로 상세 진입
  const handleStudentClick = useCallback(async (idx: number) => {
    const student = students[idx]
    if (!student) return
    if (allOcrPhase !== 'idle' || studentOcrJobId) return

    if (student.total_count > 0) {
      setSelectedStudentIdx(idx)
      setSelectedProblemIdx(0)
      setView('detail')
      return
    }

    const sheetId = sheetMap.get(student.student_id)
    if (!sheetId) {
      toast.error('답안지 정보를 찾을 수 없습니다.')
      return
    }

    setStudentOcrStudentId(student.student_id)
    setPendingDetailIdx(idx)
    try {
      const res = await ocrApi.runSheetOcr(sheetId)
      if (res.data?.job_id) {
        setStudentOcrJobId(res.data.job_id)
      } else {
        setStudentOcrStudentId(null)
        setPendingDetailIdx(null)
        qc.invalidateQueries({ queryKey: ['ocr-progress', examId] })
        setSelectedStudentIdx(idx)
        setSelectedProblemIdx(0)
        setView('detail')
      }
    } catch {
      setStudentOcrStudentId(null)
      setPendingDetailIdx(null)
      toast.error('OCR 실행에 실패했습니다.')
    }
  }, [students, sheetMap, allOcrPhase, studentOcrJobId, examId, qc])

  // 캐시 내 단일 결과 업데이트 헬퍼
  const patchCache = useCallback(
    (resultId: number, patch: Partial<OcrResultResponse>) => {
      qc.setQueryData(
        ['ocr-results', selectedStudent?.student_id],
        (old: ApiResponse<OcrResultResponse[]> | undefined) => {
          if (!old?.data) return old
          return { ...old, data: old.data.map(r => r.ocr_result_id === resultId ? { ...r, ...patch } : r) }
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
        setSelectedProblemIdx(p => p + 1)
      } else {
        setView('list')
        refetchProgress()
      }
    },
    onError: () => toast.error('확정에 실패했습니다.'),
  })

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
      const previousChoice = localChoice
      setLocalChoice(choice)
      updateMutation.mutate(
        { resultId: selectedResult.ocr_result_id, body: { marked_choice: choice } },
        { onError: () => setLocalChoice(previousChoice) },
      )
    },
    [selectedResult, localChoice, updateMutation],
  )

  const handleConfirm = useCallback(() => {
    if (!selectedResult) return
    if (localText !== (selectedResult.text ?? '')) {
      updateMutation.mutate(
        { resultId: selectedResult.ocr_result_id, body: { text: localText } },
        { onSuccess: () => confirmMutation.mutate(selectedResult.ocr_result_id) },
      )
    } else {
      confirmMutation.mutate(selectedResult.ocr_result_id)
    }
  }, [selectedResult, localText, updateMutation, confirmMutation])

  const handleSaveAndAdvance = useCallback(() => {
    if (!selectedResult) return
    const advance = () => {
      if (selectedProblemIdx < results.length - 1) {
        setSelectedProblemIdx(p => p + 1)
      } else {
        setView('list')
        refetchProgress()
      }
    }
    if (localText !== (selectedResult.text ?? '')) {
      updateMutation.mutate(
        { resultId: selectedResult.ocr_result_id, body: { text: localText } },
        { onSuccess: advance },
      )
    } else {
      advance()
    }
  }, [selectedResult, localText, updateMutation, selectedProblemIdx, results.length, refetchProgress])

  const isLastProblem = selectedProblemIdx === results.length - 1

  return {
    // OCR 실행
    isAllOcrRunning: allOcrPhase !== 'idle',
    runAllOcr,
    studentOcrStudentId,
    isStudentOcrRunning: !!studentOcrStudentId,
    handleStudentClick,
    rerunStudentOcr,
    // 뷰 상태
    view,
    // 메인 리스트
    progress,
    students,
    // 상세 — 학생
    selectedStudentIdx,
    selectedStudent,
    navStudent,
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
    handleSaveAndAdvance,
    isConfirming: confirmMutation.isPending,
    isUpdating: updateMutation.isPending,
    isLastProblem,
    // PDF
    pdfUrl,
  }
}
