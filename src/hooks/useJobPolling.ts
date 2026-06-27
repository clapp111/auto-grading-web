import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type { ApiResponse, JobResponse } from '@/types/dto'
import type { JobStatus } from '@/types/enums'

const TERMINAL_STATUSES: JobStatus[] = ['DONE', 'FAILED', 'CANCELED']

interface UseJobPollingOptions {
  jobId: string | null
  intervalMs?: number
  onComplete?: (job: JobResponse) => void
  onError?: (job: JobResponse) => void
}

export function useJobPolling({ jobId, intervalMs = 2000, onComplete, onError }: UseJobPollingOptions) {
  const query = useQuery({
    queryKey: ['job', jobId],
    queryFn: () =>
      apiClient.get<ApiResponse<JobResponse>>(`/jobs/${jobId}`).then((r) => r.data.data),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (!status || TERMINAL_STATUSES.includes(status)) return false
      return intervalMs
    },
  })

  const job = query.data
  const isRunning = !!job && !TERMINAL_STATUSES.includes(job.status)
  const isCompleted = job?.status === 'DONE'
  const isFailed = job?.status === 'FAILED'

  if (isCompleted && job) onComplete?.(job)
  if (isFailed && job) onError?.(job)

  return { job, isRunning, isCompleted, isFailed, ...query }
}
