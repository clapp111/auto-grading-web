import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useJobPolling } from '@/hooks/common/useJobPolling'
import { problemsApi, type RubricCreateRequest, type RubricUpdateRequest } from '@/api/problems'

export function useRubric(problemId: number) {
  const qc = useQueryClient()
  const [activeJobId, setActiveJobId] = useState<number | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['rubric', problemId] })

  const { data, isLoading } = useQuery({
    queryKey: ['rubric', problemId],
    queryFn: () => problemsApi.getRubric(problemId).then(r => r.data ?? []),
    enabled: !!problemId,
  })

  const suggestMutation = useMutation({
    mutationFn: () => problemsApi.suggestRubric(problemId),
    onSuccess: (res) => {
      if (res.data) setActiveJobId(res.data.job_id)
    },
    onError: () => toast.error('루브릭 추천 요청에 실패했습니다.'),
  })

  const { job: suggestJob } = useJobPolling({
    jobId: activeJobId ? String(activeJobId) : null,
    onComplete: () => {
      invalidate()
      setActiveJobId(null)
      toast.success('AI 루브릭 추천이 완료되었습니다.')
    },
    onError: () => {
      setActiveJobId(null)
      toast.error('루브릭 추천에 실패했습니다.')
    },
  })

  const addMutation = useMutation({
    mutationFn: (body: RubricCreateRequest) =>
      problemsApi.createRubricCriteria(problemId, body),
    onSuccess: invalidate,
    onError: () => toast.error('기준 추가에 실패했습니다.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ rubricId, body }: { rubricId: number; body: RubricUpdateRequest }) =>
      problemsApi.updateRubricCriteria(rubricId, body),
    onSuccess: invalidate,
    onError: () => toast.error('기준 수정에 실패했습니다.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (rubricId: number) => problemsApi.deleteRubricCriteria(rubricId),
    onSuccess: invalidate,
    onError: () => toast.error('기준 삭제에 실패했습니다.'),
  })

  const addCriterion = () => {
    addMutation.mutate({
      text: '',
      allocated_score: 0,
      order_index: data?.length ?? 0,
    })
  }

  return {
    rubric: data ?? [],
    isLoading,
    suggesting: !!activeJobId || suggestMutation.isPending,
    suggestJobProgress: suggestJob?.progress_json ?? null,
    suggest: suggestMutation.mutate,
    addCriterion,
    updateCriterion: (rubricId: number, body: RubricUpdateRequest) =>
      updateMutation.mutate({ rubricId, body }),
    deleteCriterion: deleteMutation.mutate,
  }
}
