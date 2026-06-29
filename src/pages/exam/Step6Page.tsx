import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'
import { ExamSidebar } from '@/components/common/ExamSidebar'
import { useStep6, type ProblemRow } from '@/hooks/exam/useStep6'
import { examsApi } from '@/api/exams'
import { type GradeUpdateRequest } from '@/api/grading'
import { TYPE_COLORS, TYPE_TEXT_COLORS, TYPE_LABELS_KO } from '@/types/constants'
import { cn } from '@/lib/utils'
import type { GradeResponse, ModelAnswerResponse } from '@/types/dto'
import type { ProblemType } from '@/types/enums'

// ── 채점 방식 레이블 ─────────────────────────────────────────────────────
const GRADE_MODE_LABELS: Record<ProblemType, string> = {
  MULTIPLE_CHOICE: '자동 채점',
  SHORT_ANSWER: '자동 채점',
  DESCRIPTIVE: 'LLM 채점',
  CODING: 'LLM 채점',
}

const isAutoType = (type: ProblemType) =>
  type === 'MULTIPLE_CHOICE' || type === 'SHORT_ANSWER'

// ── 메인 리스트 뷰 ───────────────────────────────────────────────────────

function GradingListView({
  problems,
  confirmedCount,
  totalCount,
  onSelectProblem,
  onPrev,
  onNext,
  isNextDisabled,
}: {
  problems: ProblemRow[]
  confirmedCount: number
  totalCount: number
  onSelectProblem: (p: ProblemRow) => void
  onPrev: () => void
  onNext: () => void
  isNextDisabled?: boolean
}) {
  const pct = totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 0

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <div className="px-[30px] py-[24px] pb-[20px] border-b border-[#f0f1f4] flex-none">
        <h2 className="text-[22px] font-extrabold text-[#15171d] tracking-[-0.02em]">채점 현황</h2>
        <p className="text-[14px] text-[#71757e] mt-[5px]">
          문제를 선택해 채점하세요 · 문제별로 전체 학생을 한 번에 채점합니다
        </p>
        <div className="flex items-center gap-[12px] mt-[16px]">
          <span className="text-[12.5px] text-[#9aa0ab] font-semibold flex-none">전체 채점</span>
          <div className="flex-1 h-[8px] rounded-[5px] bg-[#eef0f3] overflow-hidden">
            <div
              className="h-full rounded-[5px] bg-accent transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[12.5px] text-[#4b4f57] font-bold flex-none">
            {confirmedCount} / {totalCount} 채점
          </span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-[30px] py-[14px]">
        <div className="flex items-center text-[12.5px] text-[#8a8f99] font-bold px-[18px] pb-[10px]">
          <div className="flex-1">문제</div>
          <div className="w-[70px] text-right">배점</div>
          <div className="w-[360px] pl-[40px]">채점 진행</div>
          <div className="w-[24px]" />
        </div>

        <div className="flex flex-col gap-[9px]">
          {problems.length === 0 ? (
            <div className="flex items-center justify-center py-[60px] text-[13.5px] text-[#9aa0ab]">
              문제 정보를 불러오는 중...
            </div>
          ) : (
            problems.map((p) => {
              const color = TYPE_COLORS[p.type]
              const textColor = TYPE_TEXT_COLORS[p.type]
              const barColor = p.percent === 100 ? '#16a86a' : '#4F46E5'
              const pctColor = p.percent === 100 ? '#138a5a' : '#4b4f57'

              return (
                <button
                  key={p.problem_id}
                  type="button"
                  onClick={() => onSelectProblem(p)}
                  className="flex items-center px-[18px] py-[15px] border border-[#ebedf1] rounded-[13px] hover:bg-[#fafbfc] transition-colors text-left w-full"
                >
                  <div className="flex-1 flex items-center gap-[11px] min-w-0">
                    <span
                      className="text-[11.5px] font-bold px-[10px] py-[3px] rounded-[7px] flex-none"
                      style={{ background: color + '15', color: textColor }}
                    >
                      {TYPE_LABELS_KO[p.type]}
                    </span>
                    <span className="text-[15.5px] font-extrabold text-accent">{p.label}</span>
                    <span
                      className="text-[11.5px] font-semibold px-[9px] py-[3px] rounded-[7px] bg-[#f1f2f5] text-[#71757e] flex-none"
                    >
                      {GRADE_MODE_LABELS[p.type]}
                    </span>
                  </div>
                  <div className="w-[70px] text-right text-[14px] font-bold text-[#15171d] flex-none">
                    {p.max_score}점
                  </div>
                  <div className="w-[360px] pl-[40px] flex-none flex items-center gap-[12px]">
                    <div className="flex-1 h-[9px] rounded-[5px] bg-[#eef0f3] overflow-hidden">
                      <div
                        className="h-full rounded-[5px] transition-all"
                        style={{
                          width: `${Math.max(p.percent, 2)}%`,
                          background: barColor,
                        }}
                      />
                    </div>
                    <span
                      className="w-[42px] text-right text-[13px] font-bold"
                      style={{ color: pctColor }}
                    >
                      {p.percent}%
                    </span>
                  </div>
                  <div className="w-[24px] flex-none flex justify-end">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="text-[#cdd1d8]">
                      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-none px-[30px] py-[16px] border-t border-[#f0f1f4] flex items-center justify-between bg-white">
        <button
          type="button"
          onClick={onPrev}
          className="h-[44px] px-[18px] border border-[#e0e3e9] bg-white rounded-[11px] text-[14px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] transition-colors"
        >
          ← 이전
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isNextDisabled}
          className="flex items-center gap-[6px] h-[44px] px-[20px] bg-accent text-white text-[14.5px] font-bold rounded-[11px] shadow-[0_4px_12px_rgba(79,70,229,.3)] hover:opacity-90 transition-opacity disabled:bg-[#c1c5cd] disabled:shadow-none disabled:cursor-not-allowed"
        >
          다음: 성적 검토
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 5l7 7-7 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </main>
  )
}

// ── 자동 채점 상세 뷰 (객관식·단답형) ────────────────────────────────────

function AutoGradeDetailView({
  problem,
  grades,
  modelAnswer,
  isGradesLoading,
  isGrading,
  isConfirmingAll,
  onRunGrading,
  onConfirmAll,
  onBack,
}: {
  problem: ProblemRow
  grades: GradeResponse[]
  modelAnswer: ModelAnswerResponse | null
  isGradesLoading: boolean
  isGrading: boolean
  isConfirmingAll: boolean
  onRunGrading: () => void
  onConfirmAll: () => void
  onBack: () => void
}) {
  const confirmed = grades.filter((g) => g.status === 'CONFIRMED').length
  const correctCount = grades.filter((g) => g.score === g.max_score).length
  const wrongCount = grades.filter((g) => g.score < g.max_score).length
  const allConfirmed = grades.length > 0 && confirmed === grades.length

  const hasGrades = grades.length > 0

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <div className="px-[30px] py-[22px] pb-[18px] border-b border-[#f0f1f4] flex-none">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-[10px]">
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-[6px] text-[13px] text-[#9aa0ab] font-semibold hover:text-[#5f636b] transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                현황
              </button>
              <h2 className="text-[22px] font-extrabold text-[#15171d] tracking-[-0.02em]">
                {problem.label}
              </h2>
            </div>
            <p className="text-[14px] text-[#71757e] mt-[5px]">
              객관식·단답형은 등록 정답과 자동 매칭됩니다 · 검토 후 일괄 확정
            </p>
          </div>

          {hasGrades && (
            <div className="flex items-center gap-[8px] flex-none">
              <button
                type="button"
                onClick={onRunGrading}
                disabled={isGrading}
                className="flex items-center gap-[5px] h-[36px] px-[13px] border border-[#e0e3e9] bg-white rounded-[10px] text-[13px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] disabled:opacity-50 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4v5h5M20 20v-5h-5M4.93 14A8 8 0 1 0 6.34 6.34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                재채점
              </button>
              <span className="flex items-center gap-[7px] h-[36px] px-[14px] bg-[#eaf7f0] rounded-[10px] text-[13px] text-[#138a5a] font-bold">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                자동 채점 {grades.length} / {problem.total_count}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      {isGrading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-[18px]">
          <div className="w-[48px] h-[48px] rounded-full border-4 border-[#e2e4e9] border-t-accent animate-spin" />
          <p className="text-[14px] text-[#71757e]">자동 채점 중입니다...</p>
        </div>
      ) : isGradesLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-[32px] h-[32px] rounded-full border-2 border-[#e2e4e9] border-t-accent animate-spin" />
        </div>
      ) : !hasGrades ? (
        /* 채점 시작 전 */
        <div className="flex-1 flex flex-col items-center justify-center gap-[16px]">
          <div className="w-[52px] h-[52px] rounded-[14px] bg-accent/10 flex items-center justify-center">
            <Sparkles size={24} className="text-accent" />
          </div>
          <p className="text-[15px] font-bold text-[#15171d]">채점을 시작하세요</p>
          <p className="text-[13.5px] text-[#71757e] text-center">
            등록된 정답과 학생 답안을 자동으로 매칭합니다
          </p>
          <button
            type="button"
            onClick={onRunGrading}
            className="flex items-center gap-[6px] h-[44px] px-[22px] bg-accent text-white text-[14.5px] font-bold rounded-[11px] shadow-[0_4px_12px_rgba(79,70,229,.3)] hover:opacity-90 transition-opacity mt-[4px]"
          >
            <Sparkles size={16} />
            자동 채점 실행
          </button>
        </div>
      ) : (
        <>
          {/* 요약 카드 */}
          <div className="flex gap-[12px] px-[30px] pt-[18px] pb-[6px] flex-none">
            <div className="flex-1 border border-[#ebedf1] rounded-[12px] px-[16px] py-[13px]">
              <div className="text-[12.5px] text-[#9aa0ab] font-semibold">정답</div>
              <div className="text-[22px] font-extrabold text-[#138a5a] mt-[2px]">{correctCount}</div>
            </div>
            <div className="flex-1 border border-[#ebedf1] rounded-[12px] px-[16px] py-[13px]">
              <div className="text-[12.5px] text-[#9aa0ab] font-semibold">오답</div>
              <div className="text-[22px] font-extrabold text-[#c0392b] mt-[2px]">{wrongCount}</div>
            </div>
          </div>

          {/* 테이블 */}
          <div className="flex-1 mx-[30px] mb-[0px] border border-[#ebedf1] rounded-[13px] overflow-hidden flex flex-col min-h-0">
            <div className="flex items-center bg-[#fafbfc] border-b border-[#eef0f3] text-[12.5px] text-[#8a8f99] font-bold flex-none">
              <div className="w-[200px] px-[16px] py-[12px]">학생</div>
              <div className="flex-1 px-[16px] py-[12px]">학생 답안</div>
              <div className="flex-1 px-[16px] py-[12px]">정답</div>
              <div className="w-[120px] px-[16px] py-[12px]">결과</div>
              <div className="w-[80px] px-[16px] py-[12px]">점수</div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {grades.map((g) => {
                const isCorrect = g.score === g.max_score
                const answerText = g.marked_choice != null ? `${g.marked_choice}번` : (g.ocr_text ?? '—')
                const modelText =
                  problem.type === 'MULTIPLE_CHOICE'
                    ? modelAnswer?.correct_choice != null
                      ? `${modelAnswer.correct_choice}번`
                      : '—'
                    : modelAnswer?.accepted_answers?.join(' / ') ?? '—'

                return (
                  <div
                    key={g.grade_id}
                    className="flex items-center border-b border-[#f2f3f6] last:border-0"
                  >
                    <div className="w-[200px] px-[16px] py-[11px] text-[14px] text-[#15171d] font-semibold">
                      {g.student_name}
                    </div>
                    <div className="flex-1 px-[16px] py-[11px] text-[14px] text-[#3a3e36] font-mono">
                      {answerText}
                    </div>
                    <div className="flex-1 px-[16px] py-[11px] text-[14px] text-[#9aa0ab] font-mono">
                      {modelText}
                    </div>
                    <div className="w-[120px] px-[16px] py-[11px]">
                      {isCorrect ? (
                        <span className="inline-flex items-center gap-[4px] text-[12px] font-bold px-[10px] py-[4px] rounded-[20px] bg-[#e7f6ee] text-[#138a5a]">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          정답
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-[4px] text-[12px] font-bold px-[10px] py-[4px] rounded-[20px] bg-[#fdecec] text-[#c0392b]">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                          </svg>
                          오답
                        </span>
                      )}
                    </div>
                    <div
                      className="w-[80px] px-[16px] py-[11px] text-[14px] font-bold"
                      style={{ color: isCorrect ? '#138a5a' : '#c0392b' }}
                    >
                      {g.score} / {g.max_score}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="text-[12.5px] text-[#9aa0ab] px-[30px] py-[10px] flex gap-[18px] flex-none">
            <span className="flex items-center gap-[6px]">
              <span className="w-[8px] h-[8px] rounded-full bg-[#16a86a]" />
              정답
            </span>
            <span className="flex items-center gap-[6px]">
              <span className="w-[8px] h-[8px] rounded-full bg-[#c0392b]" />
              오답
            </span>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="flex-none px-[30px] py-[16px] border-t border-[#f0f1f4] flex items-center justify-between bg-white">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-[6px] h-[44px] px-[18px] border border-[#e0e3e9] bg-white rounded-[11px] text-[14px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] transition-colors"
        >
          현황으로
        </button>
        {hasGrades && !isGrading && (
          <button
            type="button"
            onClick={onConfirmAll}
            disabled={isConfirmingAll || allConfirmed}
            className={cn(
              'flex items-center gap-[7px] h-[44px] px-[22px] rounded-[11px] text-[14.5px] font-bold transition-opacity',
              allConfirmed
                ? 'bg-[#eaf7f0] text-[#138a5a] cursor-default'
                : 'bg-[#16a86a] text-white shadow-[0_4px_12px_#16a86a40] hover:opacity-90 disabled:opacity-50',
            )}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {allConfirmed ? '전체 확정 완료' : isConfirmingAll ? '확정 중...' : '전체 자동채점 확정'}
          </button>
        )}
      </div>
    </main>
  )
}

// ── 루브릭 항목 카드 ────────────────────────────────────────────────────

function RubricBreakdownItem({
  rubric_id,
  text,
  allocated_score,
  satisfied,
  editable,
  onToggle,
}: {
  rubric_id: number
  text: string
  allocated_score: number
  satisfied: boolean
  editable: boolean
  onToggle: (rubricId: number, satisfied: boolean) => void
}) {
  return (
    <div className="border border-[#ebedf1] rounded-[11px] px-[14px] py-[12px] flex items-center gap-[11px]">
      <button
        type="button"
        disabled={!editable}
        onClick={() => onToggle(rubric_id, !satisfied)}
        className={cn(
          'w-[22px] h-[22px] rounded-[6px] flex-none flex items-center justify-center text-[12px] font-extrabold transition-colors',
          satisfied
            ? 'bg-[#eaf7f0] text-[#16a86a]'
            : 'bg-[#f1f2f5] border-[1.5px] border-[#d8dbe1] text-[#c8ccd3]',
          editable && 'cursor-pointer',
        )}
      >
        {satisfied && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <span
        className="flex-1 text-[14px] leading-[1.45]"
        style={{ color: satisfied ? '#2a2e36' : '#9aa0ab' }}
      >
        {text}
      </span>
      <span
        className="text-[15px] font-extrabold flex-none"
        style={{ color: satisfied ? '#16a86a' : '#aab0ba' }}
      >
        +{allocated_score}
      </span>
    </div>
  )
}

// ── LLM 채점 상세 뷰 (서술형·손코딩) ────────────────────────────────────

function LlmGradeDetailView({
  problem,
  grades,
  isGradesLoading,
  isGrading,
  isConfirming,
  isUpdating,
  selectedGradeIdx,
  selectedGrade,
  isLastGrade,
  onRunGrading,
  onNavGrade,
  onConfirm,
  onUpdate,
  onBack,
}: {
  problem: ProblemRow
  grades: GradeResponse[]
  isGradesLoading: boolean
  isGrading: boolean
  isConfirming: boolean
  isUpdating: boolean
  selectedGradeIdx: number
  selectedGrade: GradeResponse | null
  isLastGrade: boolean
  onRunGrading: () => void
  onNavGrade: (delta: number) => void
  onConfirm: (gradeId: number) => void
  onUpdate: (gradeId: number, body: GradeUpdateRequest) => void
  onBack: () => void
}) {
  const [editMode, setEditMode] = useState(false)
  useEffect(() => { setEditMode(false) }, [selectedGradeIdx])
  const confirmedCount = grades.filter((g) => g.status === 'CONFIRMED').length
  const totalCount = problem.total_count
  const pct = totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 0
  const isCurrentConfirmed = selectedGrade?.status === 'CONFIRMED'

  const handleToggleRubric = (rubricId: number, satisfied: boolean) => {
    if (!selectedGrade) return
    const currentBreakdown = selectedGrade.rubric_breakdown ?? []
    const updated = currentBreakdown.map((r) =>
      r.rubric_id === rubricId ? { rubric_id: r.rubric_id, satisfied } : { rubric_id: r.rubric_id, satisfied: r.satisfied },
    )
    onUpdate(selectedGrade.grade_id, { rubric_breakdown: updated })
  }

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <div className="px-[30px] py-[20px] pb-0 border-b border-[#f0f1f4] flex-none">
        <div className="flex items-start justify-between mb-[14px]">
          <div>
            <div className="flex items-center gap-[10px]">
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-[6px] text-[13px] text-[#9aa0ab] font-semibold hover:text-[#5f636b] transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                현황
              </button>
              <h2 className="text-[22px] font-extrabold text-[#15171d] tracking-[-0.02em]">
                {problem.label}
              </h2>
            </div>
            <p className="text-[14px] text-[#71757e] mt-[5px]">
              학생·문제 순으로 LLM 채점 결과를 확인하고 확정하세요
            </p>
          </div>

          <div className="flex items-center gap-[12px]">
            <button
              type="button"
              disabled={isGrading}
              onClick={onRunGrading}
              className="flex items-center gap-[6px] h-[36px] px-[14px] border border-[#e2e4e9] bg-white rounded-[10px] text-[13px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] disabled:opacity-50 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {isGrading ? '채점 중...' : '재채점'}
            </button>

            {grades.length > 0 && (
              <div className="flex items-center gap-[9px]">
                <button
                  type="button"
                  disabled={selectedGradeIdx === 0}
                  onClick={() => onNavGrade(-1)}
                  className="w-[34px] h-[34px] border border-[#e2e4e9] bg-white rounded-[9px] flex items-center justify-center text-[#5f636b] hover:bg-[#f7f8fa] disabled:opacity-30 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <span className="w-[140px] truncate text-[13.5px] font-bold text-[#15171d]">
                  {selectedGrade?.student_name ?? '—'}
                  <span className="text-[#9aa0ab] font-normal text-[13px]">
                    {' '}· {selectedGrade?.student_no}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={isLastGrade}
                  onClick={() => onNavGrade(1)}
                  className="w-[34px] h-[34px] border border-[#e2e4e9] bg-white rounded-[9px] flex items-center justify-center text-[#5f636b] hover:bg-[#f7f8fa] disabled:opacity-30 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {grades.length > 0 && (
          <div className="flex items-center gap-[12px] pb-[16px]">
            <span className="text-[12.5px] text-[#9aa0ab] font-semibold flex-none">전체 진행</span>
            <div className="flex-1 h-[8px] rounded-[5px] bg-[#eef0f3] overflow-hidden">
              <div
                className="h-full rounded-[5px] bg-accent transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[12.5px] text-[#4b4f57] font-bold flex-none">
              {confirmedCount} / {totalCount} 학생
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      {isGrading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-[18px]">
          <div className="w-[48px] h-[48px] rounded-full border-4 border-[#e2e4e9] border-t-accent animate-spin" />
          <div className="text-center">
            <p className="text-[15px] font-bold text-[#15171d] mb-[6px]">LLM이 채점하고 있습니다</p>
            <p className="text-[13.5px] text-[#71757e]">잠시 기다려주세요...</p>
          </div>
        </div>
      ) : isGradesLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-[32px] h-[32px] rounded-full border-2 border-[#e2e4e9] border-t-accent animate-spin" />
        </div>
      ) : grades.length === 0 ? (
        /* 채점 시작 전 */
        <div className="flex-1 flex flex-col items-center justify-center gap-[16px]">
          <div className="w-[52px] h-[52px] rounded-[14px] bg-accent/10 flex items-center justify-center">
            <Sparkles size={24} className="text-accent" />
          </div>
          <p className="text-[15px] font-bold text-[#15171d]">LLM 채점을 시작하세요</p>
          <p className="text-[13.5px] text-[#71757e] text-center">
            루브릭 기준과 모범답안을 바탕으로 LLM이 자동 채점합니다
          </p>
          <button
            type="button"
            onClick={onRunGrading}
            className="flex items-center gap-[6px] h-[44px] px-[22px] bg-accent text-white text-[14.5px] font-bold rounded-[11px] shadow-[0_4px_12px_rgba(79,70,229,.3)] hover:opacity-90 transition-opacity mt-[4px]"
          >
            <Sparkles size={16} />
            LLM 채점 실행
          </button>
        </div>
      ) : selectedGrade ? (
        <div className="flex-1 flex min-h-0">
          {/* Left: 학생 답안 */}
          <div className="flex-1 border-r border-[#f0f1f4] flex flex-col min-w-0 min-h-0">
            <div className="px-[24px] py-[18px] pb-[10px] text-[14.5px] font-bold text-[#15171d] flex-none">
              학생 답안{' '}
              <span className="text-[13px] font-medium text-[#9aa0ab]">{problem.label} 서술형</span>
            </div>
            <div className="flex-1 mx-[24px] mb-[18px] border border-[#e6e8ec] rounded-[11px] bg-[#fcfcfd] p-[15px_16px] text-[14px] text-[#3a3e36] leading-[1.85] overflow-y-auto min-h-0 font-sans">
              {selectedGrade.ocr_text ?? (
                <span className="text-[#c2c6cd] italic">OCR 인식 텍스트가 없습니다</span>
              )}
            </div>
          </div>

          {/* Right: 채점 패널 */}
          <div className="flex-[1.05] flex flex-col min-w-0 min-h-0">
            <div className="px-[24px] py-[18px] pb-[12px] flex items-center justify-between flex-none">
              <div className="flex items-center gap-[8px]">
                <span className="text-[14.5px] font-bold text-[#15171d]">채점</span>
                <span className="flex items-center gap-[5px] text-[11.5px] font-bold text-accent bg-accent/[.08] px-[9px] py-[3px] rounded-[20px]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  </svg>
                  LLM 자동
                </span>
              </div>
              <div className="text-[13px] text-[#9aa0ab] font-semibold">
                점수{' '}
                <span className="text-[18px] text-[#15171d] font-extrabold">{selectedGrade.score}</span>
                {' '}/ {selectedGrade.max_score}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-[24px] flex flex-col gap-[9px] min-h-0">
              {/* 루브릭 항목 */}
              {(selectedGrade.rubric_breakdown ?? []).map((r) => (
                <RubricBreakdownItem
                  key={r.rubric_id}
                  {...r}
                  editable={editMode}
                  onToggle={handleToggleRubric}
                />
              ))}

              {/* LLM 코멘트 */}
              {selectedGrade.comment && (
                <div className="mt-[4px]">
                  <div className="text-[12.5px] text-[#9aa0ab] font-semibold mb-[7px]">LLM 코멘트</div>
                  <div className="border border-[#e6e8ec] rounded-[11px] bg-[#fcfcfd] px-[15px] py-[13px] text-[13.5px] text-[#3a3e36] leading-[1.7]">
                    {selectedGrade.comment}
                  </div>
                </div>
              )}
            </div>

            {/* 확정 버튼 영역 */}
            <div className="flex-none px-[24px] py-[14px] border-t border-[#f0f1f4] flex gap-[10px]">
              <button
                type="button"
                onClick={() => setEditMode((v) => !v)}
                disabled={isUpdating}
                className={cn(
                  'flex-1 h-[42px] border rounded-[10px] text-[14px] font-bold font-inherit transition-colors',
                  editMode
                    ? 'border-accent bg-accent/[.08] text-accent'
                    : 'border-[#e0e3e9] bg-white text-[#4b4f57] hover:bg-[#f7f8fa]',
                )}
              >
                {editMode ? '수정 중' : '수정'}
              </button>
              <button
                type="button"
                disabled={isConfirming || isUpdating}
                onClick={() => {
                  if (isCurrentConfirmed) {
                    onNavGrade(1)
                  } else {
                    onConfirm(selectedGrade.grade_id)
                    setEditMode(false)
                  }
                }}
                className={cn(
                  'flex-[1.4] flex items-center justify-center gap-[6px] h-[42px] rounded-[10px] text-[14px] font-bold transition-opacity disabled:opacity-50',
                  isCurrentConfirmed
                    ? 'bg-[#f1f2f5] text-[#71757e]'
                    : 'bg-[#16a86a] text-white shadow-[0_3px_10px_#16a86a40] hover:opacity-90',
                )}
              >
                {isCurrentConfirmed ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    확정됨 · 다음
                  </>
                ) : isConfirming ? (
                  '처리 중...'
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    확정
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Footer */}
      <div className="flex-none px-[30px] py-[16px] border-t border-[#f0f1f4] flex items-center justify-between bg-white">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-[6px] h-[44px] px-[18px] border border-[#e0e3e9] bg-white rounded-[11px] text-[14px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] transition-colors"
        >
          현황으로
        </button>
        {grades.length > 0 && !isGrading && (
          <button
            type="button"
            disabled={isLastGrade && isCurrentConfirmed}
            onClick={() => onNavGrade(1)}
            className="flex items-center gap-[6px] h-[44px] px-[20px] bg-accent text-white text-[14.5px] font-bold rounded-[11px] shadow-[0_4px_12px_rgba(79,70,229,.3)] hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            다음 학생
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 5l7 7-7 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </main>
  )
}

// ── Step6Page ────────────────────────────────────────────────────────────

export default function Step6Page() {
  const { examId: examIdStr } = useParams<{ examId: string }>()
  const examId = Number(examIdStr)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [isAdvancing, setIsAdvancing] = useState(false)

  const handleNext = async () => {
    setIsAdvancing(true)
    try {
      await examsApi.advance(examId, 6)
      await qc.invalidateQueries({ queryKey: ['exam', examId] })
      navigate(`/exam/${examId}/step/7`)
    } catch {
      toast.error('진행 상태 업데이트에 실패했습니다.')
    } finally {
      setIsAdvancing(false)
    }
  }

  const { data: examRes } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => examsApi.get(examId),
    enabled: !!examId,
  })

  const {
    view,
    progress,
    selectedProblem,
    openDetail,
    goToList,
    grades,
    isGradesLoading,
    isGrading,
    runGrading,
    selectedGradeIdx,
    navGrade,
    selectedGrade,
    isLastGrade,
    confirmGrade,
    isConfirming,
    confirmAll,
    isConfirmingAll,
    updateGrade,
    isUpdating,
    selectedModelAnswer,
  } = useStep6(examId)

  const problems: ProblemRow[] = progress?.problems ?? []
  const confirmedCount = progress?.confirmed_count ?? 0
  const totalCount = progress?.total_count ?? 0

  return (
    <div className="relative flex h-screen overflow-hidden bg-white">
      <aside className="w-[252px] shrink-0">
        <ExamSidebar examId={examId} examName={examRes?.data?.name} currentStep={6} examStep={examRes?.data?.step} />
      </aside>

      {view === 'list' ? (
        <GradingListView
          problems={problems}
          confirmedCount={confirmedCount}
          totalCount={totalCount}
          onSelectProblem={openDetail}
          onPrev={() => navigate(`/exam/${examId}/step/5`)}
          onNext={handleNext}
          isNextDisabled={isAdvancing || totalCount === 0 || confirmedCount < totalCount}
        />
      ) : selectedProblem && isAutoType(selectedProblem.type) ? (
        <AutoGradeDetailView
          problem={selectedProblem}
          grades={grades}
          modelAnswer={selectedModelAnswer}
          isGradesLoading={isGradesLoading}
          isGrading={isGrading}
          isConfirmingAll={isConfirmingAll}
          onRunGrading={runGrading}
          onConfirmAll={confirmAll}
          onBack={goToList}
        />
      ) : selectedProblem ? (
        <LlmGradeDetailView
          problem={selectedProblem}
          grades={grades}
          isGradesLoading={isGradesLoading}
          isGrading={isGrading}
          isConfirming={isConfirming}
          isUpdating={isUpdating}
          selectedGradeIdx={selectedGradeIdx}
          selectedGrade={selectedGrade}
          isLastGrade={isLastGrade}
          onRunGrading={runGrading}
          onNavGrade={navGrade}
          onConfirm={confirmGrade}
          onUpdate={updateGrade}
          onBack={goToList}
        />
      ) : null}

      {isGrading && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-[18px] bg-white rounded-[20px] px-[52px] py-[46px] shadow-[0_16px_48px_rgba(20,24,40,.18)] text-center">
            <div className="w-[52px] h-[52px] rounded-full border-4 border-[#e2e4e9] border-t-accent animate-spin" />
            <div>
              <p className="text-[17px] font-bold text-[#15171d] mb-[6px]">
                채점을 진행 중입니다
              </p>
              <p className="text-[13.5px] text-[#71757e]">
                몇 분가량 걸릴 수 있습니다
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
