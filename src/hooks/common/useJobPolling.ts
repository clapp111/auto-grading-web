import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { ApiResponse, JobResponse } from "@/types/dto";
import type { JobStatus } from "@/types/enums";

const TERMINAL_STATUSES: JobStatus[] = ["DONE", "FAILED", "CANCELED"];

interface UseJobPollingOptions {
  jobId: string | null;
  intervalMs?: number;
  onComplete?: (job: JobResponse) => void;
  onError?: (job: JobResponse) => void;
}

export function useJobPolling({
  jobId,
  intervalMs = 2000,
  onComplete,
  onError,
}: UseJobPollingOptions) {
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  onCompleteRef.current = onComplete;
  onErrorRef.current = onError;

  const query = useQuery({
    queryKey: ["job", jobId],
    queryFn: () =>
      apiClient
        .get<ApiResponse<JobResponse>>(`/jobs/${jobId}`)
        .then((r) => r.data.data),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || TERMINAL_STATUSES.includes(status)) return false;
      return intervalMs;
    },
  });

  const job = query.data;
  const isRunning = !!job && !TERMINAL_STATUSES.includes(job.status);
  const isCompleted = job?.status === "DONE";
  const isFailed = job?.status === "FAILED";

  useEffect(() => {
    if (!job) return;
    if (job.status === "DONE") onCompleteRef.current?.(job);
    if (job.status === "FAILED") onErrorRef.current?.(job);
  }, [job?.job_id, job?.status]);

  return { job, isRunning, isCompleted, isFailed, ...query };
}
