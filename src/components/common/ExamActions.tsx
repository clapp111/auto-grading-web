import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { examsApi } from "@/api/exams";
import { useAuthStore } from "@/stores/authStore";
import {
  useExamInvitations,
  useExamMembers,
} from "@/hooks/exam/useInvitations";
import type { ExamResponse } from "@/types/dto";

interface ExamActionsProps {
  exam: ExamResponse;
  onDelete: (examId: number) => void;
  triggerClassName?: string;
}

export function ExamActions({
  exam,
  onDelete,
  triggerClassName = "text-[#c2c6cd] hover:text-[#9aa0ab] transition-colors p-1 -m-1 rounded",
}: ExamActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (
        !menuRef.current?.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  return (
    <>
      <div className="relative" onClick={(event) => event.stopPropagation()}>
        <button
          ref={buttonRef}
          type="button"
          aria-label="시험 메뉴"
          className={triggerClassName}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreHorizontal size={18} />
        </button>
        {menuOpen && (
          <div
            ref={menuRef}
            className="absolute right-0 top-[calc(100%+4px)] bg-white border border-[#e0e3e9] rounded-[10px] shadow-lg py-[5px] w-[110px] z-20"
          >
            {exam.is_owner && (
              <button
                className="w-full px-3 py-[9px] text-left text-[13px] text-[#3a3e46] hover:bg-[#f7f8fa] flex items-center gap-2"
                onClick={() => {
                  setMenuOpen(false);
                  setEditOpen(true);
                }}
              >
                <Pencil size={13} />
                시험 수정
              </button>
            )}
            {exam.is_owner && (
              <button
                className="w-full px-3 py-[9px] text-left text-[13px] text-[#3a3e46] hover:bg-[#f7f8fa] flex items-center gap-2"
                onClick={() => {
                  setMenuOpen(false);
                  setInviteOpen(true);
                }}
              >
                <UserPlus size={13} />
                초대
              </button>
            )}
            <button
              className="w-full px-3 py-[9px] text-left text-[13px] text-[#3a3e46] hover:bg-[#f7f8fa] flex items-center gap-2"
              onClick={() => {
                setMenuOpen(false);
                setMembersOpen(true);
              }}
            >
              <Users size={13} />
              채점자
            </button>
            {exam.is_owner && (
              <button
                className="w-full px-3 py-[9px] text-left text-[13px] text-[#c0392b] hover:bg-red-50 flex items-center gap-2"
                onClick={() => onDelete(exam.exam_id)}
              >
                <Trash2 size={13} />
                삭제
              </button>
            )}
          </div>
        )}
      </div>
      {inviteOpen && (
        <InviteDialog exam={exam} onClose={() => setInviteOpen(false)} />
      )}
      {membersOpen && (
        <MembersDialog exam={exam} onClose={() => setMembersOpen(false)} />
      )}
      {editOpen && (
        <EditDialog exam={exam} onClose={() => setEditOpen(false)} />
      )}
    </>
  );
}

function EditDialog({
  exam,
  onClose,
}: {
  exam: ExamResponse;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(exam.name);
  const [description, setDescription] = useState(exam.description ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await examsApi.update(exam.exam_id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["exams"] }),
        queryClient.invalidateQueries({ queryKey: ["exam", exam.exam_id] }),
      ]);
      toast.success("시험 정보가 수정되었습니다.");
      onClose();
    } catch {
      toast.error("시험 정보 수정에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-[480px] bg-white rounded-[18px] shadow-[0_24px_60px_rgba(13,16,28,.34)] overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between px-[26px] pt-[24px]">
          <div>
            <p className="text-[20px] font-extrabold text-[#15171d] tracking-[-0.02em]">
              시험 수정
            </p>
            <p className="text-[13.5px] text-[#71757e] mt-1">
              시험 이름과 설명을 수정합니다
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-[32px] h-[32px] rounded-[8px] bg-[#f4f5f7] flex items-center justify-center text-[#9aa0ab] hover:bg-[#ebedf1] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="px-[26px] pt-[22px]">
            <label className="block text-[13.5px] font-semibold text-[#3a3e46] mb-[7px]">
              시험 이름 <span className="text-accent">*</span>
            </label>
            <input
              autoFocus
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              className="w-full h-[46px] border-[1.5px] border-accent rounded-[11px] bg-white px-[14px] text-[15px] text-[#15171d] outline-none shadow-[0_0_0_3px_rgba(79,70,229,.12)]"
            />
            <label className="block text-[13.5px] font-semibold text-[#3a3e46] mb-[7px] mt-[18px]">
              설명
            </label>
            <textarea
              value={description}
              maxLength={200}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full h-[96px] border-[1.5px] border-[#e0e3e9] rounded-[11px] bg-[#fbfbfc] px-[14px] py-[13px] text-[14.5px] text-[#15171d] outline-none focus:border-accent transition-colors resize-none leading-[1.55]"
            />
            <p className="text-[12px] text-[#aab0ba] text-right mt-1">
              {description.length} / 200
            </p>
          </div>
          <div className="flex justify-end gap-[10px] px-[26px] pt-[8px] pb-[24px]">
            <button
              type="button"
              onClick={onClose}
              className="h-[44px] px-5 border border-[#e0e3e9] bg-white rounded-[11px] text-[15px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="h-[44px] px-[22px] bg-accent text-white text-[15px] font-bold rounded-[11px] shadow-[0_4px_12px_rgba(79,70,229,.3)] disabled:opacity-60 transition-opacity"
            >
              {isSaving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InviteDialog({
  exam,
  onClose,
}: {
  exam: ExamResponse;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const { invitations, create, creating, cancel } = useExamInvitations(
    exam.exam_id,
  );
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) return;
    try {
      await create({ email });
      setEmail("");
    } catch {
      // The hook presents the error toast.
    }
  };
  return (
    <Dialog onClose={onClose} title="공동 채점자 초대" subtitle={exam.name}>
      <form onSubmit={submit} className="flex gap-[10px] mb-[20px]">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          placeholder="초대할 사용자의 이메일"
          className="flex-1 h-[46px] border-[1.5px] border-[#e0e3e9] rounded-[11px] bg-[#fbfbfc] px-[14px] text-[14.5px] outline-none focus:border-accent"
        />
        <button
          disabled={creating}
          className="h-[46px] px-[20px] bg-accent text-white text-[14.5px] font-bold rounded-[11px] disabled:opacity-60"
        >
          초대
        </button>
      </form>
      <p className="text-[12.5px] font-semibold text-[#9aa0ab] mb-[10px]">
        보낸 초대
      </p>
      <div className="flex flex-col gap-[8px] max-h-[240px] overflow-y-auto">
        {invitations.map((invitation) => (
          <div
            key={invitation.invitation_id}
            className="flex items-center gap-[10px] py-[8px] px-[12px] rounded-[10px] bg-[#fafbfc] border border-[#f0f1f4]"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold truncate">
                {invitation.invitee_name}
              </p>
              <p className="text-[12.5px] text-[#9aa0ab] truncate">
                {invitation.invitee_email}
              </p>
            </div>
            {invitation.status === "PENDING" && (
              <button
                onClick={() => cancel(invitation.invitation_id)}
                className="text-[12.5px] text-[#c0392b] font-semibold"
              >
                취소
              </button>
            )}
          </div>
        ))}
        {invitations.length === 0 && (
          <p className="text-[13.5px] text-[#aab0ba] py-[14px] text-center">
            아직 보낸 초대가 없습니다.
          </p>
        )}
      </div>
    </Dialog>
  );
}

function MembersDialog({
  exam,
  onClose,
}: {
  exam: ExamResponse;
  onClose: () => void;
}) {
  const { members, isLoading, remove } = useExamMembers(exam.exam_id);
  const myMemberId = useAuthStore((state) => state.member?.member_id);
  return (
    <Dialog onClose={onClose} title="채점자" subtitle={exam.name}>
      <div className="flex flex-col gap-[8px] max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <p className="text-[13.5px] text-[#aab0ba] py-[14px] text-center">
            불러오는 중...
          </p>
        ) : (
          members.map((member) => {
            const isMe = member.member_id === myMemberId;
            return (
              <div
                key={member.member_id}
                className="flex items-center gap-[10px] py-[8px] px-[12px] rounded-[10px] bg-[#fafbfc] border border-[#f0f1f4]"
              >
                <div className="w-[30px] h-[30px] rounded-full bg-[#eceef2] flex items-center justify-center text-[12px] font-semibold text-[#71757e]">
                  {member.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold truncate">
                    {member.name}
                  </p>
                  <p className="text-[12.5px] text-[#9aa0ab] truncate">
                    {member.email}
                  </p>
                </div>
                {!member.is_owner && (exam.is_owner || isMe) && (
                  <button
                    onClick={() => remove(member.member_id)}
                    className="text-[12.5px] text-[#c0392b] font-semibold"
                  >
                    {isMe ? "나가기" : "내보내기"}
                  </button>
                )}
                {member.is_owner && (
                  <span className="text-[11.5px] font-bold px-[9px] py-[3px] rounded-[20px] bg-accent/[.1] text-accent">
                    소유자
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </Dialog>
  );
}

function Dialog({
  children,
  onClose,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-[480px] bg-white rounded-[18px] shadow-[0_24px_60px_rgba(13,16,28,.34)] p-[26px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-[22px]">
          <div className="min-w-0">
            <p className="text-[20px] font-extrabold text-[#15171d]">{title}</p>
            <p className="text-[13.5px] text-[#71757e] mt-1 truncate">
              {subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-[32px] h-[32px] rounded-[8px] bg-[#f4f5f7] flex items-center justify-center text-[#9aa0ab]"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
