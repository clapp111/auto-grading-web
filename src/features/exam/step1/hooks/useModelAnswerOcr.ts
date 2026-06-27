import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { usePresignedUpload } from '@/hooks/usePresignedUpload'
import { useJobPolling } from '@/hooks/useJobPolling'
import { problemsApi, type ModelAnswerOcrRequest, type ModelAnswerUpdateRequest } from '@/api/problems'

export function useModelAnswerOcr(examId: number, initialModelAnswerUrl?: string | null) {
  const qc = useQueryClient()
  const { upload, uploading } = usePresignedUpload()
  const [activeJobId, setActiveJobId] = useState<number | null>(null)
  const [modelAnswerBlobUrl, setModelAnswerBlobUrl] = useState<string | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['model-answers', examId] })

  const { data, isLoading } = useQuery({
    queryKey: ['model-answers', examId],
    queryFn: () => problemsApi.listModelAnswers(examId).then(r => r.data ?? []),
    enabled: !!examId,
  })

  const uploadFile = async (file: File) => {
    const res = await problemsApi.getModelAnswerUploadUrl(examId, file.name, file.type)
    if (!res.data) { toast.error('업로드 URL 발급에 실패했습니다.'); return }
    await upload(res.data, file)
    setModelAnswerBlobUrl(URL.createObjectURL(file))
    invalidate()
  }

  const ocrMutation = useMutation({
    mutationFn: ({ problemId, body }: { problemId: number; body: ModelAnswerOcrRequest }) =>
      problemsApi.runModelAnswerOcr(problemId, body),
    onSuccess: (res) => {
      if (res.data) setActiveJobId(res.data.job_id)
    },
    onError: () => toast.error('OCR 실행에 실패했습니다.'),
  })

  useJobPolling({
    jobId: activeJobId ? String(activeJobId) : null,
    onComplete: () => {
      invalidate()
      setActiveJobId(null)
      toast.success('모범답안 OCR이 완료되었습니다.')
    },
    onError: () => {
      setActiveJobId(null)
      toast.error('OCR에 실패했습니다.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ problemId, body }: { problemId: number; body: ModelAnswerUpdateRequest }) =>
      problemsApi.updateModelAnswer(problemId, body),
    onSuccess: invalidate,
    onError: () => toast.error('모범답안 저장에 실패했습니다.'),
  })

  return {
    modelAnswers: data ?? [],
    isLoading,
    modelAnswerUrl: modelAnswerBlobUrl ?? initialModelAnswerUrl ?? null,
    uploading,
    uploadFile,
    runOcr: ocrMutation.mutate,
    ocrRunning: !!activeJobId,
    updateModelAnswer: updateMutation.mutate,
  }
}
