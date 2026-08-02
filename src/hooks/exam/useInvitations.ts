import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  invitationsApi,
  type InvitationCreateRequest,
} from "@/api/invitations";
import type { InvitationStatus } from "@/types/enums";

// 초대 생성 실패 시 백엔드 오류 코드 → 사용자 안내 문구
const CREATE_ERROR_MESSAGE: Record<string, string> = {
  MEMBER_NOT_FOUND: "해당 이메일의 사용자를 찾을 수 없습니다.",
  SELF_INVITATION: "자기 자신은 초대할 수 없습니다.",
  ALREADY_EXAM_MEMBER: "이미 참여 중인 사용자입니다.",
  INVITATION_ALREADY_PENDING: "이미 초대한 사용자입니다.",
  EXAM_OWNER_REQUIRED: "초대 권한이 없습니다.",
};

function errorCode(err: unknown): string | undefined {
  return (err as { response?: { data?: { error?: { code?: string } } } })
    ?.response?.data?.error?.code;
}

// ── 소유자 관점: 시험에 보낸 초대 목록 + 초대 생성/취소 ──────────────────
export function useExamInvitations(examId: number, status?: InvitationStatus) {
  const qc = useQueryClient();

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["exam-invitations", examId] });

  const { data, isLoading } = useQuery({
    queryKey: ["exam-invitations", examId, status ?? null],
    queryFn: () =>
      invitationsApi.listSent(examId, status).then((r) => r.data ?? []),
    enabled: !!examId,
  });

  const createMutation = useMutation({
    mutationFn: (body: InvitationCreateRequest) =>
      invitationsApi.create(examId, body),
    onSuccess: () => {
      invalidate();
      toast.success("초대를 보냈습니다.");
    },
    onError: (err) =>
      toast.error(
        CREATE_ERROR_MESSAGE[errorCode(err) ?? ""] ??
          "초대 생성에 실패했습니다.",
      ),
  });

  const cancelMutation = useMutation({
    mutationFn: (invitationId: number) => invitationsApi.cancel(invitationId),
    onSuccess: invalidate,
    onError: () => toast.error("초대 취소에 실패했습니다."),
  });

  return {
    invitations: data ?? [],
    isLoading,
    create: createMutation.mutateAsync,
    creating: createMutation.isPending,
    cancel: cancelMutation.mutate,
  };
}

// ── 초대받은 사용자 관점: 내가 받은 초대 목록 + 수락/거절 ────────────────
export function useMyInvitations(status?: InvitationStatus) {
  const qc = useQueryClient();

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["my-invitations"] });

  const { data, isLoading } = useQuery({
    queryKey: ["my-invitations", status ?? null],
    queryFn: () =>
      invitationsApi.listReceived(status).then((r) => r.data ?? []),
  });

  const acceptMutation = useMutation({
    mutationFn: (invitationId: number) => invitationsApi.accept(invitationId),
    onSuccess: () => {
      invalidate();
      toast.success("초대를 수락했습니다.");
    },
    onError: () => toast.error("초대 수락에 실패했습니다."),
  });

  const declineMutation = useMutation({
    mutationFn: (invitationId: number) => invitationsApi.decline(invitationId),
    onSuccess: invalidate,
    onError: () => toast.error("초대 거절에 실패했습니다."),
  });

  // 현재 수락/거절 처리 중인 초대 ID (없으면 null) — 버튼 연타 방지용
  const respondingId = acceptMutation.isPending
    ? acceptMutation.variables
    : declineMutation.isPending
      ? declineMutation.variables
      : null;

  return {
    invitations: data ?? [],
    isLoading,
    accept: acceptMutation.mutate,
    decline: declineMutation.mutate,
    respondingId,
  };
}

// ── 시험 구성원 관리: 구성원 목록 + 제거/나가기 ──────────────────────────
export function useExamMembers(examId: number) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["exam-members", examId],
    queryFn: () => invitationsApi.listMembers(examId).then((r) => r.data ?? []),
    enabled: !!examId,
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: number) =>
      invitationsApi.removeMember(examId, memberId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["exam-members", examId] }),
    onError: () => toast.error("구성원 제거에 실패했습니다."),
  });

  return {
    members: data ?? [],
    isLoading,
    remove: removeMutation.mutate,
  };
}
