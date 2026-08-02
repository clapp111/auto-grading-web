import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ExamSidebar } from '@/components/common/ExamSidebar'
import { PdfCanvas } from '@/components/exam/PdfCanvas'
import { CodeEditor } from '@/components/exam/CodeEditor'
import { useStep5 } from '@/hooks/exam/useStep5'
import { useLockedToast } from '@/hooks/common/useLockedToast'
import { examsApi } from '@/api/exams'
import { TYPE_COLORS } from '@/types/constants'
import type { OcrResultResponse } from '@/types/dto'
import { cn } from '@/lib/utils'

// ── 언어 레이블 ──────────────────────────────────────────────────────────────
const LANG_LABELS: Record<string, string> = { CPP: 'C++', JAVA: 'Java', PYTHON: 'Python', C: 'C' }
const LANG_EXT: Record<string, string> = { CPP: 'cpp', JAVA: 'java', PYTHON: 'py', C: 'c' }

// ── 문제 stepper pill ────────────────────────────────────────────────────────
function ProblemPill({
  result,
  isCurrent,
  onClick,
}: {
  result: OcrResultResponse
  isCurrent: boolean
  onClick: () => void
}) {
  const done = result.status === 'REVIEWED'
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-[5px] h-[34px] px-[14px] rounded-[9px] text-[13px] font-semibold transition-colors whitespace-nowrap',
        isCurrent
          ? 'bg-accent text-white shadow-[0_2px_8px_rgba(79,70,229,.4)]'
          : done
            ? 'bg-[#eaf7f0] text-[#138a5a]'
            : 'bg-[#f1f2f5] text-[#9aa0ab]',
      )}
    >
      {result.problem_label}
      {done && !isCurrent && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

// ── 왼쪽 PDF 뷰어 패널 ───────────────────────────────────────────────────────
function AnswerImagePanel({
  result,
  pdfUrl,
}: {
  result: OcrResultResponse
  pdfUrl: string | null
}) {
  const page = result.bbox_region?.page ?? 1
  const overlay = result.bbox_region
    ? [{
        region: result.bbox_region,
        label: result.problem_label,
        color: TYPE_COLORS[result.problem_type] ?? '#4F46E5',
        shape: result.shape,
        polygon_points: result.polygon_points ?? undefined,
      }]
    : []

  return (
    <div className="flex-[1] bg-[#eceef2] p-6 flex flex-col min-w-0 min-h-0">
      <p className="text-[11px] font-semibold text-[#9aa0ab] font-mono mb-3 flex-none">
        {result.problem_label} 영역 ·{' '}
        {result.problem_type === 'CODING'
          ? '손글씨 코드'
          : result.problem_type === 'MULTIPLE_CHOICE'
            ? '마킹 답안'
            : result.problem_type === 'SHORT_ANSWER'
              ? '손글씨 단답'
              : '손글씨 답안'}
      </p>
      <div className="flex-1 min-h-0">
        <PdfCanvas
          url={pdfUrl}
          pageWidth={560}
          regions={overlay}
          drawMode={null}
          currentPage={page}
        />
      </div>
    </div>
  )
}

// ── 우측 패널: 객관식 ────────────────────────────────────────────────────────
function MultipleChoicePanel({
  locked,
  localChoice,
  onSaveChoice,
  onLockedClick,
}: {
  locked: boolean
  localChoice: number | null
  onSaveChoice: (choice: number | null) => void
  onLockedClick: () => void
}) {
  const choiceCount = 5

  return (
    <div className="relative flex-1 border-l border-[#f0f1f4] flex flex-col min-w-0 px-[26px] py-[22px] gap-[20px]">
      {/* 보기 버튼 */}
      <div className="flex gap-[10px] flex-wrap">
        {Array.from({ length: choiceCount }, (_, i) => i + 1).map((n) => {
          const isSelected = localChoice === n
          return (
            <button
              key={n}
              type="button"
              disabled={locked}
              onClick={() => onSaveChoice(isSelected ? null : n)}
              className={cn(
                'w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[16px] font-bold transition-all',
                isSelected
                  ? 'border-2 border-accent bg-accent/[.08] text-accent shadow-[0_2px_8px_rgba(79,70,229,.3)]'
                  : 'border-[1.5px] border-[#e2e4e9] text-[#aab0ba] hover:border-[#c8ccd3]',
                locked && 'opacity-60 cursor-not-allowed',
              )}
            >
              {n}
            </button>
          )
        })}
      </div>

      {/* 특수 표시 버튼 */}
      <div className="flex gap-[9px]">
        <button
          type="button"
          disabled={locked}
          onClick={() => onSaveChoice(null)}
          className={cn(
            'flex items-center gap-[6px] h-[34px] px-[13px] border border-[#e2e4e9] rounded-[9px] text-[12.5px] text-[#71757e] font-semibold hover:bg-[#f7f8fa] transition-colors',
            locked && 'opacity-50 cursor-not-allowed',
          )}
        >
          무응답 표시
        </button>
      </div>

      {localChoice === null && (
        <p className="text-[12.5px] text-[#9aa0ab]">무응답 또는 미인식</p>
      )}

      {locked && (
        <div className="absolute inset-0 z-10 cursor-not-allowed" onClick={onLockedClick} />
      )}
    </div>
  )
}

// ── 우측 패널: 서술형 ────────────────────────────────────────────────────────
function DescriptivePanel({
  result,
  locked,
  localText,
  setLocalText,
  onBlur,
  onLockedClick,
}: {
  result: OcrResultResponse
  locked: boolean
  localText: string
  setLocalText: (v: string) => void
  onBlur: () => void
  onLockedClick: () => void
}) {
  const fileName = `answer_${result.problem_label.toLowerCase()}.txt`

  return (
    <div className="flex-1 border-l border-[#f0f1f4] flex flex-col min-w-0 min-h-0 p-[18px]">
      <div className="flex-1 border border-[#e6e8ec] rounded-[12px] overflow-hidden flex flex-col min-h-0">
        {/* Mac titlebar */}
        <div className="flex items-center gap-[7px] px-[14px] h-[42px] bg-[#fafbfc] border-b border-[#eef0f3] flex-none">
          <span className="w-[11px] h-[11px] rounded-full bg-[#f0625c]" />
          <span className="w-[11px] h-[11px] rounded-full bg-[#f5bb42]" />
          <span className="w-[11px] h-[11px] rounded-full bg-[#5fc274]" />
          <span className="text-[12.5px] text-[#8a8f99] ml-[6px] font-mono">{fileName}</span>
        </div>
        {/* 라인 번호 + 텍스트영역 */}
        <div className="flex-1 flex text-[15px] leading-[2] overflow-hidden min-h-0">
          <div className="py-[18px] px-[12px] text-right text-[#c2c6cd] bg-[#f6f7f9] border-r border-[#eef0f3] select-none flex-none min-w-[42px] overflow-hidden font-mono text-[15px] leading-[2]">
            {localText.split('\n').map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <textarea
            className="flex-1 py-[18px] px-[15px] text-[15px] text-[#2a2e36] leading-[2] outline-none resize-none bg-[#fcfcfd] font-sans"
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={onBlur}
            readOnly={locked}
            onKeyDown={(e) => {
              if (!locked) return
              if (e.ctrlKey || e.metaKey) return
              if (e.key.length !== 1 && !['Backspace', 'Delete', 'Enter'].includes(e.key)) return
              onLockedClick()
            }}
            placeholder="OCR 인식 텍스트가 없습니다"
          />
        </div>
      </div>
    </div>
  )
}

// ── 우측 패널: 단답형 ────────────────────────────────────────────────────────
function ShortAnswerPanel({
  locked,
  localText,
  setLocalText,
  onBlur,
  onLockedClick,
}: {
  locked: boolean
  localText: string
  setLocalText: (v: string) => void
  onBlur: () => void
  onLockedClick: () => void
}) {
  return (
    <div className="flex-1 border-l border-[#f0f1f4] flex flex-col min-w-0 px-[26px] py-[22px]">
      <input
        type="text"
        className={cn(
          'w-full border-[1.5px] border-[#e4e6eb] bg-white rounded-[12px] px-[18px] py-[14px] text-[22px] font-semibold text-[#15171d] font-mono outline-none focus:border-accent transition-colors',
          locked && 'opacity-60 bg-[#fafafa]',
        )}
        value={localText}
        onChange={(e) => setLocalText(e.target.value)}
        onBlur={onBlur}
        readOnly={locked}
        onKeyDown={(e) => {
          if (!locked) return
          if (e.ctrlKey || e.metaKey) return
          if (e.key.length !== 1 && !['Backspace', 'Delete', 'Enter'].includes(e.key)) return
          onLockedClick()
        }}
        placeholder="—"
      />
    </div>
  )
}

// ── 우측 패널: 손코딩 ────────────────────────────────────────────────────────
function CodingPanel({
  result,
  locked,
  localText,
  setLocalText,
  onBlur,
  onLockedClick,
}: {
  result: OcrResultResponse
  locked: boolean
  localText: string
  setLocalText: (v: string) => void
  onBlur: () => void
  onLockedClick: () => void
}) {
  const lang = result.problem_language ?? 'CPP'
  const fileName = `answer_${result.problem_label.toLowerCase()}.${LANG_EXT[lang] ?? 'txt'}`

  return (
    <div className="flex-1 border-l border-[#f0f1f4] flex flex-col min-w-0 min-h-0 p-[18px]">
      <div className="flex-1 border border-[#e6e8ec] rounded-[12px] overflow-hidden flex flex-col min-h-0">
        {/* Mac titlebar */}
        <div className="flex items-center gap-[7px] px-[14px] py-[10px] bg-[#fafbfc] border-b border-[#eef0f3] flex-none">
          <span className="w-[11px] h-[11px] rounded-full bg-[#f0625c]" />
          <span className="w-[11px] h-[11px] rounded-full bg-[#f5bb42]" />
          <span className="w-[11px] h-[11px] rounded-full bg-[#5fc274]" />
          <span className="text-[12.5px] text-[#8a8f99] ml-[6px] font-mono">{fileName}</span>
          <span className="ml-auto text-[11px] font-bold px-[8px] py-[2px] rounded-[6px] bg-[#f59e0b20] text-[#d97706]">
            {LANG_LABELS[lang] ?? lang}
          </span>
        </div>
        {/* 에디터 */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <CodeEditor
            value={localText}
            onChange={locked ? undefined : setLocalText}
            language={result.problem_language ?? null}
            readOnly={locked}
            onBlur={onBlur}
            onAttemptEdit={locked ? onLockedClick : undefined}
          />
        </div>
      </div>
    </div>
  )
}

// ── Step5Page ────────────────────────────────────────────────────────────────
export default function Step5Page() {
  const { examId: examIdStr } = useParams<{ examId: string }>()
  const examId = Number(examIdStr)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [isAdvancing, setIsAdvancing] = useState(false)

  const handleNext = async () => {
    // 과거/미래 Step에서는 진행 상태 갱신(advance) 없이 이동만
    if (examRes?.data?.step !== 5) {
      navigate(`/exam/${examId}/step/6`)
      return
    }
    setIsAdvancing(true)
    try {
      await examsApi.advance(examId, 5)
      await qc.invalidateQueries({ queryKey: ['exam', examId] })
      navigate(`/exam/${examId}/step/6`)
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
    isAllOcrRunning,
    allOcrJobProgress,
    runAllOcr,
    studentOcrStudentId,
    isStudentOcrRunning,
    handleStudentClick,
    rerunStudentOcr,
    view,
    progress,
    students,
    selectedStudentIdx,
    selectedStudent,
    navStudent,
    goToList,
    selectedProblemIdx,
    setSelectedProblemIdx,
    navProblem,
    results,
    selectedResult,
    localText,
    setLocalText,
    saveText,
    localChoice,
    saveChoice,
    handleConfirm,
    handleSaveAndAdvance,
    isConfirming,
    isUpdating,
    isLastProblem,
    pdfUrl,
  } = useStep5(examId)

  const [editMode, setEditMode] = useState(false)
  useEffect(() => { setEditMode(false) }, [selectedResult?.ocr_result_id])

  const onLockedClick = useLockedToast()

  const confirmedCount = progress?.confirmed_student_count ?? 0
  const totalCount = progress?.total_student_count ?? 0
  const pct = totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 0
  const isFirstProblem = selectedProblemIdx === 0
  const isCurrentReviewed = selectedResult?.status === 'REVIEWED'
  const locked = isCurrentReviewed && !editMode

  return (
    <div className="relative flex h-screen overflow-hidden bg-white">
      <aside className="w-[252px] shrink-0">
        <ExamSidebar examId={examId} examName={examRes?.data?.name} currentStep={5} examStep={examRes?.data?.step} />
      </aside>

      {/* ── 메인 리스트 뷰 ──────────────────────────────────────────────── */}
      {view === 'list' ? (
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <div className="px-[30px] py-[24px] pb-[20px] border-b border-[#f0f1f4] flex-none">
            <h2 className="text-[22px] font-extrabold text-[#15171d] tracking-[-0.02em]">
              답안 검토 현황
            </h2>
            <p className="text-[14px] text-[#71757e] mt-[5px]">
              학생 이름을 눌러 문제 순서대로 OCR의 답안 인식을 검토 및 확정하세요
            </p>
            {/* 전체 확정 진행바 + OCR 실행 버튼 */}
            <div className="flex items-center gap-[12px] mt-[16px]">
              <span className="text-[12.5px] text-[#9aa0ab] font-semibold flex-none">전체 확정</span>
              <div className="flex-1 h-[8px] rounded-[5px] bg-[#eef0f3] overflow-hidden">
                <div
                  className="h-full rounded-[5px] bg-accent transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[12.5px] text-[#4b4f57] font-bold flex-none">
                {confirmedCount} / {totalCount} 확정
              </span>
              <button
                type="button"
                onClick={runAllOcr}
                disabled={isAllOcrRunning}
                className="flex items-center gap-[7px] h-[34px] px-[14px] bg-accent text-white text-[12.5px] font-bold rounded-[9px] shadow-[0_2px_8px_rgba(79,70,229,.3)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex-none"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                  <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                {isAllOcrRunning ? 'OCR 처리 중...' : '전체 답안 OCR 실행'}
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-[30px] py-[14px]">
            {/* 컬럼 헤더 */}
            <div className="flex items-center text-[12.5px] text-[#8a8f99] font-bold px-[16px] pb-[10px]">
              <div className="w-[32px] flex-none" />
              <div className="flex-1 pl-[14px]">학생</div>
              <div className="w-[148px]">OCR 여부</div>
              <div className="w-[200px]">답안 검토 진행</div>
              <div className="w-[24px]" />
            </div>

            <div className="flex flex-col gap-[8px]">
              {students.length === 0 ? (
                <div className="flex items-center justify-center py-[60px] text-[13.5px] text-[#9aa0ab]">
                  OCR 처리 중이거나 학생 데이터가 없습니다
                </div>
              ) : (
                students.map((s, i) => {
                  const isStudentOcrRunning = s.student_id === studentOcrStudentId
                  const hasOcrResults = s.total_count > 0
                  const barColor = s.percent === 100 ? '#138a5a' : s.percent === 0 ? '#d4d7dd' : '#4F46E5'
                  const pctColor = s.percent === 100 ? '#138a5a' : s.percent === 0 ? '#aab0ba' : '#4b4f57'

                  return (
                    <button
                      key={s.student_id}
                      type="button"
                      onClick={() => handleStudentClick(i)}
                      disabled={isAllOcrRunning || (!!studentOcrStudentId && !isStudentOcrRunning)}
                      className="flex items-center px-[16px] py-[13px] border border-[#ebedf1] rounded-[13px] hover:bg-[#fafbfc] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left w-full"
                    >
                      {/* 아바타 */}
                      <div className="w-[32px] flex-none">
                        <div className="w-[32px] h-[32px] rounded-full bg-[#eceef2] flex items-center justify-center text-[13px] font-bold text-[#71757e]">
                          {s.name.charAt(0)}
                        </div>
                      </div>
                      {/* 이름 + 학번 */}
                      <div className="flex-1 flex flex-col gap-[2px] pl-[14px] min-w-0">
                        <span className="text-[15px] font-bold text-[#000]">{s.name}</span>
                        <span className="text-[12.5px] text-[#9aa0ab] font-mono">{s.student_no}</span>
                      </div>
                      {/* OCR 상태 + 검토 진행 */}
                      <div className="w-[340px] flex-none flex items-center gap-[10px]">
                        {/* 상태 배지 */}
                        <div className="w-[68px] flex-none flex items-center">
                          {isStudentOcrRunning ? (
                            <span className="flex items-center gap-[5px] text-[11.5px] font-bold text-accent">
                              <span className="w-[10px] h-[10px] rounded-full border-2 border-accent border-t-transparent animate-spin flex-none" />
                              OCR 중
                            </span>
                          ) : !hasOcrResults ? (
                            <span className="text-[11.5px] font-semibold text-[#b0b5be] bg-[#f2f3f5] px-[7px] py-[2px] rounded-[5px]">
                              미실행
                            </span>
                          ) : (
                            <span className="text-[11.5px] font-semibold text-[#138a5a] bg-[#eaf7f0] px-[7px] py-[2px] rounded-[5px]">
                              완료
                            </span>
                          )}
                        </div>
                        {/* 검토 진행 바 */}
                        {hasOcrResults ? (
                          <>
                            <div className="flex-1 h-[9px] rounded-[5px] bg-[#eef0f3] overflow-hidden">
                              <div
                                className="h-full rounded-[5px] transition-all"
                                style={{ width: `${Math.max(s.percent, 2)}%`, background: barColor }}
                              />
                            </div>
                            <span
                              className="w-[42px] text-right text-[13px] font-bold"
                              style={{ color: pctColor }}
                            >
                              {s.percent}%
                            </span>
                          </>
                        ) : (
                          <span className="flex-1 text-[12px] text-[#c2c6cd]">
                            {isStudentOcrRunning ? '인식 중...' : '클릭하여 OCR 실행'}
                          </span>
                        )}
                      </div>
                      {/* 화살표 */}
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
              onClick={() => navigate(`/exam/${examId}/step/4`)}
              className="h-[44px] px-[18px] border border-[#e0e3e9] bg-white rounded-[11px] text-[14px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] transition-colors"
            >
              ← 이전
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={isAdvancing || totalCount === 0 || confirmedCount < totalCount}
              className="flex items-center gap-[6px] h-[44px] px-[20px] bg-accent text-white text-[14.5px] font-bold rounded-[11px] shadow-[0_4px_12px_rgba(79,70,229,.3)] hover:opacity-90 transition-opacity disabled:bg-[#c1c5cd] disabled:shadow-none disabled:cursor-not-allowed"
            >
              다음: 채점 확정
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 5l7 7-7 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </main>
      ) : (
        /* ── 상세 뷰 ──────────────────────────────────────────────────── */
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <div className="px-[30px] py-[20px] pb-0 border-b border-[#f0f1f4] flex-none">
            <div className="flex items-center justify-between">
              {/* 현황으로 / 학생 이름 */}
              <div className="flex items-center gap-[10px]">
                <button
                  type="button"
                  onClick={goToList}
                  className="flex items-center gap-[6px] text-[13px] text-[#9aa0ab] font-semibold hover:text-[#5f636b] transition-colors"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  현황
                </button>
                <h2 className="text-[20px] font-extrabold text-[#15171d] tracking-[-0.02em]">
                  {selectedStudent?.name ?? '—'}
                </h2>
                <span className="text-[12.5px] text-[#9aa0ab] font-semibold font-mono">
                  {selectedStudent?.student_no}
                </span>
              </div>
              {/* 학생 네비 */}
              <div className="flex items-center gap-[9px]">
                <button
                  type="button"
                  disabled={selectedStudentIdx === 0}
                  onClick={() => navStudent(-1)}
                  className="w-[34px] h-[34px] border border-[#e2e4e9] bg-white rounded-[9px] flex items-center justify-center text-[#5f636b] hover:bg-[#f7f8fa] disabled:opacity-30 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <span className="text-[13px] font-bold text-[#15171d]">
                  학생 {selectedStudentIdx + 1} / {students.length}
                </span>
                <button
                  type="button"
                  disabled={selectedStudentIdx === students.length - 1}
                  onClick={() => navStudent(1)}
                  className="w-[34px] h-[34px] border border-[#e2e4e9] bg-white rounded-[9px] flex items-center justify-center text-[#5f636b] hover:bg-[#f7f8fa] disabled:opacity-30 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 문제 stepper pills + OCR 재실행 */}
            <div className="flex items-center gap-[8px] mt-[16px] pb-[14px] flex-wrap">
              {results.map((r, i) => (
                <ProblemPill
                  key={r.ocr_result_id}
                  result={r}
                  isCurrent={i === selectedProblemIdx}
                  onClick={() => setSelectedProblemIdx(i)}
                />
              ))}
              {results.length === 0 && (
                <span className="text-[13px] text-[#9aa0ab]">인식 결과가 없습니다</span>
              )}
              <div className="ml-auto flex-none">
                <button
                  type="button"
                  onClick={rerunStudentOcr}
                  disabled={isStudentOcrRunning || isAllOcrRunning}
                  className="flex items-center gap-[6px] h-[34px] px-[13px] border border-[#e0e3e9] bg-white rounded-[10px] text-[13px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isStudentOcrRunning ? (
                    <>
                      <span className="w-[11px] h-[11px] rounded-full border-2 border-[#9aa0ab] border-t-transparent animate-spin flex-none" />
                      OCR 중...
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M4 4v5h5M20 20v-5h-5M4.93 14A8 8 0 1 0 6.34 6.34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      OCR 재실행
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Body */}
          {selectedResult ? (
            <div className="flex-1 flex min-h-0">
              <AnswerImagePanel result={selectedResult} pdfUrl={pdfUrl} />
              {selectedResult.problem_type === 'MULTIPLE_CHOICE' && (
                <MultipleChoicePanel
                  locked={locked}
                  localChoice={localChoice}
                  onSaveChoice={saveChoice}
                  onLockedClick={onLockedClick}
                />
              )}
              {selectedResult.problem_type === 'SHORT_ANSWER' && (
                <ShortAnswerPanel
                  locked={locked}
                  localText={localText}
                  setLocalText={setLocalText}
                  onBlur={saveText}
                  onLockedClick={onLockedClick}
                />
              )}
              {selectedResult.problem_type === 'DESCRIPTIVE' && (
                <DescriptivePanel
                  result={selectedResult}
                  locked={locked}
                  localText={localText}
                  setLocalText={setLocalText}
                  onBlur={saveText}
                  onLockedClick={onLockedClick}
                />
              )}
              {selectedResult.problem_type === 'CODING' && (
                <CodingPanel
                  result={selectedResult}
                  locked={locked}
                  localText={localText}
                  setLocalText={setLocalText}
                  onBlur={saveText}
                  onLockedClick={onLockedClick}
                />
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[13.5px] text-[#9aa0ab]">
              인식 결과를 불러오는 중...
            </div>
          )}

          {/* Footer */}
          <div className="flex-none px-[30px] py-[16px] border-t border-[#f0f1f4] flex items-center justify-between bg-white">
            <button
              type="button"
              disabled={isFirstProblem}
              onClick={() => navProblem(-1)}
              className="h-[44px] px-[18px] border border-[#e0e3e9] bg-white rounded-[11px] text-[14px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] disabled:opacity-40 transition-colors"
            >
              ← 이전 문제
            </button>

            <div className="flex items-center gap-[10px]">
              {/* REVIEWED 상태이고 수정 모드가 아닐 때 수정 버튼 표시 */}
              {isCurrentReviewed && !editMode && (
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className="h-[44px] px-[18px] border border-[#e0e3e9] bg-white rounded-[11px] text-[14px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] transition-colors"
                >
                  수정
                </button>
              )}

              {/* 오른쪽 주 버튼 */}
              {isCurrentReviewed && !editMode ? (
                /* 이미 확정 + 수정 모드 아님 → 그냥 다음으로 이동 */
                <button
                  type="button"
                  disabled={!selectedResult}
                  onClick={isLastProblem ? goToList : () => navProblem(1)}
                  className="flex items-center gap-[6px] h-[44px] px-[20px] bg-[#f1f2f5] text-[#4b4f57] text-[14.5px] font-bold rounded-[11px] hover:bg-[#e8eaed] disabled:opacity-40 transition-colors"
                  style={{ cursor: isLastProblem ? 'default' : undefined }}
                >
                  {isLastProblem ? '현황으로' : '다음 문제'}
                  {!isLastProblem && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              ) : isCurrentReviewed && editMode ? (
                /* 수정 모드 → 저장하고 다음으로 (재확정 없이) */
                <button
                  type="button"
                  disabled={isUpdating || !selectedResult}
                  onClick={() => { handleSaveAndAdvance(); setEditMode(false) }}
                  className="flex items-center gap-[6px] h-[44px] px-[20px] bg-accent text-white text-[14.5px] font-bold rounded-[11px] shadow-[0_4px_12px_rgba(79,70,229,.3)] hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isUpdating ? '저장 중...' : isLastProblem ? '저장 · 다음 학생' : '저장 · 다음 문제'}
                  {!isUpdating && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M9 5l7 7-7 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              ) : (
                /* 미확정(RAW) → 기존 확인 완료 버튼 */
                <button
                  type="button"
                  disabled={isConfirming || !selectedResult}
                  onClick={handleConfirm}
                  className="flex items-center gap-[6px] h-[44px] px-[20px] bg-accent text-white text-[14.5px] font-bold rounded-[11px] shadow-[0_4px_12px_rgba(79,70,229,.3)] hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isConfirming ? '처리 중...' : isLastProblem ? '확인 완료 · 다음 학생' : '확인 완료 · 다음 문제'}
                  {!isConfirming && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M9 5l7 7-7 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </main>
      )}

      {/* ── OCR 로딩 오버레이 (전체 실행 시) ──────────────────────────── */}
      {isAllOcrRunning && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-[18px] bg-white rounded-[20px] px-[52px] py-[46px] shadow-[0_16px_48px_rgba(20,24,40,.18)] text-center">
            <div className="w-[52px] h-[52px] rounded-full border-4 border-[#e2e4e9] border-t-accent animate-spin" />
            <div>
              <p className="text-[17px] font-bold text-[#15171d] mb-[6px]">
                답안 영역을 인식 중입니다
              </p>
              {allOcrJobProgress && allOcrJobProgress.total > 0 ? (
                <>
                  <div className="w-[200px] h-[6px] rounded-full bg-[#eef0f3] overflow-hidden mx-auto mt-[10px] mb-[8px]">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-500"
                      style={{ width: `${allOcrJobProgress.percent}%` }}
                    />
                  </div>
                  <p className="text-[13.5px] text-[#71757e]">
                    {allOcrJobProgress.current} / {allOcrJobProgress.total} 인식 완료
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
