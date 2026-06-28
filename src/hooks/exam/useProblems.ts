import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { usePresignedUpload } from '@/hooks/common/usePresignedUpload'
import { problemsApi, type ProblemCreateRequest, type ProblemUpdateRequest } from '@/api/problems'

export function useProblems(examId: number, initialSheetUrl?: string | null) {
  const qc = useQueryClient()
  const { upload, uploading: sheetUploading } = usePresignedUpload()
  const [sheetBlobUrl, setSheetBlobUrl] = useState<string | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['problems', examId] })

  const { data, isLoading } = useQuery({
    queryKey: ['problems', examId],
    queryFn: () => problemsApi.list(examId).then(r => r.data ?? []),
    enabled: !!examId,
  })

  const uploadSheet = async (file: File) => {
    const res = await problemsApi.getProblemSheetUploadUrl(examId, file.name, file.type)
    if (!res.data) { toast.error('업로드 URL 발급에 실패했습니다.'); return }
    await upload(res.data, file)
    setSheetBlobUrl(URL.createObjectURL(file))
  }

  const createMutation = useMutation({
    mutationFn: (body: ProblemCreateRequest) => problemsApi.create(examId, body),
    onSuccess: invalidate,
    onError: () => toast.error('문제 추가에 실패했습니다.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ problemId, body }: { problemId: number; body: ProblemUpdateRequest }) =>
      problemsApi.update(problemId, body),
    onSuccess: invalidate,
    onError: () => toast.error('문제 수정에 실패했습니다.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (problemId: number) => problemsApi.delete(problemId),
    onSuccess: invalidate,
    onError: () => toast.error('문제 삭제에 실패했습니다.'),
  })

  return {
    problems: data ?? [],
    isLoading,
    sheetUrl: sheetBlobUrl ?? initialSheetUrl ?? null,
    sheetUploading,
    uploadSheet,
    create: createMutation.mutateAsync,
    update: (problemId: number, body: ProblemUpdateRequest) =>
      updateMutation.mutate({ problemId, body }),
    remove: deleteMutation.mutate,
  }
}
