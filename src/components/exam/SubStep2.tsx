import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { ChevronDown, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { PdfCanvas, type RegionOverlay, type DrawSelection } from './PdfCanvas'
import { useProblems } from '../../hooks/exam/useProblems'
import { useModelAnswerOcr } from '../../hooks/exam/useModelAnswerOcr'
import { TYPE_COLORS, TYPE_LABELS_KO, OCR_REQUIRED_TYPES } from '../../types/constants'

import type { ProgrammingLanguage } from '@/types/enums'
import { cn } from '@/lib/utils'

const LANG_LABELS: Record<ProgrammingLanguage, string> = {
  CPP: 'C++',
  JAVA: 'Java',
  PYTHON: 'Python',
  C: 'C',
}
const LANGUAGES: ProgrammingLanguage[] = ['CPP', 'JAVA', 'PYTHON', 'C']

interface SubStep2Props {
  examId: number
  initialModelAnswerUrl?: string | null
  onNext: () => void
  onBack: () => void
}

export function SubStep2({ examId, initialModelAnswerUrl, onNext, onBack }: SubStep2Props) {
  const [currentPage, setCurrentPage] = useState(1)
  const [activeProblemId, setActiveProblemId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<number | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState<ProgrammingLanguage>('CPP')
  const [localText, setLocalText] = useState('')

  const { problems } = useProblems(examId)
  const {
    modelAnswers,
    modelAnswerUrl,
    uploading,
    uploadFile,
    runOcr,
    ocrRunning,
    updateModelAnswer,
  } = useModelAnswerOcr(examId, initialModelAnswerUrl)

  // OCR 대상 문제 (서술형·손코딩)
  const ocrProblems = problems.filter(p => OCR_REQUIRED_TYPES.includes(p.type))

  // 첫 OCR 문제를 기본 탭으로 설정
  useEffect(() => {
    if (ocrProblems.length > 0 && activeTab === null) {
      setActiveTab(ocrProblems[0].problem_id)
    }
  }, [ocrProblems, activeTab])

  // 탭 전환 or OCR 완료 시 로컬 텍스트 동기화 (tabAnswer는 아래 선언)
  const serverText = modelAnswers.find(a => a.problem_id === activeTab)?.model_answer_text ?? ''
  useEffect(() => {
    setLocalText(serverText)
  }, [activeTab, serverText])

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0]
      if (!file) return
      try {
        await uploadFile(file)
      } catch {
        toast.error('파일 업로드에 실패했습니다.')
      }
    },
    [uploadFile],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: uploading,
  })

  const regionOverlays: RegionOverlay[] = modelAnswers
    .filter(a => a.region)
    .map(a => {
      const prob = problems.find(p => p.problem_id === a.problem_id)
      return {
        region: a.region!,
        label: prob ? `${prob.label} · ${TYPE_LABELS_KO[prob.type]}` : '',
        color: prob ? TYPE_COLORS[prob.type] : '#888',
      }
    })

  const activeProblem = ocrProblems.find(p => p.problem_id === activeProblemId) ?? null
  const isCoding = activeProblem?.type === 'CODING'

  const handleDrawComplete = (selection: DrawSelection) => {
    if (!activeProblemId) {
      toast.error('매핑할 문제를 먼저 선택하세요.')
      return
    }
    if (ocrRunning) {
      toast.error('OCR 처리 중입니다. 완료 후 다시 시도하세요.')
      return
    }
    runOcr({
      problemId: activeProblemId,
      body: { region: selection.bbox_region, ...(isCoding ? { language: selectedLanguage } : {}) },
    })
  }

  const tabProblem = ocrProblems.find(p => p.problem_id === activeTab) ?? null

  const LANG_EXT: Record<ProgrammingLanguage, string> = {
    CPP: 'cpp', JAVA: 'java', PYTHON: 'py', C: 'c',
  }
  const tabLang: ProgrammingLanguage | null =
    tabProblem?.language ?? (tabProblem?.problem_id === activeProblemId && isCoding ? selectedLanguage : null)
  const tabFileName = tabProblem
    ? tabProblem.type === 'CODING' && tabLang
      ? `answer_${tabProblem.label.toLowerCase()}.${LANG_EXT[tabLang]}`
      : `answer_${tabProblem.label.toLowerCase()}.txt`
    : 'select a problem'
  const tabAnswer = tabProblem
    ? (modelAnswers.find(a => a.problem_id === tabProblem.problem_id) ?? null)
    : null

  return (
    <>
      {/* Header */}
      <div className="px-[30px] py-[24px] pb-[20px] border-b border-[#f0f1f4] flex-none">
        <div className="flex items-center gap-[10px]">
          <h2 className="text-[22px] font-extrabold text-[#15171d] tracking-[-0.02em]">
            모범답안 영역 지정 · OCR
          </h2>
          <span className="text-[12px] font-bold text-accent bg-accent/[.08] px-[9px] py-[3px] rounded-[20px]">
            2 / 3
          </span>
        </div>
        <p className="text-[14px] text-[#71757e] mt-[5px]">
          서술형·손코딩은 모범답안에서 영역을 지정해 OCR로 추출합니다
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* Left: 모범답안 PDF 뷰어 */}
        <div className="flex-[1.2] bg-[#eceef2] p-6 flex flex-col min-w-0">
          {/* 툴바 */}
          <div className="flex items-center gap-2 mb-[14px]">
            <button
              type="button"
              className="flex items-center gap-[6px] h-[34px] px-[13px] border border-accent bg-accent rounded-[9px] text-white text-[13px] font-semibold shadow-[0_2px_6px_rgba(79,70,229,.4)] whitespace-nowrap"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              사각형
            </button>
            
            {/* 매핑할 문제 선택 + 언어 선택 */}
            <div className="ml-auto flex items-center gap-[8px]">
              {/* 언어 선택 — CODING 문제 선택 시에만 표시 */}
              {isCoding && (
                <>
                  <span className="text-[12.5px] text-[#8a8f99] font-medium whitespace-nowrap">
                    언어
                  </span>
                  <div className="relative">
                    <select
                      value={selectedLanguage}
                      onChange={e => setSelectedLanguage(e.target.value as ProgrammingLanguage)}
                      className="appearance-none h-[34px] pl-[10px] pr-[28px] border border-[#f59e0b] bg-[#f59e0b0f] rounded-[9px] text-[13px] text-[#d97706] font-semibold cursor-pointer outline-none"
                    >
                      {LANGUAGES.map(lang => (
                        <option key={lang} value={lang}>{LANG_LABELS[lang]}</option>
                      ))}
                    </select>
                    <ChevronDown
                      size={13}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#f59e0b] pointer-events-none"
                    />
                  </div>
                </>
              )}

              <span className="text-[12.5px] text-[#8a8f99] font-medium whitespace-nowrap">
                매핑할 문제
              </span>
              <div className="relative">
                <select
                  value={activeProblemId ?? ''}
                  onChange={e => setActiveProblemId(Number(e.target.value) || null)}
                  className="appearance-none h-[34px] pl-[10px] pr-[28px] border border-[#e2e4e9] bg-white rounded-[9px] text-[13px] text-[#4b4f57] font-semibold cursor-pointer outline-none"
                >
                  <option value="">선택</option>
                  {ocrProblems.map(p => (
                    <option key={p.problem_id} value={p.problem_id}>
                      {p.label} {TYPE_LABELS_KO[p.type]}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9aa0ab] pointer-events-none"
                />
              </div>
            </div>
          </div>

          {modelAnswerUrl ? (
            <PdfCanvas
              url={modelAnswerUrl}
              pageWidth={400}
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
                  'w-[400px] h-[470px] bg-white rounded-[6px] border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors',
                  isDragActive
                    ? 'border-accent bg-accent/[.04]'
                    : 'border-[#d0d3d9] hover:border-accent',
                  uploading && 'pointer-events-none opacity-60',
                )}
              >
                <input {...getInputProps()} />
                <div className="w-12 h-12 rounded-[12px] bg-[#f0f1f4] flex items-center justify-center">
                  <Upload size={22} className="text-[#9aa0ab]" />
                </div>
                <div className="text-center">
                  <p className="text-[14.5px] font-semibold text-[#3a3e46]">
                    {uploading ? '업로드 중...' : '모범답안 PDF 업로드'}
                  </p>
                  <p className="text-[12.5px] text-[#9aa0ab] mt-1">
                    클릭하거나 파일을 드래그하세요
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: OCR 결과 패널 */}
        <div className="flex-[1.05] border-l border-[#f0f1f4] flex flex-col min-w-0">
          <div className="px-[22px] pt-[18px] flex-none">
            <div className="flex items-center justify-between mb-[13px]">
              <p className="text-[14.5px] font-bold text-[#15171d]">추출된 OCR</p>
              {ocrRunning && (
                <span className="text-[12px] text-[#9aa0ab] animate-pulse">OCR 처리 중...</span>
              )}
            </div>

            {/* 문제 탭 */}
            {ocrProblems.length > 0 ? (
              <div className="flex gap-[7px] mb-[14px] flex-wrap">
                {ocrProblems.map(p => {
                  const isActive = activeTab === p.problem_id
                  const color = TYPE_COLORS[p.type]
                  return (
                    <button
                      key={p.problem_id}
                      type="button"
                      onClick={() => setActiveTab(p.problem_id)}
                      className="h-[32px] flex items-center px-[14px] rounded-[9px] text-[13px] font-semibold transition-colors"
                      style={
                        isActive
                          ? { background: color + '20', color: color }
                          : { background: '#f4f5f7', color: '#8a8f99' }
                      }
                    >
                      {p.label} {TYPE_LABELS_KO[p.type]}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-[13px] text-[#9aa0ab] mb-[14px]">
                서술형 또는 손코딩 문제가 없습니다
              </p>
            )}
          </div>

          {/* 코드 에디터 영역 */}
          <div className="flex-1 mx-4 mb-4 border border-[#e6e8ec] rounded-[12px] overflow-hidden flex flex-col min-h-0">
            {/* Mac titlebar */}
            <div className="flex items-center gap-[7px] px-[14px] py-[10px] bg-[#fafbfc] border-b border-[#eef0f3] flex-none">
              <span className="w-[11px] h-[11px] rounded-full bg-[#f0625c]" />
              <span className="w-[11px] h-[11px] rounded-full bg-[#f5bb42]" />
              <span className="w-[11px] h-[11px] rounded-full bg-[#5fc274]" />
              <span className="text-[12.5px] text-[#8a8f99] ml-[6px] font-mono">
                {tabFileName}
              </span>
              {tabProblem?.type === 'CODING' && tabLang && (
                <span className="ml-auto text-[11px] font-bold px-[8px] py-[2px] rounded-[6px] bg-[#f59e0b20] text-[#d97706]">
                  {LANG_LABELS[tabLang]}
                </span>
              )}
            </div>

            {tabAnswer?.model_answer_text != null ? (
              <div className="flex-1 flex font-mono text-[13px] leading-[2.05] overflow-hidden min-h-0">
                {/* 라인 번호 */}
                <div className="py-[14px] px-[12px] text-right text-[#c2c6cd] bg-[#f6f7f9] border-r border-[#eef0f3] select-none flex-none min-w-[42px] overflow-hidden">
                  {localText.split('\n').map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                {/* 편집 가능한 텍스트 — blur 시에만 저장 */}
                <textarea
                  className="flex-1 py-[14px] px-[15px] text-[#3a3e46] outline-none resize-none bg-[#fcfcfd] font-mono text-[13px] leading-[2.05] overflow-auto"
                  value={localText}
                  onChange={e => setLocalText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Tab') {
                      e.preventDefault()
                      const el = e.currentTarget
                      const start = el.selectionStart
                      const end = el.selectionEnd
                      const tab = '    '
                      const next = localText.slice(0, start) + tab + localText.slice(end)
                      setLocalText(next)
                      requestAnimationFrame(() => {
                        el.selectionStart = start + tab.length
                        el.selectionEnd = start + tab.length
                      })
                    }
                  }}
                  onBlur={() => {
                    if (tabProblem && localText !== (tabAnswer?.model_answer_text ?? '')) {
                      updateModelAnswer({
                        problemId: tabProblem.problem_id,
                        body: { model_answer_text: localText },
                      })
                    }
                  }}
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[13px] text-[#9aa0ab] bg-[#fcfcfd] text-center px-6">
                {ocrProblems.length === 0
                  ? '1단계에서 서술형 또는 손코딩 문제를 추가하세요'
                  : '문제를 선택하고 모범답안 PDF에서 영역을 드래그하세요'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-none px-[30px] py-4 border-t border-[#f0f1f4] flex items-center justify-between bg-white">
        <button
          type="button"
          onClick={onBack}
          className="h-[44px] px-[18px] border border-[#e0e3e9] bg-white rounded-[11px] text-[14px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] transition-colors"
        >
          ← 이전
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-[6px] h-[44px] px-[20px] bg-accent text-white text-[14.5px] font-bold rounded-[11px] shadow-[0_4px_12px_rgba(79,70,229,.3)] hover:opacity-90 transition-opacity"
        >
          다음: 정답 입력
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 5l7 7-7 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </>
  )
}
