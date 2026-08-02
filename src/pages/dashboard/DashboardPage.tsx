import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sparkles,
  Plus,
  Search,
  SlidersHorizontal,
  Users,
  Clock,
  X,
} from "lucide-react";
import { ExamActions } from "@/components/common/ExamActions";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/api/auth";
import { examsApi } from "@/api/exams";
import {
  useExamInvitations,
  useExamMembers,
} from "@/hooks/exam/useInvitations";
import type { ExamResponse, ExamMemberResponse } from "@/types/dto";
import type { ExamStep, InvitationStatus } from "@/types/enums";

import { cn } from "@/lib/utils";

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_CFG: Record<
  ExamStep,
  {
    label: string;
    chipCls: string;
    barColor: string;
    progLabel: string;
    pct: number;
  }
> = {
  0: {
    label: "준비",
    chipCls: "bg-[#eef0f3] text-[#8a8f99]",
    barColor: "#c2c6cd",
    progLabel: "아직 시작 안 함",
    pct: 0,
  },
  1: {
    label: "진행 중",
    chipCls: "bg-accent/[.1] text-accent",
    barColor: "#4F46E5",
    progLabel: "문제지 세팅 중",
    pct: 14,
  },
  2: {
    label: "진행 중",
    chipCls: "bg-accent/[.1] text-accent",
    barColor: "#4F46E5",
    progLabel: "루브릭 설정 중",
    pct: 29,
  },
  3: {
    label: "진행 중",
    chipCls: "bg-accent/[.1] text-accent",
    barColor: "#4F46E5",
    progLabel: "답안지 업로드 중",
    pct: 43,
  },
  4: {
    label: "진행 중",
    chipCls: "bg-accent/[.1] text-accent",
    barColor: "#4F46E5",
    progLabel: "답안 영역 지정 중",
    pct: 57,
  },
  5: {
    label: "진행 중",
    chipCls: "bg-accent/[.1] text-accent",
    barColor: "#4F46E5",
    progLabel: "OCR 확인 중",
    pct: 71,
  },
  6: {
    label: "진행 중",
    chipCls: "bg-accent/[.1] text-accent",
    barColor: "#4F46E5",
    progLabel: "채점 진행 중",
    pct: 86,
  },
  7: {
    label: "완료",
    chipCls: "bg-[#e7f6ee] text-[#138a5a]",
    barColor: "#16a86a",
    progLabel: "채점 완료",
    pct: 100,
  },
};

type DisplayFilter = "ALL" | "DRAFT" | "IN_PROGRESS" | "DONE";
const FILTER_OPTIONS: { value: DisplayFilter; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "DRAFT", label: "준비" },
  { value: "IN_PROGRESS", label: "진행 중" },
  { value: "DONE", label: "완료" },
];

function matchesFilter(exam: ExamResponse, filter: DisplayFilter): boolean {
  if (filter === "ALL") return true;
  if (filter === "IN_PROGRESS") return exam.step >= 1 && exam.step <= 6;
  if (filter === "DONE") return exam.step === 7;
  return exam.step === 0;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return `${Math.floor(days / 7)}주 전`;
}

// ── Create Exam Modal ──────────────────────────────────────────────────────
const createSchema = z.object({
  name: z
    .string()
    .min(1, "시험 이름을 입력하세요")
    .max(100, "100자 이내로 입력하세요"),
  description: z.string().max(200, "200자 이내로 입력하세요").optional(),
});
type CreateForm = z.infer<typeof createSchema>;

function CreateExamModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });
  const descLen = watch("description", "")?.length ?? 0;

  const mutation = useMutation({
    mutationFn: (data: CreateForm) =>
      examsApi.create({ name: data.name, description: data.description }),
    onSuccess: (res) => {
      if (res.data) {
        queryClient.invalidateQueries({ queryKey: ["exams"] });
        toast.success("시험이 생성되었습니다.");
        reset();
        onClose();
      }
    },
    onError: () => toast.error("시험 생성에 실패했습니다."),
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-[480px] bg-white rounded-[18px] shadow-[0_24px_60px_rgba(13,16,28,.34)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-[26px] pt-[24px]">
          <div>
            <p className="text-[20px] font-extrabold text-[#15171d] tracking-[-0.02em]">
              새 시험 만들기
            </p>
            <p className="text-[13.5px] text-[#71757e] mt-1">
              시험을 만든 뒤 문제지와 답안지를 설정합니다
            </p>
          </div>
          <button
            onClick={() => {
              reset();
              onClose();
            }}
            className="w-[32px] h-[32px] rounded-[8px] bg-[#f4f5f7] flex items-center justify-center text-[#9aa0ab] hover:bg-[#ebedf1] transition-colors flex-none"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div className="px-[26px] pt-[22px]">
            <label className="block text-[13.5px] font-semibold text-[#3a3e46] mb-[7px]">
              시험 이름 <span className="text-accent">*</span>
            </label>
            <input
              type="text"
              placeholder="예: 2026 자료구조 중간고사"
              autoFocus
              {...register("name")}
              className={cn(
                "w-full h-[46px] border-[1.5px] rounded-[11px] bg-white px-[14px] text-[15px] text-[#15171d]",
                "outline-none transition-colors placeholder:text-[#aab0ba]",
                errors.name
                  ? "border-red-400"
                  : "border-accent shadow-[0_0_0_3px_rgba(79,70,229,.12)]",
              )}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
            )}

            <label className="block text-[13.5px] font-semibold text-[#3a3e46] mb-[7px] mt-[18px]">
              설명
            </label>
            <textarea
              placeholder="스택·큐·트리 단원 서술형 및 손코딩 문제"
              {...register("description")}
              className="w-full h-[96px] border-[1.5px] border-[#e0e3e9] rounded-[11px] bg-[#fbfbfc] px-[14px] py-[13px] text-[14.5px] text-[#15171d] placeholder:text-[#9aa0ab] outline-none focus:border-accent transition-colors resize-none leading-[1.55]"
            />
            <p className="text-[12px] text-[#aab0ba] text-right mt-1">
              {descLen} / 200
            </p>
          </div>

          <div className="flex justify-end gap-[10px] px-[26px] pt-[8px] pb-[24px]">
            <button
              type="button"
              onClick={() => {
                reset();
                onClose();
              }}
              className="h-[44px] px-5 border border-[#e0e3e9] bg-white rounded-[11px] text-[15px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="h-[44px] px-[22px] bg-accent text-white text-[15px] font-bold rounded-[11px] shadow-[0_4px_12px_rgba(79,70,229,.3)] disabled:opacity-60 transition-opacity"
            >
              {mutation.isPending ? "생성 중..." : "시험 만들기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Invite Modal ───────────────────────────────────────────────────────────
const inviteSchema = z.object({
  email: z
    .string()
    .min(1, "이메일을 입력하세요")
    .email("올바른 이메일 형식이 아닙니다"),
});
type InviteForm = z.infer<typeof inviteSchema>;

const INVITE_STATUS_CFG: Record<
  InvitationStatus,
  { label: string; cls: string }
> = {
  PENDING: { label: "대기 중", cls: "bg-[#eef0f3] text-[#8a8f99]" },
  ACCEPTED: { label: "수락됨", cls: "bg-[#e7f6ee] text-[#138a5a]" },
  DECLINED: { label: "거절됨", cls: "bg-[#f0f1f4] text-[#9aa0ab]" },
  CANCELED: { label: "취소됨", cls: "bg-[#f0f1f4] text-[#9aa0ab]" },
};

export function InviteModal({
  exam,
  onClose,
}: {
  exam: ExamResponse;
  onClose: () => void;
}) {
  const { invitations, create, creating, cancel } = useExamInvitations(
    exam.exam_id,
  );
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteForm>({ resolver: zodResolver(inviteSchema) });

  const onSubmit = async (data: InviteForm) => {
    try {
      await create({ email: data.email });
      reset();
    } catch {
      // 오류 안내는 훅에서 토스트로 처리
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-[480px] bg-white rounded-[18px] shadow-[0_24px_60px_rgba(13,16,28,.34)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-[26px] pt-[24px]">
          <div className="min-w-0">
            <p className="text-[20px] font-extrabold text-[#15171d] tracking-[-0.02em]">
              공동 채점자 초대
            </p>
            <p className="text-[13.5px] text-[#71757e] mt-1 truncate">
              {exam.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-[32px] h-[32px] rounded-[8px] bg-[#f4f5f7] flex items-center justify-center text-[#9aa0ab] hover:bg-[#ebedf1] transition-colors flex-none"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-[26px] pt-[22px]">
          <label className="block text-[13.5px] font-semibold text-[#3a3e46] mb-[7px]">
            이메일
          </label>
          <div className="flex gap-[10px]">
            <input
              type="email"
              placeholder="초대할 사용자의 이메일"
              autoFocus
              {...register("email")}
              className={cn(
                "flex-1 h-[46px] border-[1.5px] rounded-[11px] bg-[#fbfbfc] px-[14px] text-[14.5px] text-[#15171d]",
                "outline-none focus:border-accent transition-colors placeholder:text-[#aab0ba]",
                errors.email ? "border-red-400" : "border-[#e0e3e9]",
              )}
            />
            <button
              type="submit"
              disabled={creating}
              className="h-[46px] px-[20px] bg-accent text-white text-[14.5px] font-bold rounded-[11px] shadow-[0_4px_12px_rgba(79,70,229,.25)] disabled:opacity-60 transition-opacity flex-none"
            >
              초대
            </button>
          </div>
          {errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
          )}
        </form>

        <div className="px-[26px] pt-[20px] pb-[24px]">
          <p className="text-[12.5px] font-semibold text-[#9aa0ab] mb-[10px]">
            보낸 초대
          </p>
          {invitations.length === 0 ? (
            <p className="text-[13.5px] text-[#aab0ba] py-[14px] text-center">
              아직 보낸 초대가 없습니다.
            </p>
          ) : (
            <div className="flex flex-col gap-[8px] max-h-[240px] overflow-y-auto">
              {invitations.map((inv) => {
                const cfg = INVITE_STATUS_CFG[inv.status];
                return (
                  <div
                    key={inv.invitation_id}
                    className="flex items-center gap-[10px] py-[8px] px-[12px] rounded-[10px] bg-[#fafbfc] border border-[#f0f1f4]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-[#15171d] truncate">
                        {inv.invitee_name}
                      </p>
                      <p className="text-[12.5px] text-[#9aa0ab] truncate">
                        {inv.invitee_email}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-[11.5px] font-bold px-[9px] py-[3px] rounded-[20px] flex-none",
                        cfg.cls,
                      )}
                    >
                      {cfg.label}
                    </span>
                    {inv.status === "PENDING" && (
                      <button
                        onClick={() => cancel(inv.invitation_id)}
                        className="text-[12.5px] text-[#c0392b] font-semibold hover:underline flex-none"
                      >
                        취소
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Members Modal ──────────────────────────────────────────────────────────
export function MembersModal({
  exam,
  onClose,
}: {
  exam: ExamResponse;
  onClose: () => void;
}) {
  const { members, isLoading, remove } = useExamMembers(exam.exam_id);
  const [confirmTarget, setConfirmTarget] = useState<ExamMemberResponse | null>(
    null,
  );
  const myMemberId = useAuthStore((s) => s.member?.member_id);
  // 현재 사용자가 이 시험의 소유자인지
  const iAmOwner = members.some(
    (m) => m.member_id === myMemberId && m.is_owner,
  );

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      >
        <div
          className="w-[480px] bg-white rounded-[18px] shadow-[0_24px_60px_rgba(13,16,28,.34)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between px-[26px] pt-[24px]">
            <div className="min-w-0">
              <p className="text-[20px] font-extrabold text-[#15171d] tracking-[-0.02em]">
                채점자
              </p>
              <p className="text-[13.5px] text-[#71757e] mt-1 truncate">
                {exam.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-[32px] h-[32px] rounded-[8px] bg-[#f4f5f7] flex items-center justify-center text-[#9aa0ab] hover:bg-[#ebedf1] transition-colors flex-none"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-[26px] pt-[22px] pb-[24px]">
            {isLoading ? (
              <p className="text-[13.5px] text-[#aab0ba] py-[14px] text-center">
                불러오는 중...
              </p>
            ) : (
              <div className="flex flex-col gap-[8px] max-h-[300px] overflow-y-auto">
                {members.map((m) => (
                  <div
                    key={m.member_id}
                    className="flex items-center gap-[10px] py-[8px] px-[12px] rounded-[10px] bg-[#fafbfc] border border-[#f0f1f4]"
                  >
                    <div className="w-[30px] h-[30px] rounded-full bg-[#eceef2] flex items-center justify-center text-[12px] font-semibold text-[#71757e] flex-none">
                      {m.name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-[#15171d] truncate">
                        {m.name}
                      </p>
                      <p className="text-[12.5px] text-[#9aa0ab] truncate">
                        {m.email}
                      </p>
                    </div>
                    {(() => {
                      const isMe = m.member_id === myMemberId;
                      // 본인이면서 소유자가 아님 → 나가기
                      if (isMe && !iAmOwner) {
                        return (
                          <button
                            onClick={() => setConfirmTarget(m)}
                            className="text-[12.5px] text-[#c0392b] font-semibold hover:underline flex-none"
                          >
                            나가기
                          </button>
                        );
                      }
                      // 내가 소유자이고 상대가 다른 사람 → 내보내기
                      if (iAmOwner && !isMe) {
                        return (
                          <button
                            onClick={() => setConfirmTarget(m)}
                            className="text-[12.5px] text-[#c0392b] font-semibold hover:underline flex-none"
                          >
                            내보내기
                          </button>
                        );
                      }
                      // 소유자 표시 (그 외에는 아무 액션 없음)
                      if (m.is_owner) {
                        return (
                          <span className="text-[11.5px] font-bold px-[9px] py-[3px] rounded-[20px] bg-accent/[.1] text-accent flex-none">
                            소유자
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onClick={() => setConfirmTarget(null)}
        >
          <div
            className="w-[360px] bg-white rounded-[16px] shadow-[0_24px_60px_rgba(13,16,28,.34)] p-[24px]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[16px] font-extrabold text-[#15171d] tracking-[-0.02em]">
              {confirmTarget.member_id === myMemberId
                ? "시험 나가기"
                : "채점자 내보내기"}
            </p>
            <p className="text-[13.5px] text-[#71757e] leading-[1.55] mt-[8px]">
              {confirmTarget.member_id === myMemberId ? (
                "이 시험의 채점에서 나가시겠어요?"
              ) : (
                <>
                  <span className="font-semibold text-[#3a3e46]">
                    {confirmTarget.name}
                  </span>
                  님을 이 시험의 채점자에서 내보낼까요?
                </>
              )}
            </p>
            <div className="flex justify-end gap-[10px] mt-[20px]">
              <button
                onClick={() => setConfirmTarget(null)}
                className="h-[40px] px-[16px] border border-[#e0e3e9] bg-white rounded-[10px] text-[14px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => {
                  remove(confirmTarget.member_id);
                  setConfirmTarget(null);
                }}
                className="h-[40px] px-[18px] bg-[#c0392b] text-white rounded-[10px] text-[14px] font-bold hover:opacity-90 transition-opacity"
              >
                {confirmTarget.member_id === myMemberId ? "나가기" : "내보내기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Exam Card ──────────────────────────────────────────────────────────────
function ExamCard({
  exam,
  onDelete,
}: {
  exam: ExamResponse;
  onDelete: (id: number) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEntering, setIsEntering] = useState(false);
  const cfg = STATUS_CFG[exam.step as ExamStep];
  const pctColor =
    cfg.pct === 100 ? "#138a5a" : cfg.pct === 0 ? "#aab0ba" : "#4b4f57";

  const enterExam = async () => {
    if (isEntering) return;

    if (exam.step !== 0) {
      navigate(`/exam/${exam.exam_id}/step/${exam.step}`);
      return;
    }

    setIsEntering(true);
    try {
      await examsApi.advance(exam.exam_id, 0);
      await queryClient.invalidateQueries({ queryKey: ["exams"] });
      navigate(`/exam/${exam.exam_id}/step/1`);
    } catch {
      toast.error("시험을 시작하지 못했습니다.");
    } finally {
      setIsEntering(false);
    }
  };

  return (
    <>
      <div
        className="bg-white border border-[#ebedf1] rounded-[14px] p-[20px_20px_17px] flex flex-col cursor-pointer hover:shadow-[0_10px_24px_rgba(20,24,40,.10)] hover:border-[#dfe2e8] transition-all"
        onClick={enterExam}
      >
        <div className="flex items-start justify-between mb-[11px]">
          <div className="flex items-center gap-[7px]">
            <span
              className={cn(
                "text-[12px] font-bold px-[11px] py-[4px] rounded-[20px]",
                cfg.chipCls,
              )}
            >
              {cfg.label}
            </span>
            {!exam.is_owner && (
              <>
                <span className="text-[#8a8f99]">•</span>
                <span className="text-[12px] font-bold px-[11px] py-[4px] rounded-[20px] bg-[#eef0f3] text-[#8a8f99]">
                  공유됨
                </span>
              </>
            )}
          </div>
          <ExamActions exam={exam} onDelete={onDelete} />
        </div>

        <p className="text-[18px] font-bold text-[#15171d] tracking-[-0.02em] mb-[5px] line-clamp-1">
          {exam.name}
        </p>
        <p className="text-[13.5px] text-[#71757e] leading-[1.5] mb-[18px] min-h-[40px] line-clamp-2">
          {exam.description ?? "설명 없음"}
        </p>

        <div className="flex items-center justify-between mb-[7px]">
          <span className="text-[12.5px] text-[#9aa0ab] font-medium">
            {cfg.progLabel}
          </span>
          <span className="text-[12.5px] font-bold" style={{ color: pctColor }}>
            {cfg.pct}%
          </span>
        </div>
        <div className="h-[7px] rounded-[5px] bg-[#eef0f3] overflow-hidden mb-[15px]">
          <div
            className="h-full rounded-[5px]"
            style={{ width: `${cfg.pct}%`, backgroundColor: cfg.barColor }}
          />
        </div>

        <div className="flex items-center gap-[14px] pt-[13px] border-t border-[#f0f1f4]">
          <span className="flex items-center gap-[5px] text-[12.5px] text-[#71757e]">
            <Users size={14} />
            {exam.student_count}명
          </span>
          <span className="flex items-center gap-[5px] text-[12.5px] text-[#9aa0ab] ml-auto">
            <Clock size={13} />
            {formatRelativeTime(exam.updated_at ?? exam.created_at)}
          </span>
        </div>
      </div>
    </>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-white border border-[#ebedf1] rounded-[14px] p-[20px] flex flex-col gap-3 animate-pulse h-[220px]">
      <div className="w-14 h-5 bg-[#eef0f3] rounded-full" />
      <div className="w-4/5 h-5 bg-[#eef0f3] rounded" />
      <div className="w-3/5 h-4 bg-[#eef0f3] rounded" />
      <div className="w-full h-4 bg-[#eef0f3] rounded" />
      <div className="mt-auto w-full h-[7px] bg-[#eef0f3] rounded-full" />
    </div>
  );
}

// ── Dashboard Page ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DisplayFilter>("ALL");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const filterDropRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const member = useAuthStore((s) => s.member);
  const setAuth = useAuthStore((s) => s.setAuth);

  const { data: freshMember } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me().then((r) => r.data),
    enabled: !!token,
  });

  useEffect(() => {
    if (freshMember && token) setAuth(token, freshMember);
  }, [freshMember, token, setAuth]);

  const displayMember = freshMember ?? member;

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!filterOpen) return;
    const h = (e: MouseEvent) => {
      if (
        !filterDropRef.current?.contains(e.target as Node) &&
        !filterBtnRef.current?.contains(e.target as Node)
      )
        setFilterOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [filterOpen]);

  const { data: examsRes, isLoading } = useQuery({
    queryKey: ["exams"],
    queryFn: () => examsApi.list(),
  });
  const allExams = examsRes?.data ?? [];

  const exams = allExams.filter(
    (e) =>
      (!search || e.name.toLowerCase().includes(search.toLowerCase())) &&
      matchesFilter(e, statusFilter),
  );

  const statsInProgress = allExams.filter(
    (e) => e.step >= 1 && e.step <= 6,
  ).length;
  const statsDone = allExams.filter((e) => e.step === 7).length;
  const statsDraft = allExams.filter((e) => e.step === 0).length;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => examsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      toast.success("시험이 삭제되었습니다.");
    },
    onError: () => toast.error("삭제에 실패했습니다."),
  });

  const activeFilterLabel =
    FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label ?? "전체";

  return (
    <>
      <div className="h-screen flex flex-col bg-[#f7f8fa] overflow-hidden">
        {/* ── Navbar ── */}
        <div className="h-[62px] flex-none bg-white border-b border-[#ecedf1] flex items-center px-[26px] gap-[22px]">
          <div
            className="flex items-center gap-2 flex-none cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="w-8 h-8 rounded-[8px] bg-accent flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="text-[15px] font-extrabold text-[#15171d] tracking-tight">
              Grading
            </span>
          </div>

          <div className="flex items-center gap-[6px]">
            <button
              className="w-[74px] text-center text-[14.5px] text-[#71757e] font-medium py-[7px] rounded-[8px] hover:bg-[#f7f8fa] transition-colors"
              onClick={() => navigate("/")}
            >
              홈
            </button>
            <span className="w-[74px] text-center text-[14.5px] text-[#1a1d24] font-semibold py-[7px] rounded-[8px] bg-[#f1f2f5]">
              내 시험
            </span>
          </div>

          <div
            className="ml-auto flex items-center gap-[9px] pl-[14px] border-l border-[#ecedf1] cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/account")}
          >
            {displayMember?.profile_url ? (
              <img
                src={displayMember.profile_url}
                alt="profile"
                className="w-[34px] h-[34px] rounded-full object-cover flex-none"
              />
            ) : (
              <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-accent to-[#7c83f0] flex items-center justify-center text-white font-bold text-[14px] flex-none">
                {displayMember?.name?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div className="leading-[1.25]">
              <p className="text-[13.5px] font-semibold text-[#1a1d24]">
                {displayMember?.name ?? displayMember?.email ?? ""}
              </p>
              <p className="text-[11.5px] text-[#9aa0ab]">
                {displayMember?.affiliation ?? ""}
              </p>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-[34px] py-[30px]">
          {/* Hero row */}
          <div className="flex items-end justify-between mb-[24px]">
            <div>
              <h1 className="text-[27px] font-extrabold text-[#15171d] tracking-[-0.03em]">
                내 시험
              </h1>
              <p className="text-[14px] text-[#71757e] mt-1">
                진행 중 {statsInProgress} · 완료 {statsDone} · 준비 {statsDraft}
              </p>
            </div>

            <div className="flex items-center gap-[10px]">
              <div className="flex items-center gap-[8px] h-[40px] px-[13px] bg-white border border-[#e4e6eb] rounded-[10px] w-[220px]">
                <Search size={16} className="text-[#9aa0ab] flex-none" />
                <input
                  type="text"
                  placeholder="시험 검색"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="flex-1 text-[14px] text-[#15171d] placeholder:text-[#b0b4bc] outline-none bg-transparent"
                />
              </div>

              <div className="relative">
                <button
                  ref={filterBtnRef}
                  className="flex items-center gap-[7px] h-[40px] px-[14px] bg-white border border-[#e4e6eb] rounded-[10px] text-[14px] text-[#4b4f57] font-medium hover:bg-[#f7f8fa] transition-colors"
                  onClick={() => setFilterOpen((p) => !p)}
                >
                  <SlidersHorizontal size={15} className="text-[#9aa0ab]" />
                  상태
                  {statusFilter !== "ALL" && (
                    <span className="text-[12px] font-bold text-accent">
                      · {activeFilterLabel}
                    </span>
                  )}
                </button>
                {filterOpen && (
                  <div
                    ref={filterDropRef}
                    className="absolute right-0 top-[calc(100%+6px)] bg-white border border-[#e0e3e9] rounded-[10px] shadow-lg py-[6px] w-[120px] z-10"
                  >
                    {FILTER_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        className={cn(
                          "w-full px-3 py-[9px] text-left text-[13.5px] hover:bg-[#f7f8fa]",
                          statusFilter === o.value
                            ? "font-bold text-accent"
                            : "text-[#3a3e46]",
                        )}
                        onClick={() => {
                          setStatusFilter(o.value);
                          setFilterOpen(false);
                        }}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="flex items-center gap-[7px] h-[40px] px-[16px] bg-accent text-white text-[14.5px] font-bold rounded-[10px] shadow-[0_2px_8px_rgba(79,70,229,.25)] hover:opacity-90 transition-opacity"
                onClick={() => setCreateOpen(true)}
              >
                <Plus size={17} />새 시험
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-3 gap-[18px]">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : exams.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-1">
              <p className="text-[16px] font-semibold text-[#9aa0ab]">
                시험이 없습니다
              </p>
              <p className="text-[13.5px] text-[#b0b4bc]">
                새 시험을 만들어 시작하세요
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-[18px]">
              {exams.map((exam) => (
                <ExamCard
                  key={exam.exam_id}
                  exam={exam}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateExamModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
