import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { examsApi } from '@/api/exams'
import { problemsApi } from '@/api/problems'
import { sheetsApi } from '@/api/sheets'
import { regionsApi } from '@/api/regions'
import { useJobPolling } from '@/hooks/useJobPolling'
import { TYPE_COLORS, TYPE_TEXT_COLORS } from '@/features/exam/step1/constants'
import type { Region, Point, AnswerRegionResponse } from '@/types/dto'
import type { LayoutMode, RegionShape } from '@/types/enums'
import type { DrawSelection } from '@/features/exam/step1/components/PdfCanvas'

export interface LocalRegion {
  tempId: string
  problem_id: number
  bbox_region: Region
  shape: RegionShape
  polygon_points?: Point[]
}

let _tempId = 0
const nextTempId = () => `tmp-${++_tempId}`

interface AddRegionVars {
  bbox_region: Region
  shape: RegionShape
  polygon_points?: Point[]
  sheetId: number
  problemId: number
  tempId: string
}

interface DeleteRegionVars {
  regionId: number
  sheetId: number
}

export function useStep4(examId: number) {
  const qc = useQueryClient()

  const [selectedSheetIdx, setSelectedSheetIdx] = useState(0)
  const [activeProblemId, setActiveProblemId] = useState<number | null>(null)
  const [drawTool, setDrawTool] = useState<'rect' | 'lasso'>('rect')
  const [currentPage, setCurrentPage] = useState(1)
  const [applyJobId, setApplyJobId] = useState<number | null>(null)
  const [localRegions, setLocalRegions] = useState<LocalRegion[]>([])
  const [pendingRegions, setPendingRegions] = useState<LocalRegion[]>([])

  const { data: examRes } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => examsApi.get(examId),
    enabled: !!examId,
  })

  const { data: problemsRes } = useQuery({
    queryKey: ['problems', examId],
    queryFn: () => problemsApi.list(examId),
    enabled: !!examId,
  })

  const { data: sheetsRes } = useQuery({
    queryKey: ['answer-sheets', examId],
    queryFn: () => sheetsApi.list(examId),
    enabled: !!examId,
  })

  const exam = examRes?.data ?? null
  const problems = problemsRes?.data ?? []
  const sheets = sheetsRes?.data ?? []
  const selectedSheet = sheets[selectedSheetIdx] ?? null
  const firstSheet = sheets[0] ?? null

  const effectiveActiveProblemId = activeProblemId ?? problems[0]?.problem_id ?? null

  const { data: downloadRes } = useQuery({
    queryKey: ['sheet-download', selectedSheet?.answer_sheet_id],
    queryFn: () => sheetsApi.getDownloadUrl(selectedSheet!.answer_sheet_id).then((r) => r.data),
    enabled: !!selectedSheet,
  })

  const { data: firstRegionsRes, refetch: refetchFirstRegions } = useQuery({
    queryKey: ['regions', firstSheet?.answer_sheet_id],
    queryFn: () => regionsApi.getSheetRegions(firstSheet!.answer_sheet_id),
    enabled: !!firstSheet,
  })

  const { data: selectedRegionsRes } = useQuery({
    queryKey: ['regions', selectedSheet?.answer_sheet_id],
    queryFn: () => regionsApi.getSheetRegions(selectedSheet!.answer_sheet_id),
    enabled: !!selectedSheet,
  })

  const firstSheetRegions: AnswerRegionResponse[] = firstRegionsRes?.data ?? []
  const selectedSheetRegions: AnswerRegionResponse[] = selectedRegionsRes?.data ?? []

  const layoutMode: LayoutMode = exam?.layout_mode ?? 'FIXED'
  const isFixedMode = layoutMode === 'FIXED'
  const isTemplateApplied = firstSheetRegions.length > 0
  const isFineTuneMode = !isFixedMode || isTemplateApplied
  const canApplyTemplate = isFixedMode && (isTemplateApplied || localRegions.length > 0)

  useJobPolling({
    jobId: applyJobId ? String(applyJobId) : null,
    onComplete: () => {
      toast.success('모든 답안지에 템플릿이 적용되었습니다.')
      setApplyJobId(null)
      setLocalRegions([])
      refetchFirstRegions()
      qc.invalidateQueries({ queryKey: ['regions'] })
    },
    onError: () => {
      toast.error('템플릿 적용에 실패했습니다.')
      setApplyJobId(null)
    },
  })

  const addRegionMutation = useMutation({
    mutationFn: ({ bbox_region, shape, polygon_points, sheetId, problemId }: AddRegionVars) =>
      regionsApi.addRegion(sheetId, {
        problem_id: problemId,
        shape,
        bbox_region,
        ...(polygon_points ? { polygon_points } : {}),
      }),
    onMutate: ({ tempId, problemId, bbox_region, shape, polygon_points }) => {
      setPendingRegions((prev) => [
        ...prev,
        { tempId, problem_id: problemId, bbox_region, shape, polygon_points },
      ])
    },
    onSuccess: async (_, { sheetId, tempId }) => {
      await qc.invalidateQueries({ queryKey: ['regions', sheetId] })
      setPendingRegions((prev) => prev.filter((r) => r.tempId !== tempId))
    },
    onError: (_, { tempId }) => {
      setPendingRegions((prev) => prev.filter((r) => r.tempId !== tempId))
      toast.error('영역 추가에 실패했습니다.')
    },
  })

  const deleteRegionMutation = useMutation({
    mutationFn: ({ regionId }: DeleteRegionVars) => regionsApi.deleteRegion(regionId),
    onSuccess: (_, { sheetId }) =>
      qc.invalidateQueries({ queryKey: ['regions', sheetId] }),
    onError: () => toast.error('영역 삭제에 실패했습니다.'),
  })

  const saveAndApplyMutation = useMutation({
    mutationFn: async () => {
      const templateSource = isTemplateApplied
        ? firstSheetRegions
            .filter((r): r is AnswerRegionResponse & { bbox_region: Region } => !!r.bbox_region)
            .map((r) => ({
              problem_id: r.problem_id,
              shape: r.shape,
              bbox_region: r.bbox_region,
              ...(r.polygon_points ? { polygon_points: r.polygon_points } : {}),
            }))
        : localRegions.map((r) => ({
            problem_id: r.problem_id,
            shape: r.shape,
            bbox_region: r.bbox_region,
            ...(r.polygon_points ? { polygon_points: r.polygon_points } : {}),
          }))

      if (templateSource.length === 0) {
        throw new Error('영역을 먼저 지정해주세요.')
      }

      await regionsApi.saveTemplate(examId, templateSource)
      const applyRes = await regionsApi.applyTemplate(examId)
      return applyRes.data
    },
    onSuccess: (jobData) => {
      if (jobData?.job_id) {
        setApplyJobId(jobData.job_id)
        toast.success('템플릿을 저장했습니다. 전체 답안지에 적용 중...')
      }
    },
    onError: (err: Error) => toast.error(err.message || '템플릿 적용에 실패했습니다.'),
  })

  const setLayoutModeMutation = useMutation({
    mutationFn: (mode: LayoutMode) => examsApi.update(examId, { layout_mode: mode }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['exam', examId] }),
        qc.invalidateQueries({ queryKey: ['regions'] }),
      ])
    },
    onError: () => toast.error('레이아웃 모드 변경에 실패했습니다.'),
  })

  const handleDrawComplete = useCallback(
    (selection: DrawSelection) => {
      if (!effectiveActiveProblemId) {
        toast.error('매핑할 문제를 먼저 선택해주세요.')
        return
      }

      const bbox_region = selection.bbox_region
      const shape = selection.shape
      const polygon_points = selection.shape === 'LASSO' ? selection.polygon_points : undefined

      if (isFineTuneMode) {
        if (!selectedSheet) return
        addRegionMutation.mutate({
          bbox_region,
          shape,
          polygon_points,
          sheetId: selectedSheet.answer_sheet_id,
          problemId: effectiveActiveProblemId,
          tempId: nextTempId(),
        })
        return
      }

      setLocalRegions((prev) => [
        ...prev,
        { tempId: nextTempId(), problem_id: effectiveActiveProblemId, bbox_region, shape, polygon_points },
      ])
    },
    [effectiveActiveProblemId, isFineTuneMode, selectedSheet, addRegionMutation],
  )

  const deleteLocalRegion = useCallback(
    (tempId: string) => setLocalRegions((prev) => prev.filter((r) => r.tempId !== tempId)),
    [],
  )

  const problemColor = useCallback(
    (problemId: number) => {
      const problem = problems.find((p) => p.problem_id === problemId)
      return problem ? TYPE_COLORS[problem.type] : '#9aa0ab'
    },
    [problems],
  )

  const problemTextColor = useCallback(
    (problemId: number) => {
      const problem = problems.find((p) => p.problem_id === problemId)
      return problem ? TYPE_TEXT_COLORS[problem.type] : '#9aa0ab'
    },
    [problems],
  )

  const overlays = useMemo(() => {
    let source: {
      problem_id: number
      bbox_region: Region
      shape?: RegionShape
      polygon_points?: Point[] | null
    }[]

    if (isFineTuneMode) {
      const serverSource = selectedSheetRegions
        .filter((r): r is AnswerRegionResponse & { bbox_region: Region } => !!r.bbox_region)
        .map((r) => ({
          problem_id: r.problem_id,
          bbox_region: r.bbox_region,
          shape: r.shape,
          polygon_points: r.polygon_points,
        }))
      const pendingSource = pendingRegions.map((r) => ({
        problem_id: r.problem_id,
        bbox_region: r.bbox_region,
        shape: r.shape,
        polygon_points: r.polygon_points,
      }))
      source = [...serverSource, ...pendingSource]
    } else {
      source = localRegions.map((r) => ({
        problem_id: r.problem_id,
        bbox_region: r.bbox_region,
        shape: r.shape,
        polygon_points: r.polygon_points,
      }))
    }

    return source.map(({ problem_id, bbox_region, shape, polygon_points }) => {
      const problem = problems.find((p) => p.problem_id === problem_id)
      return {
        region: bbox_region,
        label: problem?.label ?? String(problem_id),
        color: problemColor(problem_id),
        shape: shape ?? ('RECT' as RegionShape),
        polygon_points: polygon_points ?? undefined,
      }
    })
  }, [isFineTuneMode, selectedSheetRegions, pendingRegions, localRegions, problems, problemColor])

  const mappingList = useMemo(() => {
    const toItem = (r: LocalRegion, i: number) => {
      const problem = problems.find((p) => p.problem_id === r.problem_id)
      return {
        key: r.tempId,
        index: i + 1,
        problemLabel: problem?.label ?? String(r.problem_id),
        color: problemColor(r.problem_id),
        textColor: problemTextColor(r.problem_id),
        serverId: null as number | null,
        tempId: r.tempId,
        isPending: true,
      }
    }

    if (isFineTuneMode) {
      const serverItems = selectedSheetRegions.map((r, i) => {
        const problem = problems.find((p) => p.problem_id === r.problem_id)
        return {
          key: String(r.answer_region_id),
          index: i + 1,
          problemLabel: problem?.label ?? String(r.problem_id),
          color: problemColor(r.problem_id),
          textColor: problemTextColor(r.problem_id),
          serverId: r.answer_region_id,
          tempId: null as string | null,
          isPending: false,
        }
      })
      const pendingItems = pendingRegions.map((r, i) => toItem(r, serverItems.length + i))
      return [...serverItems, ...pendingItems]
    }

    return localRegions.map(toItem)
  }, [
    isFineTuneMode,
    selectedSheetRegions,
    pendingRegions,
    localRegions,
    problems,
    problemColor,
    problemTextColor,
  ])

  return {
    exam,
    problems,
    sheets,
    selectedSheet,
    selectedSheetIdx,
    setSelectedSheetIdx,
    layoutMode,
    isFixedMode,
    isFineTuneMode,
    isTemplateApplied,
    isApplying: !!applyJobId,
    pdfUrl: downloadRes?.url ?? null,
    currentPage,
    setCurrentPage,
    overlays,
    mappingList,
    activeProblemId: effectiveActiveProblemId,
    setActiveProblemId,
    drawTool,
    setDrawTool,
    handleDrawComplete,
    deleteRegion: (regionId: number, sheetId: number) =>
      deleteRegionMutation.mutate({ regionId, sheetId }),
    deleteLocalRegion,
    saveAndApplyTemplate: () => saveAndApplyMutation.mutate(),
    isSavingTemplate: saveAndApplyMutation.isPending,
    setLayoutMode: (mode: LayoutMode) => setLayoutModeMutation.mutate(mode),
    localRegionCount: localRegions.length,
    canApplyTemplate,
    problemColor,
    problemTextColor,
  }
}
