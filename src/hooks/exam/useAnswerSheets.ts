import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axios from "axios";
import {
  sheetsApi,
  type AnswerSheetPatchRequest,
  type IdRegionSaveRequest,
} from "@/api/sheets";
import { useJobPolling } from "@/hooks/common/useJobPolling";
import type { AnswerSheetResponse } from "@/types/dto";

export function useAnswerSheets(examId: number) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  // Queue of recognition job IDs — polled one at a time (head of queue is active)
  const [recognitionJobIds, setRecognitionJobIds] = useState<number[]>([]);
  const prevJobCountRef = useRef(0);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["answer-sheets", examId] });

  const { data, isLoading } = useQuery({
    queryKey: ["answer-sheets", examId],
    queryFn: () => sheetsApi.list(examId).then((r) => r.data ?? []),
    enabled: !!examId,
  });

  // Poll the head of the queue; on completion shift it off and refresh the list
  useJobPolling({
    jobId: recognitionJobIds[0] ? String(recognitionJobIds[0]) : null,
    onComplete: () => {
      invalidate();
      setRecognitionJobIds((prev) => prev.slice(1));
    },
    onError: () => {
      setRecognitionJobIds((prev) => prev.slice(1));
      toast.error("일부 답안지 인식에 실패했습니다.");
    },
  });

  // Single "all done" toast when the queue fully drains
  useEffect(() => {
    if (prevJobCountRef.current > 0 && recognitionJobIds.length === 0) {
      toast.success("학생 정보 인식이 완료되었습니다.");
    }
    prevJobCountRef.current = recognitionJobIds.length;
  }, [recognitionJobIds.length]);

  const uploadSheets = async (files: File[]) => {
    setUploading(true);
    let successCount = 0;
    const newJobIds: number[] = [];
    try {
      for (const file of files) {
        try {
          const presignedRes = await sheetsApi.getPresignedUrl(examId, {
            file_name: file.name,
            content_type: file.type || "application/pdf",
          });
          if (!presignedRes.data) continue;

          const { upload_url, answer_sheet_id } = presignedRes.data;
          await axios.put(upload_url, file, {
            headers: { "Content-Type": file.type || "application/pdf" },
          });

          // Notify server upload is complete; server starts OCR if regions are already set
          const completeRes = await sheetsApi.completeUpload(answer_sheet_id);
          if (completeRes.data?.job_id) newJobIds.push(completeRes.data.job_id);

          successCount++;
        } catch {
          toast.error(`${file.name} 업로드에 실패했습니다.`);
        }
      }
      if (successCount > 0) {
        toast.success(`${successCount}개 파일이 업로드되었습니다.`);
        invalidate();
      }
      if (newJobIds.length > 0) {
        setRecognitionJobIds((prev) => [...prev, ...newJobIds]);
      }
    } finally {
      setUploading(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (sheetId: number) => sheetsApi.delete(sheetId),
    onSuccess: invalidate,
    onError: () => toast.error("삭제에 실패했습니다."),
  });

  const patchMutation = useMutation({
    mutationFn: ({
      sheetId,
      body,
    }: {
      sheetId: number;
      body: AnswerSheetPatchRequest;
    }) => sheetsApi.patch(sheetId, body),
    onSuccess: (res) => {
      // Update cache directly from PATCH response so the badge updates immediately
      const updated = res.data;
      if (updated) {
        qc.setQueryData(
          ["answer-sheets", examId],
          (old: AnswerSheetResponse[] | undefined) =>
            old?.map((s) =>
              s.answer_sheet_id === updated.answer_sheet_id ? updated : s,
            ),
        );
      }
    },
    onError: () => toast.error("수정에 실패했습니다."),
  });

  const saveIdRegionsMutation = useMutation({
    mutationFn: (body: IdRegionSaveRequest) =>
      sheetsApi.saveIdRegions(examId, body),
    onSuccess: (res) => {
      if (res.data?.job_id) {
        setRecognitionJobIds((prev) => [...prev, res.data!.job_id]);
      }
      toast.success("영역이 저장되었습니다. 인식을 시작합니다.");
    },
    onError: () => toast.error("영역 저장에 실패했습니다."),
  });

  const sheets = data ?? [];
  const matchedCount = sheets.filter(
    (s) => !!s.student_name && !!s.student_no,
  ).length;

  return {
    sheets,
    isLoading,
    uploading,
    matchedCount,
    recognizing: recognitionJobIds.length > 0,
    uploadSheets,
    deleteSheet: deleteMutation.mutate,
    patchSheet: (sheetId: number, body: AnswerSheetPatchRequest) =>
      patchMutation.mutate({ sheetId, body }),
    saveIdRegions: saveIdRegionsMutation.mutate,
    savingIdRegions: saveIdRegionsMutation.isPending,
  };
}
