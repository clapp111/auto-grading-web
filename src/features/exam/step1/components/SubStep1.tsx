import { useState, useCallback, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Trash2, GripVertical, ChevronDown, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { PdfCanvas, type RegionOverlay, type DrawSelection } from './PdfCanvas'
import { useProblems } from '../hooks/useProblems'
import { TYPE_COLORS, TYPE_TEXT_COLORS, TYPE_LABELS_KO, PROBLEM_TYPES } from '../constants'
import type { ProblemResponse } from '@/types/dto'
import type { ProblemType } from '@/types/enums'
import { cn } from '@/lib/utils'

// ── 유형 드롭다운 ──────────────────────────────────────────────────────

function TypeDropdown({
  value,
  onChange,
}: {
  value: ProblemType
  onChange: (t: ProblemType) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-[5px] h-[28px] px-[11px] rounded-[8px] text-[12.5px] font-bold"
        style={{
          background: TYPE_COLORS[value] + '20',
          color: TYPE_TEXT_COLORS[value],
        }}
      >
        {TYPE_LABELS_KO[value]}
        <ChevronDown size={12} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] bg-white border border-[#e0e3e9] rounded-[10px] shadow-lg py-[5px] w-[112px] z-20">
          {PROBLEM_TYPES.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { onChange(t); setOpen(false) }}
              className="w-full px-3 py-[8px] text-left text-[13px] hover:bg-[#f7f8fa] flex items-center gap-[8px]"
            >
              <span
                className="w-[8px] h-[8px] rounded-full flex-none"
                style={{ background: TYPE_COLORS[t] }}
              />
              <span style={{ color: TYPE_TEXT_COLORS[t], fontWeight: 600 }}>
                {TYPE_LABELS_KO[t]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 문제 카드 ──────────────────────────────────────────────────────────

function ProblemCard({
  problem,
  onTypeChange,
  onScoreChange,
  onLabelChange,
  onDelete,
}: {
  problem: ProblemResponse
  onTypeChange: (t: ProblemType) => void
  onScoreChange: (score: number) => void
  onLabelChange: (label: string) => void
  onDelete: () => void
}) {
  const [scoreStr, setScoreStr] = useState(String(problem.max_score))
  const [labelStr, setLabelStr] = useState(problem.label)
  const [editingLabel, setEditingLabel] = useState(false)

  useEffect(() => { setScoreStr(String(problem.max_score)) }, [problem.max_score])
  useEffect(() => { setLabelStr(problem.label) }, [problem.label])

  const handleScoreBlur = () => {
    const n = parseInt(scoreStr, 10)
    if (!isNaN(n) && n > 0) {
      onScoreChange(n)
    } else {
      setScoreStr(String(problem.max_score))
    }
  }

  const handleLabelBlur = () => {
    setEditingLabel(false)
    const trimmed = labelStr.trim()
    if (trimmed && trimmed !== problem.label) {
      onLabelChange(trimmed)
    } else {
      setLabelStr(problem.label)
    }
  }

  return (
    <div className="border border-[#ebedf1] rounded-[11px] p-[13px_14px] flex items-center gap-[11px]">
      <GripVertical size={15} className="text-[#c2c6cd] flex-none cursor-grab" />
      <span
        className="w-[10px] h-[10px] rounded-full flex-none"
        style={{ background: TYPE_COLORS[problem.type] }}
      />
      <TypeDropdown value={problem.type} onChange={onTypeChange} />
      {editingLabel ? (
        <input
          autoFocus
          value={labelStr}
          onChange={e => setLabelStr(e.target.value)}
          onBlur={handleLabelBlur}
          onKeyDown={e => {
            if (e.key === 'Enter') handleLabelBlur()
            if (e.key === 'Escape') { setLabelStr(problem.label); setEditingLabel(false) }
          }}
          className="text-[15px] font-bold text-[#15171d] outline-none border-b border-accent bg-transparent w-[60px]"
        />
      ) : (
        <span
          className="text-[15px] font-bold text-[#15171d] cursor-text hover:text-accent transition-colors"
          onClick={() => setEditingLabel(true)}
          title="클릭해서 라벨 수정"
        >
          {problem.label}
        </span>
      )}

      <div className="ml-auto flex items-center gap-[6px] flex-none">
        <div className="flex items-center border border-[#e2e4e9] rounded-[8px] h-[30px] px-[10px] bg-white">
          <input
            type="text"
            value={scoreStr}
            onChange={e => setScoreStr(e.target.value)}
            onBlur={handleScoreBlur}
            onKeyDown={e => e.key === 'Enter' && handleScoreBlur()}
            className="w-[28px] text-right text-[15px] font-bold text-[#15171d] font-mono outline-none bg-transparent"
          />
          <span className="text-[12px] text-[#9aa0ab] ml-[3px]">점</span>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="text-[#c2c6cd] hover:text-[#9aa0ab] transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}

// ── SubStep1 ───────────────────────────────────────────────────────────

interface SubStep1Props {
  examId: number
  initialSheetUrl?: string | null
  onNext: () => void
  onSkip: () => void
}

export function SubStep1({ examId, initialSheetUrl, onNext, onSkip }: SubStep1Props) {
  const [currentPage, setCurrentPage] = useState(1)
  const { problems, sheetUrl, sheetUploading, uploadSheet, create, update, remove } =
    useProblems(examId, initialSheetUrl)

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0]
      if (!file) return
      try {
        await uploadSheet(file)
      } catch {
        toast.error('파일 업로드에 실패했습니다.')
      }
    },
    [uploadSheet],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: sheetUploading,
  })

  const handleDrawComplete = async (selection: DrawSelection) => {
    const nextLabel = `Q${problems.length + 1}`
    try {
      await create({ label: nextLabel, type: 'MULTIPLE_CHOICE', max_score: 5, region: selection.bbox_region })
    } catch {
      // error toast handled in hook
    }
  }

  const regionOverlays: RegionOverlay[] = problems
    .filter(p => p.region)
    .map(p => ({
      region: p.region!,
      label: `${p.label} · ${TYPE_LABELS_KO[p.type]}`,
      color: TYPE_COLORS[p.type],
    }))

  return (
    <>
      {/* Header */}
      <div className="px-[30px] py-[24px] pb-[20px] border-b border-[#f0f1f4] flex items-start justify-between flex-none">
        <div>
          <div className="flex items-center gap-[10px]">
            <h2 className="text-[22px] font-extrabold text-[#15171d] tracking-[-0.02em]">
              문제지 세팅
            </h2>
            <span className="text-[12px] font-bold text-accent bg-accent/[.08] px-[9px] py-[3px] rounded-[20px]">
              1 / 3
            </span>
          </div>
          <p className="text-[14px] text-[#71757e] mt-[5px]">
            문제 영역을 지정하고 번호와 유형을 태깅하세요
          </p>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="h-[44px] px-[18px] border border-[#e0e3e9] bg-white rounded-[11px] text-[14px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] transition-colors flex-none"
        >
          건너뛰기
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* Left: PDF 뷰어 */}
        <div className="flex-[1.35] bg-[#eceef2] p-6 flex flex-col min-w-0">
          {/* 툴바 */}
          <div className="flex items-center justify-between mb-[14px]">
            <button
              type="button"
              className="flex items-center gap-[6px] h-[34px] px-[13px] border border-accent bg-accent rounded-[9px] text-white text-[13px] font-semibold shadow-[0_2px_6px_rgba(79,70,229,.4)] whitespace-nowrap"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              사각형
            </button>
          </div>

          {sheetUrl ? (
            <PdfCanvas
              url={sheetUrl}
              pageWidth={430}
              regions={regionOverlays}
              drawMode="rect"
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onDrawComplete={handleDrawComplete}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div
                {...getRootProps()}
                className={cn(
                  'w-[430px] h-[500px] bg-white rounded-[6px] border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors',
                  isDragActive
                    ? 'border-accent bg-accent/[.04]'
                    : 'border-[#d0d3d9] hover:border-accent',
                  sheetUploading && 'pointer-events-none opacity-60',
                )}
              >
                <input {...getInputProps()} />
                <div className="w-12 h-12 rounded-[12px] bg-[#f0f1f4] flex items-center justify-center">
                  <Upload size={22} className="text-[#9aa0ab]" />
                </div>
                <div className="text-center">
                  <p className="text-[14.5px] font-semibold text-[#3a3e46]">
                    {sheetUploading ? '업로드 중...' : '문제지 PDF 업로드'}
                  </p>
                  <p className="text-[12.5px] text-[#9aa0ab] mt-1">
                    클릭하거나 파일을 드래그하세요
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: 문제 목록 */}
        <div className="flex-1 border-l border-[#f0f1f4] flex flex-col min-w-0">
          <div className="px-[22px] py-[18px] pb-[12px] flex-none">
            <p className="text-[14.5px] font-bold text-[#15171d]">
              지정된 문제{' '}
              <span className="text-[#9aa0ab] font-semibold">{problems.length}</span>
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-[9px]">
            {problems.length === 0 ? (
              <p className="py-16 text-center text-[13px] text-[#9aa0ab]">
                PDF에서 문제 영역을 드래그해 지정하세요
              </p>
            ) : (
              problems.map(p => (
                <ProblemCard
                  key={p.problem_id}
                  problem={p}
                  onTypeChange={type => update(p.problem_id, { type })}
                  onScoreChange={max_score => update(p.problem_id, { max_score })}
                  onLabelChange={label => update(p.problem_id, { label })}
                  onDelete={() => remove(p.problem_id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-none px-[30px] py-4 border-t border-[#f0f1f4] flex items-center justify-between bg-white">
        <span className="text-[13px] text-[#9aa0ab]">변경사항 자동 저장됨</span>
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-[6px] h-[44px] px-[20px] bg-accent text-white text-[14.5px] font-bold rounded-[11px] shadow-[0_4px_12px_rgba(79,70,229,.3)] hover:opacity-90 transition-opacity"
        >
          다음: 모범답안 OCR
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 5l7 7-7 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </>
  )
}
