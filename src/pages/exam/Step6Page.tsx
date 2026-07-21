import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'
import { ExamSidebar } from '@/components/common/ExamSidebar'
import { PdfCanvas, type RegionOverlay } from '@/components/exam/PdfCanvas'
import { CodeEditor } from '@/components/exam/CodeEditor'
import { useStep6, type ProblemRow } from '@/hooks/exam/useStep6'
import { examsApi } from '@/api/exams'
import { type GradeUpdateRequest } from '@/api/grading'
import { TYPE_COLORS, TYPE_TEXT_COLORS, TYPE_LABELS_KO } from '@/types/constants'
import { cn } from '@/lib/utils'
import type { GradeResponse, ModelAnswerResponse, AnswerRegionResponse, AnswerSheetResponse } from '@/types/dto'
import type { ProblemType, ProgrammingLanguage } from '@/types/enums'

// ── 채점 방식 레이블 ─────────────────────────────────────────────────────
const GRADE_MODE_LABELS: Record<ProblemType, string> = {
  MULTIPLE_CHOICE: '수동채점',
  SHORT_ANSWER: '수동채점',
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
                  </div>
                  <div className="flex items-center gap-[8px] flex-none">
                    <span className="text-[11.5px] font-semibold px-[9px] py-[3px] rounded-[7px] bg-[#f1f2f5] text-[#71757e]">
                      {GRADE_MODE_LABELS[p.type]}
                    </span>
                    <div className="w-[70px] text-right text-[14px] font-bold text-[#15171d]">
                      {p.max_score}점
                    </div>
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
  sheets,
  selectedSheetIdx,
  selectedSheet,
  isLastSheet,
  currentGrade,
  isCreatingGrade,
  isUpdatingGrade,
  isDeletingGrades,
  pdfUrl,
  sheetRegions,
  onCreateGrade,
  onUpdateGrade,
  onDeleteGrades,
  onNavSheet,
  onBack,
}: {
  problem: ProblemRow
  grades: GradeResponse[]
  modelAnswer: ModelAnswerResponse | null
  isGradesLoading: boolean
  sheets: AnswerSheetResponse[]
  selectedSheetIdx: number
  selectedSheet: AnswerSheetResponse | null
  isLastSheet: boolean
  currentGrade: GradeResponse | null
  isCreatingGrade: boolean
  isUpdatingGrade: boolean
  isDeletingGrades: boolean
  pdfUrl: string | null
  sheetRegions: AnswerRegionResponse[]
  onCreateGrade: (studentId: number, score: number) => void
  onUpdateGrade: (gradeId: number, score: number) => void
  onDeleteGrades: () => void
  onNavSheet: (delta: number) => void
  onBack: () => void
}) {
  const [currentPage, setCurrentPage] = useState(1)
  // null = 미선택, true = 정답, false = 오답
  const [localCorrect, setLocalCorrect] = useState<boolean | null>(null)
  const [editMode, setEditMode] = useState(false)

  const confirmedCount = grades.filter((g) => g.status === 'CONFIRMED').length
  const totalStudentCount = sheets.length
  const pct = totalStudentCount > 0 ? Math.round((confirmedCount / totalStudentCount) * 100) : 0
  const isCurrentConfirmed = currentGrade?.status === 'CONFIRMED'
  const isProcessing = isCreatingGrade || isUpdatingGrade

  // 학생(답안지) 전환 시 로컬 선택·수정 모드 초기화
  useEffect(() => {
    setEditMode(false)
    if (!currentGrade) { setLocalCorrect(null); return }
    setLocalCorrect(
      currentGrade.status === 'CONFIRMED' ? currentGrade.score === problem.max_score : null
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSheet?.answer_sheet_id])

  // 모범답안 텍스트
  const correctAnswerText =
    problem.type === 'MULTIPLE_CHOICE'
      ? modelAnswer?.correct_choice != null ? `${modelAnswer.correct_choice}번` : null
      : modelAnswer?.accepted_answers?.join(' / ') ?? null

  // 해당 문제의 답안 영역
  const problemRegion = sheetRegions.find((r) => r.problem_id === problem.problem_id) ?? null
  const regionOverlay: RegionOverlay[] = problemRegion?.bbox_region
    ? [{ region: problemRegion.bbox_region, label: problem.label, color: TYPE_COLORS[problem.type], shape: problemRegion.shape, polygon_points: problemRegion.polygon_points ?? undefined }]
    : []

  useEffect(() => {
    if (problemRegion?.bbox_region?.page) setCurrentPage(problemRegion.bbox_region.page)
  }, [problemRegion?.answer_region_id])

  const handleSelect = (correct: boolean) => {
    if (isCurrentConfirmed && !editMode) return
    setLocalCorrect(correct)
  }

  const handleConfirm = () => {
    if (isCurrentConfirmed && !editMode) {
      onNavSheet(1)
      return
    }
    if (localCorrect === null) return
    const score = localCorrect ? problem.max_score : 0
    if (!currentGrade) {
      if (selectedSheet?.student_id != null) onCreateGrade(selectedSheet.student_id, score)
    } else {
      onUpdateGrade(currentGrade.grade_id, score)
      setEditMode(false)
    }
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
              답안지를 확인하고 정답 여부를 직접 선택해 확정하세요
            </p>
          </div>

          {sheets.length > 0 && (
            <div className="flex items-center gap-[9px]">
              <button
                type="button"
                disabled={isDeletingGrades || grades.length === 0}
                onClick={onDeleteGrades}
                className="flex items-center gap-[5px] h-[34px] px-[12px] border border-[#e2e4e9] bg-white rounded-[9px] text-[12.5px] text-[#9aa0ab] font-semibold hover:border-[#c0392b] hover:text-[#c0392b] hover:bg-[#fdf5f5] disabled:opacity-30 transition-colors mr-[3px]"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                채점 초기화
              </button>
              <button
                type="button"
                disabled={selectedSheetIdx === 0}
                onClick={() => onNavSheet(-1)}
                className="w-[34px] h-[34px] border border-[#e2e4e9] bg-white rounded-[9px] flex items-center justify-center text-[#5f636b] hover:bg-[#f7f8fa] disabled:opacity-30 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <span className="w-[140px] truncate text-[13.5px] font-bold text-[#15171d]">
                {selectedSheet?.student_name ?? '—'}
                <span className="text-[#9aa0ab] font-normal text-[13px]">
                  {' '}· {selectedSheet?.student_no}
                </span>
              </span>
              <button
                type="button"
                disabled={isLastSheet}
                onClick={() => onNavSheet(1)}
                className="w-[34px] h-[34px] border border-[#e2e4e9] bg-white rounded-[9px] flex items-center justify-center text-[#5f636b] hover:bg-[#f7f8fa] disabled:opacity-30 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {sheets.length > 0 && (
          <div className="flex items-center gap-[12px] pb-[16px]">
            <span className="text-[12.5px] text-[#9aa0ab] font-semibold flex-none">전체 진행</span>
            <div className="flex-1 h-[8px] rounded-[5px] bg-[#eef0f3] overflow-hidden">
              <div
                className="h-full rounded-[5px] bg-accent transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[12.5px] text-[#4b4f57] font-bold flex-none">
              {confirmedCount} / {totalStudentCount} 학생
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      {isGradesLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-[32px] h-[32px] rounded-full border-2 border-[#e2e4e9] border-t-accent animate-spin" />
        </div>
      ) : sheets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-[12px]">
          <p className="text-[15px] font-bold text-[#15171d]">학생 답안지가 없습니다</p>
          <p className="text-[13.5px] text-[#71757e]">3단계에서 답안지를 먼저 업로드해주세요</p>
        </div>
      ) : selectedSheet ? (
        <div className="flex-1 flex min-h-0">
          {/* Left: 답안지 PDF */}
          <div className="flex-[2.5] border-r border-[#f0f1f4] bg-[#eceef2] flex flex-col min-w-0 min-h-0 p-4">
            {pdfUrl ? (
              <PdfCanvas
                url={pdfUrl}
                pageWidth={840}
                regions={regionOverlay}
                drawMode={null}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-[13px] text-[#9aa0ab]">
                답안지를 불러오는 중...
              </div>
            )}
          </div>

          {/* Right: 채점 패널 */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {/* 패널 헤더 */}
            <div className="px-[24px] py-[18px] pb-[14px] border-b border-[#f0f1f4] flex items-center justify-between flex-none">
              <span className="text-[14.5px] font-bold text-[#15171d]">채점</span>
              <div className="text-[13px] text-[#9aa0ab] font-semibold">
                점수{' '}
                <span className="text-[18px] text-[#15171d] font-extrabold">
                  {localCorrect === null ? '—' : localCorrect ? problem.max_score : 0}
                </span>
                {' '}/ {problem.max_score}
              </div>
            </div>

            {/* 패널 본문 */}
            <div className="flex-1 px-[24px] py-[20px] flex flex-col gap-[16px] overflow-y-auto min-h-0">
              {/* 모범답안 */}
              {correctAnswerText && (
                <div className="border border-[#ebedf1] rounded-[11px] px-[16px] py-[13px]">
                  <div className="text-[12px] text-[#9aa0ab] font-semibold mb-[5px]">모범답안</div>
                  <div className="text-[15px] font-bold text-[#15171d]">{correctAnswerText}</div>
                </div>
              )}

              {/* 정답 / 오답 선택 */}
              <div className="flex flex-col gap-[3px]">
                <div className="text-[12px] text-[#9aa0ab] font-semibold mb-[5px]">정답 여부 선택</div>
                <div className="flex gap-[10px]">
                  <button
                    type="button"
                    disabled={(isCurrentConfirmed && !editMode) || isProcessing}
                    onClick={() => handleSelect(true)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-[8px] h-[52px] rounded-[12px] text-[15px] font-bold border-2 transition-colors disabled:opacity-50',
                      localCorrect === true
                        ? 'border-[#16a86a] bg-[#eaf7f0] text-[#16a86a]'
                        : 'border-[#ebedf1] bg-white text-[#8a8f99] hover:border-[#16a86a] hover:bg-[#f4fcf8] hover:text-[#16a86a]',
                    )}
                  >
                    정답
                  </button>
                  <button
                    type="button"
                    disabled={(isCurrentConfirmed && !editMode) || isProcessing}
                    onClick={() => handleSelect(false)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-[8px] h-[52px] rounded-[12px] text-[15px] font-bold border-2 transition-colors disabled:opacity-50',
                      localCorrect === false
                        ? 'border-[#c0392b] bg-[#fdecec] text-[#c0392b]'
                        : 'border-[#ebedf1] bg-white text-[#8a8f99] hover:border-[#c0392b] hover:bg-[#fdf5f5] hover:text-[#c0392b]',
                    )}
                  >
                    오답
                  </button>
                </div>
              </div>
            </div>

            {/* 확정 버튼 */}
            <div className="flex-none px-[24px] py-[14px] border-t border-[#f0f1f4] flex gap-[10px]">
              {currentGrade && (
                <button
                  type="button"
                  onClick={() => setEditMode((v) => !v)}
                  disabled={isProcessing}
                  className={cn(
                    'flex-1 h-[42px] border rounded-[10px] text-[14px] font-bold transition-colors',
                    editMode
                      ? 'border-accent bg-accent/[.08] text-accent'
                      : 'border-[#e0e3e9] bg-white text-[#4b4f57] hover:bg-[#f7f8fa]',
                  )}
                >
                  {editMode ? '수정 중' : '수정'}
                </button>
              )}
              <button
                type="button"
                disabled={isProcessing || (!(isCurrentConfirmed && !editMode) && localCorrect === null)}
                onClick={handleConfirm}
                className={cn(
                  'flex items-center justify-center gap-[6px] h-[42px] rounded-[10px] text-[14px] font-bold transition-opacity disabled:opacity-40',
                  currentGrade ? 'flex-[1.4]' : 'flex-1',
                  isCurrentConfirmed && !editMode
                    ? 'bg-[#f1f2f5] text-[#71757e]'
                    : 'bg-[#16a86a] text-white shadow-[0_3px_10px_#16a86a40] hover:opacity-90',
                )}
              >
                {isCurrentConfirmed && !editMode ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    확정됨 · 다음
                  </>
                ) : isProcessing ? (
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
        {sheets.length > 0 && (
          <button
            type="button"
            disabled={isLastSheet && !!isCurrentConfirmed}
            onClick={() => onNavSheet(1)}
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
  language,
  grades,
  isGradesLoading,
  isGrading,
  gradingJobProgress,
  isConfirming,
  isUpdating,
  isDeletingGrades,
  selectedGradeIdx,
  selectedGrade,
  isLastGrade,
  onRunGrading,
  onNavGrade,
  onConfirm,
  onUpdate,
  onDeleteGrades,
  onBack,
}: {
  problem: ProblemRow
  language: ProgrammingLanguage | null
  grades: GradeResponse[]
  isGradesLoading: boolean
  isGrading: boolean
  gradingJobProgress: { current: number; total: number; percent: number } | null
  isConfirming: boolean
  isUpdating: boolean
  isDeletingGrades: boolean
  selectedGradeIdx: number
  selectedGrade: GradeResponse | null
  isLastGrade: boolean
  onRunGrading: () => void
  onNavGrade: (delta: number) => void
  onConfirm: (gradeId: number) => void
  onUpdate: (gradeId: number, body: GradeUpdateRequest) => void
  onDeleteGrades: () => void
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
                  disabled={isDeletingGrades || isGrading}
                  onClick={onDeleteGrades}
                  className="flex items-center gap-[5px] h-[34px] px-[12px] border border-[#e2e4e9] bg-white rounded-[9px] text-[12.5px] text-[#9aa0ab] font-semibold hover:border-[#c0392b] hover:text-[#c0392b] hover:bg-[#fdf5f5] disabled:opacity-30 transition-colors mr-[3px]"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  채점 초기화
                </button>
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
            {gradingJobProgress && gradingJobProgress.total > 0 ? (
              <>
                <div className="w-[200px] h-[6px] rounded-full bg-[#eef0f3] overflow-hidden mx-auto mt-[10px] mb-[8px]">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-500"
                    style={{ width: `${gradingJobProgress.percent}%` }}
                  />
                </div>
                <p className="text-[13.5px] text-[#71757e]">
                  {gradingJobProgress.current} / {gradingJobProgress.total} 채점 완료
                </p>
              </>
            ) : (
              <p className="text-[13.5px] text-[#71757e]">잠시 기다려주세요...</p>
            )}
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
              <span className="text-[13px] font-medium text-[#9aa0ab]">
                {problem.label} {problem.type === 'CODING' ? '손코딩' : '서술형'}
              </span>
            </div>
            {problem.type === 'CODING' ? (
              <div className="flex-1 mx-[24px] mb-[18px] border border-[#e6e8ec] rounded-[11px] overflow-hidden min-h-0">
                <CodeEditor
                  value={selectedGrade.ocr_text ?? ''}
                  language={language}
                  readOnly
                />
              </div>
            ) : (
              <div className="flex-1 mx-[24px] mb-[18px] border border-[#e6e8ec] rounded-[11px] bg-[#fcfcfd] p-[15px_16px] text-[14px] text-[#3a3e36] leading-[1.85] overflow-y-auto min-h-0 font-sans whitespace-pre-wrap">
                {selectedGrade.ocr_text ?? (
                  <span className="text-[#c2c6cd] italic">OCR 인식 텍스트가 없습니다</span>
                )}
              </div>
            )}
          </div>

          {/* Right: 채점 패널 */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
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
                  <div className="border border-[#e6e8ec] rounded-[11px] bg-[#fcfcfd] px-[15px] py-[13px] text-[13.5px] text-[#3a3e36] leading-[1.7] whitespace-pre-wrap">
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
    gradingJobProgress,
    runGrading,
    selectedGradeIdx,
    navGrade,
    selectedGrade,
    isLastGrade,
    confirmGrade,
    isConfirming,
    updateGrade,
    isUpdating,
    sheets,
    selectedSheetIdx,
    navSheet,
    selectedSheet,
    isLastSheet,
    currentGrade,
    createAutoGrade,
    isCreatingAutoGrade,
    updateAutoGrade,
    isUpdatingAutoGrade,
    deleteGrades,
    isDeletingGrades,
    selectedModelAnswer,
    selectedProblemLanguage,
    selectedSheetPdfUrl,
    selectedSheetRegions,
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
          sheets={sheets}
          selectedSheetIdx={selectedSheetIdx}
          selectedSheet={selectedSheet}
          isLastSheet={isLastSheet}
          currentGrade={currentGrade}
          isCreatingGrade={isCreatingAutoGrade}
          isUpdatingGrade={isUpdatingAutoGrade}
          isDeletingGrades={isDeletingGrades}
          pdfUrl={selectedSheetPdfUrl}
          sheetRegions={selectedSheetRegions}
          onCreateGrade={createAutoGrade}
          onUpdateGrade={updateAutoGrade}
          onDeleteGrades={deleteGrades}
          onNavSheet={navSheet}
          onBack={goToList}
        />
      ) : selectedProblem ? (
        <LlmGradeDetailView
          problem={selectedProblem}
          language={selectedProblemLanguage}
          grades={grades}
          isGradesLoading={isGradesLoading}
          isGrading={isGrading}
          gradingJobProgress={gradingJobProgress}
          isConfirming={isConfirming}
          isUpdating={isUpdating}
          isDeletingGrades={isDeletingGrades}
          selectedGradeIdx={selectedGradeIdx}
          selectedGrade={selectedGrade}
          isLastGrade={isLastGrade}
          onRunGrading={runGrading}
          onNavGrade={navGrade}
          onConfirm={confirmGrade}
          onUpdate={updateGrade}
          onDeleteGrades={deleteGrades}
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
              {gradingJobProgress && gradingJobProgress.total > 0 ? (
                <>
                  <div className="w-[200px] h-[6px] rounded-full bg-[#eef0f3] overflow-hidden mx-auto mt-[10px] mb-[8px]">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-500"
                      style={{ width: `${gradingJobProgress.percent}%` }}
                    />
                  </div>
                  <p className="text-[13.5px] text-[#71757e]">
                    {gradingJobProgress.current} / {gradingJobProgress.total} 채점 완료
                  </p>
                </>
              ) : (
                <p className="text-[13.5px] text-[#71757e]">몇 분가량 걸릴 수 있습니다</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
