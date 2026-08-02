import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { examsApi } from "@/api/exams";
import { ExamActions } from "@/components/common/ExamActions";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    step: 1,
    label: "문제지 세팅",
    subLabels: ["문제 OCR", "모범답안 OCR", "정답 입력"],
  },
  { step: 2, label: "루브릭 설정", subLabels: [] },
  { step: 3, label: "학생 정보 입력", subLabels: [] },
  { step: 4, label: "답안 영역 지정", subLabels: [] },
  { step: 5, label: "답안 OCR 확인", subLabels: [] },
  { step: 6, label: "채점 확정", subLabels: [] },
  { step: 7, label: "성적 검토", subLabels: [] },
] as const;

interface ExamSidebarProps {
  examId: number;
  examName?: string;
  currentStep: number;
  currentSub?: number;
  examStep?: number;
}

export function ExamSidebar({
  examId,
  examName,
  currentStep,
  currentSub = 0,
  examStep,
}: ExamSidebarProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: examResponse } = useQuery({
    queryKey: ["exam", examId],
    queryFn: () => examsApi.get(examId),
    enabled: !!examId,
  });
  const exam = examResponse?.data;
  const maxReachable = Math.max(examStep ?? 0, 1);

  const deleteExam = async (id: number) => {
    try {
      await examsApi.delete(id);
      await queryClient.invalidateQueries({ queryKey: ["exams"] });
      toast.success("시험이 삭제되었습니다.");
      navigate("/dashboard");
    } catch {
      toast.error("시험 삭제에 실패했습니다.");
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-[#ecedf1]">
      {/* 브랜드 */}
      <div
        className="flex items-center gap-2 px-[18px] py-[18px] cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => navigate("/dashboard")}
      >
        <div className="w-8 h-8 rounded-[8px] bg-accent flex items-center justify-center flex-none">
          <Sparkles size={15} className="text-white" />
        </div>
        <span className="text-[15px] font-extrabold text-[#15171d] tracking-tight">
          Grading
        </span>
      </div>

      {/* 시험명 */}
      {examName && (
        <div className="px-[18px] pb-[14px]">
          <p className="text-[12px] text-[#9aa0ab] font-medium mb-[3px]">
            현재 시험
          </p>
          <div className="flex items-center gap-[6px] min-w-0">
            <p className="flex-1 text-[13.5px] font-semibold text-[#3a3e46] truncate">
              {examName}
            </p>
            {exam && (
              <ExamActions
                exam={exam}
                onDelete={deleteExam}
                triggerClassName="text-[#9aa0ab] hover:text-[#71757e] transition-colors p-1 -m-1 rounded flex-none"
              />
            )}
          </div>
        </div>
      )}

      <div className="h-px bg-[#f0f1f4] mx-[18px]" />

      {/* 스텝 목록 */}
      <nav className="flex-1 overflow-y-auto py-[14px] px-[10px]">
        {STEPS.map(({ step, label, subLabels }) => {
          const isActive = step === currentStep;
          const isDone = step < currentStep;
          const isReachable = step <= maxReachable;

          return (
            <div key={step}>
              <button
                type="button"
                disabled={!isReachable}
                onClick={() =>
                  navigate(
                    step === 1
                      ? `/exam/${examId}/step/1/1`
                      : `/exam/${examId}/step/${step}`,
                  )
                }
                className={cn(
                  "w-full flex items-center gap-[10px] px-[10px] py-[9px] rounded-[9px] text-left transition-colors",
                  isActive
                    ? "bg-accent/[.08] text-accent"
                    : isDone
                      ? "text-[#3a3e46] hover:bg-[#f7f8fa]"
                      : isReachable
                        ? "text-[#9aa0ab] hover:bg-[#f7f8fa]"
                        : "text-[#c8ccd4] cursor-not-allowed",
                )}
              >
                {/* 스텝 번호 원 */}
                <span
                  className={cn(
                    "w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-bold flex-none",
                    isActive
                      ? "bg-accent text-white"
                      : isDone
                        ? "bg-[#16a86a] text-white"
                        : "bg-[#eef0f3] text-[#9aa0ab]",
                  )}
                >
                  {isDone ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 13l4 4L19 7"
                        stroke="#fff"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    step
                  )}
                </span>
                <span
                  className={cn(
                    "text-[13.5px] font-semibold",
                    isActive && "font-bold",
                  )}
                >
                  {label}
                </span>
              </button>

              {/* 서브스텝 (Step1 전용) */}
              {isActive && subLabels.length > 0 && (
                <div className="ml-[32px] mt-[2px] mb-[4px] flex flex-col gap-[1px]">
                  {subLabels.map((sub, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        navigate(`/exam/${examId}/step/${step}/${i + 1}`)
                      }
                      className={cn(
                        "w-full flex items-center gap-[7px] px-[10px] py-[6px] rounded-[7px] text-[12.5px] text-left transition-colors",
                        i === currentSub
                          ? "text-accent font-semibold bg-accent/[.06]"
                          : "text-[#9aa0ab] hover:bg-[#f7f8fa]",
                      )}
                    >
                      <span
                        className={cn(
                          "w-[6px] h-[6px] rounded-full flex-none",
                          i === currentSub ? "bg-accent" : "bg-[#d8dae0]",
                        )}
                      />
                      {sub}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
