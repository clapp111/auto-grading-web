import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronDown, FileText } from 'lucide-react'
import { ExamSidebar } from '@/components/common/ExamSidebar'
import { PdfCanvas } from '@/components/exam/PdfCanvas'
import { RegionMappingPanel } from '@/components/exam/RegionMappingPanel'
import { useStep4 } from '@/hooks/exam/useStep4'
import { examsApi } from '@/api/exams'
import { TYPE_COLORS, TYPE_TEXT_COLORS, TYPE_LABELS_KO } from '@/types/constants'
import type { AnswerSheetResponse, ProblemResponse } from '@/types/dto'
import { cn } from '@/lib/utils'

// ── Sheet selector dropdown ───────────────────────────────────────────────

interface SheetSelectProps {
  sheets: AnswerSheetResponse[]
  selectedIdx: number
  onChange: (idx: number) => void
}

function SheetSelect({ sheets, selectedIdx, onChange }: SheetSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = sheets[selectedIdx]
  const label = selected?.student_name ?? `답안지 ${selectedIdx + 1}`
  const sub = selected?.student_no ?? null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-[7px] h-[34px] px-[12px] border border-[#e2e4e9] bg-white rounded-[9px] text-[13px] text-[#4b4f57] font-semibold whitespace-nowrap hover:bg-[#f7f8fa] transition-colors"
      >
        <FileText size={13} className="text-[#9aa0ab] flex-none" />
        <span>{label}</span>
        {sub && (
          <span className="font-mono text-[11.5px] text-[#9aa0ab]">{sub}</span>
        )}
        <span className="text-[11px] text-[#bbbfc7] font-medium ml-[1px]">
          {selectedIdx + 1}/{sheets.length}
        </span>
        <ChevronDown size={13} className="text-[#9aa0ab]" />
      </button>

      {open && (
        <div className="absolute top-[38px] left-0 z-30 bg-white rounded-[11px] shadow-[0_8px_24px_rgba(20,24,40,.14)] border border-[#ebedf1] py-[6px] min-w-[220px] max-h-[280px] overflow-y-auto">
          {sheets.map((sheet, i) => {
            const isActive = i === selectedIdx
            const name = sheet.student_name ?? `답안지 ${i + 1}`
            return (
              <button
                key={sheet.answer_sheet_id}
                type="button"
                onClick={() => { onChange(i); setOpen(false) }}
                className={cn(
                  'w-full flex items-center gap-[8px] px-[14px] py-[9px] text-left hover:bg-[#f7f8fa] transition-colors',
                  isActive ? 'text-[#15171d]' : 'text-[#4b4f57]',
                )}
              >
                <span className="text-[12px] text-[#9aa0ab] font-mono w-[24px] flex-none">
                  {i + 1}
                </span>
                <span className="text-[13px] font-semibold flex-1 truncate">{name}</span>
                {sheet.student_no && (
                  <span className="text-[11.5px] font-mono text-[#9aa0ab]">{sheet.student_no}</span>
                )}
                {isActive && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="flex-none">
                    <path d="M5 13l4 4L19 7" stroke="#4F46E5" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Problem selector dropdown ─────────────────────────────────────────────

interface ProblemSelectProps {
  problems: ProblemResponse[]
  activeProblemId: number | null
  onChange: (id: number) => void
  mappedLabels?: Set<string>
}

function ProblemSelect({ problems, activeProblemId, onChange, mappedLabels }: ProblemSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const active = problems.find((p) => p.problem_id === activeProblemId)
  const activeDotColor = active ? TYPE_COLORS[active.type] : '#9aa0ab'
  const activeLabelColor = active ? TYPE_TEXT_COLORS[active.type] : '#9aa0ab'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-[7px] h-[34px] px-[12px] border border-[#e2e4e9] bg-white rounded-[9px] text-[13px] text-[#4b4f57] font-semibold whitespace-nowrap hover:bg-[#f7f8fa] transition-colors"
      >
        매핑할 문제
        <span className="w-[7px] h-[7px] rounded-full flex-none" style={{ background: activeDotColor }} />
        <span style={{ color: activeLabelColor }} className="font-bold">
          {active?.label ?? '—'}
        </span>
        {active && (
          <span
            className="text-[11.5px] font-semibold px-[6px] py-[1px] rounded-[5px]"
            style={{ background: TYPE_COLORS[active.type] + '20', color: TYPE_TEXT_COLORS[active.type] }}
          >
            {TYPE_LABELS_KO[active.type]}
          </span>
        )}
        <ChevronDown size={13} className="text-[#9aa0ab]" />
      </button>

      {open && (
        <div className="absolute top-[38px] left-0 z-30 bg-white rounded-[11px] shadow-[0_8px_24px_rgba(20,24,40,.14)] border border-[#ebedf1] py-[6px] min-w-[200px]">
          {problems.map((p) => {
            const dot = TYPE_COLORS[p.type]
            const txt = TYPE_TEXT_COLORS[p.type]
            const isActive = p.problem_id === activeProblemId
            const isMapped = mappedLabels?.has(p.label) ?? false
            return (
              <button
                key={p.problem_id}
                type="button"
                onClick={() => { onChange(p.problem_id); setOpen(false) }}
                className={cn(
                  'w-full flex items-center gap-[8px] px-[14px] py-[9px] text-left hover:bg-[#f7f8fa] transition-colors',
                  isActive ? 'text-[#15171d]' : isMapped ? 'text-[#c2c6cd]' : 'text-[#4b4f57]',
                )}
              >
                <span className="w-[8px] h-[8px] rounded-full flex-none" style={{ background: isMapped ? '#d1d4da' : dot }} />
                <span className="text-[13px] font-semibold flex-1">{p.label}</span>
                <span
                  className="text-[11.5px] font-semibold px-[6px] py-[1px] rounded-[5px]"
                  style={isMapped ? { background: '#f0f1f4', color: '#c2c6cd' } : { background: dot + '20', color: txt }}
                >
                  {TYPE_LABELS_KO[p.type]}
                </span>
                {isActive && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="flex-none">
                    <path d="M5 13l4 4L19 7" stroke={dot} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Layout mode toggle ────────────────────────────────────────────────────

// interface LayoutToggleProps {
//   mode: 'FIXED' | 'FREE'
//   onChange: (mode: 'FIXED' | 'FREE') => void
// }
//
// function LayoutToggle({ mode, onChange }: LayoutToggleProps) {
//   const segOn =
//     'flex items-center h-[34px] px-[15px] rounded-[9px] bg-white text-[13px] font-bold text-[#15171d] shadow-[0_1px_3px_rgba(20,24,40,.12)]'
//   const segOff =
//     'flex items-center h-[34px] px-[15px] rounded-[9px] text-[13px] font-semibold text-[#8a8f99] hover:text-[#5f636b] transition-colors cursor-pointer'
//
//   return (
//     <div className="flex bg-[#f1f2f5] rounded-[11px] p-[3px] gap-[1px]">
//       <span className={mode === 'FIXED' ? segOn : segOff} onClick={() => onChange('FIXED')}>
//         고정 레이아웃
//       </span>
//       <span className={mode === 'FREE' ? segOn : segOff} onClick={() => onChange('FREE')}>
//         자유 레이아웃
//       </span>
//     </div>
//   )
// }

// ── Step4Page ─────────────────────────────────────────────────────────────

export default function Step4Page() {
  const { examId: examIdStr } = useParams<{ examId: string }>()
  const examId = Number(examIdStr)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [isAdvancing, setIsAdvancing] = useState(false)

  const handleNext = async () => {
    // 과거/미래 Step에서는 진행 상태 갱신(advance) 없이 이동만
    if (exam?.step !== 4) {
      navigate(`/exam/${examId}/step/5`)
      return
    }
    setIsAdvancing(true)
    try {
      await examsApi.advance(examId, 4)
      await qc.invalidateQueries({ queryKey: ['exam', examId] })
      navigate(`/exam/${examId}/step/5`)
    } catch {
      toast.error('진행 상태 업데이트에 실패했습니다.')
    } finally {
      setIsAdvancing(false)
    }
  }

  const {
    exam,
    problems,
    sheets,
    selectedSheet,
    selectedSheetIdx,
    setSelectedSheetIdx,
    // layoutMode,
    isFixedMode,
    isFineTuneMode,
    isTemplateApplied,
    isApplying,
    pdfUrl,
    currentPage,
    setCurrentPage,
    overlays,
    mappingList,
    activeProblemId,
    setActiveProblemId,
    drawTool,
    setDrawTool,
    handleDrawComplete,
    deleteRegion,
    deleteLocalRegion,
    saveAndApplyTemplate,
    isSavingTemplate,
    // setLayoutMode,
    localRegionCount,
    canApplyTemplate,
  } = useStep4(examId)

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Sidebar */}
      <aside className="w-[252px] shrink-0">
        <ExamSidebar examId={examId} examName={exam?.name} currentStep={4} examStep={exam?.step} />
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="px-[30px] py-[24px] pb-[20px] border-b border-[#f0f1f4] flex items-start justify-between flex-none">
          <div>
            <h2 className="text-[22px] font-extrabold text-[#15171d] tracking-[-0.02em]">
              답안 영역 지정
            </h2>
            <p className="text-[14px] text-[#71757e] mt-[5px]">
              영역을 지정하고 문제 번호를 매핑하세요
            </p>
          </div>
          {/* <LayoutToggle mode={layoutMode} onChange={setLayoutMode} /> */}
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex-1 flex min-h-0">

          {/* PDF Viewer */}
          <div className="flex-[2.5] bg-[#eceef2] p-[24px] flex flex-col min-w-0">
            {/* 툴바 */}
            <div className="flex items-center gap-[8px] mb-[14px] flex-none">
              {/* Draw tool: 사각형 */}
              <button
                type="button"
                onClick={() => setDrawTool('rect')}
                className={cn(
                  'flex items-center gap-[6px] h-[34px] px-[13px] rounded-[9px] text-[13px] font-semibold whitespace-nowrap border transition-colors',
                  drawTool === 'rect'
                    ? 'border-accent bg-accent text-white shadow-[0_2px_6px_rgba(79,70,229,.4)]'
                    : 'border-[#e2e4e9] bg-white text-[#5f636b] hover:bg-[#f7f8fa]',
                )}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
                </svg>
                사각형
              </button>

              {/* Draw tool: 올가미 */}
              <button
                type="button"
                onClick={() => setDrawTool('lasso')}
                className={cn(
                  'flex items-center gap-[6px] h-[34px] px-[13px] rounded-[9px] text-[13px] font-semibold whitespace-nowrap border transition-colors',
                  drawTool === 'lasso'
                    ? 'border-accent bg-accent text-white shadow-[0_2px_6px_rgba(79,70,229,.4)]'
                    : 'border-[#e2e4e9] bg-white text-[#5f636b] hover:bg-[#f7f8fa]',
                )}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 12c0-5 4-7 8-7s8 2 8 6-3 7-8 7c-3 0-3 3-5 3s-3-2-3-4 2-3 3-5z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                </svg>
                올가미
              </button>

              <div className="w-[1px] h-[22px] bg-[#eaecef] mx-[4px] flex-none" />

              {/* Sheet selector */}
              {sheets.length > 0 && (
                <SheetSelect
                  sheets={sheets}
                  selectedIdx={selectedSheetIdx}
                  onChange={(idx) => { setSelectedSheetIdx(idx); setCurrentPage(1) }}
                />
              )}

              {/* Problem selector */}
              <ProblemSelect
                problems={[...problems].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))}
                activeProblemId={activeProblemId}
                onChange={setActiveProblemId}
                mappedLabels={new Set(mappingList.map(item => item.problemLabel))}
              />

              {/* Status badges — right side */}
              <div className="ml-auto flex items-center gap-[8px]">
                {isApplying && (
                  <span className="flex items-center gap-[6px] h-[32px] px-[12px] bg-amber-50 rounded-[9px] text-[12.5px] text-amber-600 font-semibold">
                    <svg
                      className="animate-spin"
                      width="14" height="14" viewBox="0 0 24 24" fill="none"
                    >
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" />
                    </svg>
                    전체 적용 중...
                  </span>
                )}

                {!isApplying && isFixedMode && isTemplateApplied && (
                  <span className="flex items-center gap-[6px] h-[32px] px-[12px] bg-accent/10 rounded-[9px] text-[12.5px] text-accent font-bold">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    첫 답안지 템플릿 적용됨
                  </span>
                )}

                {!isApplying && isFixedMode && canApplyTemplate && (
                  <button
                    type="button"
                    onClick={saveAndApplyTemplate}
                    disabled={isSavingTemplate}
                    className="flex items-center gap-[6px] h-[34px] px-[14px] bg-accent text-white text-[13px] font-bold rounded-[9px] shadow-[0_4px_12px_rgba(79,70,229,.3)] hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {isSavingTemplate ? '적용 중...' : '전체 답안지에 적용'}
                  </button>
                )}

                {!isApplying && isFixedMode && !isTemplateApplied && localRegionCount === 0 && sheets.length > 0 && (
                  <span className="flex items-center gap-[6px] h-[32px] px-[12px] bg-[#f1f2f5] rounded-[9px] text-[12.5px] text-[#9aa0ab] font-semibold">
                    캔버스에 영역을 그려 매핑하세요
                  </span>
                )}
              </div>
            </div>

            {sheets.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-[10px]">
                  <div className="w-[48px] h-[48px] rounded-[13px] bg-white/60 flex items-center justify-center">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <rect x="4" y="3" width="12" height="16" rx="2" stroke="#9aa0ab" strokeWidth="1.6" />
                      <path d="M16 3l4 4" stroke="#9aa0ab" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M16 3v4h4" stroke="#9aa0ab" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-[13.5px] text-[#71757e] text-center">
                    3단계에서 답안지를 먼저 업로드하세요
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-0">
                <PdfCanvas
                  url={pdfUrl}
                  pageWidth={840}
                  regions={overlays}
                  drawMode={drawTool}
                  onDrawComplete={handleDrawComplete}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="flex-1 border-l border-[#f0f1f4] min-w-0">
            <RegionMappingPanel
              mappingList={[...mappingList]
                .sort((a, b) => a.problemLabel.localeCompare(b.problemLabel, undefined, { numeric: true }))
                .map((item, i) => ({ ...item, index: i + 1 }))}
              sheets={sheets}
              selectedSheetIdx={selectedSheetIdx}
              onSelectSheet={setSelectedSheetIdx}
              onDeleteServer={(id) => deleteRegion(id, selectedSheet?.answer_sheet_id ?? 0)}
              onDeleteLocal={deleteLocalRegion}
              isFineTuneMode={isFineTuneMode}
            />
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex-none px-[30px] py-[16px] border-t border-[#f0f1f4] flex items-center justify-between bg-white">
          <button
            type="button"
            onClick={() => navigate(`/exam/${examId}/step/3`)}
            className="h-[44px] px-[18px] border border-[#e0e3e9] bg-white rounded-[11px] text-[14px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] transition-colors"
          >
            ← 이전
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={isAdvancing}
            className="flex items-center gap-[6px] h-[44px] px-[20px] bg-accent text-white text-[14.5px] font-bold rounded-[11px] shadow-[0_4px_12px_rgba(79,70,229,.3)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            다음: 답안 OCR 확인
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 5l7 7-7 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </main>
    </div>
  )
}
