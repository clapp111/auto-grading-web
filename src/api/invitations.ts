import type {
  ApiResponse,
  ExamInvitationResponse,
  InvitationResponse,
  ExamMemberResponse,
} from "@/types/dto";
import type { InvitationStatus } from "@/types/enums";
import { apiClient } from "./client";

export interface InvitationCreateRequest {
  email: string;
}

export const invitationsApi = {
  // ── 소유자 관점 ──────────────────────────────────────────────────────
  // 이메일로 공동 채점자 초대 생성
  create: (examId: number, body: InvitationCreateRequest) =>
    apiClient
      .post<ApiResponse<ExamInvitationResponse>>(
        `/exams/${examId}/invitations`,
        body,
      )
      .then((r) => r.data),

  // 시험에 보낸 초대 목록 조회 (상태 필터)
  listSent: (examId: number, status?: InvitationStatus) =>
    apiClient
      .get<ApiResponse<ExamInvitationResponse[]>>(
        `/exams/${examId}/invitations`,
        { params: status ? { status } : undefined },
      )
      .then((r) => r.data),

  // 소유자가 보낸 대기 중 초대 취소
  cancel: (invitationId: number) =>
    apiClient
      .delete<ApiResponse<null>>(`/invitations/${invitationId}`)
      .then((r) => r.data),

  // ── 초대받은 사용자 관점 ─────────────────────────────────────────────
  // 내가 받은 초대 목록 조회 (상태 필터)
  listReceived: (status?: InvitationStatus) =>
    apiClient
      .get<ApiResponse<InvitationResponse[]>>("/invitations", {
        params: status ? { status } : undefined,
      })
      .then((r) => r.data),

  // 초대 수락 → 시험 참여자로 등록
  accept: (invitationId: number) =>
    apiClient
      .post<ApiResponse<null>>(`/invitations/${invitationId}/accept`)
      .then((r) => r.data),

  // 초대 거절
  decline: (invitationId: number) =>
    apiClient
      .post<ApiResponse<null>>(`/invitations/${invitationId}/decline`)
      .then((r) => r.data),

  // ── 시험 구성원 관리 ─────────────────────────────────────────────────
  // 시험 구성원(소유자 + 참여자) 목록
  listMembers: (examId: number) =>
    apiClient
      .get<ApiResponse<ExamMemberResponse[]>>(`/exams/${examId}/members`)
      .then((r) => r.data),

  // 참여자 내보내기 / 스스로 나가기
  removeMember: (examId: number, memberId: number) =>
    apiClient
      .delete<ApiResponse<null>>(`/exams/${examId}/members/${memberId}`)
      .then((r) => r.data),
};
