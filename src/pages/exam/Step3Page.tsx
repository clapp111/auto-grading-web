import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Trash2, Upload, LayoutGrid } from 'lucide-react'
import { ExamSidebar } from '@/components/common/ExamSidebar'
import { IdRegionModal } from '@/components/exam/IdRegionModal'
import { SheetPreviewModal } from '@/components/exam/SheetPreviewModal'
import { useAnswerSheets } from '@/hooks/exam/useAnswerSheets'
import { examsApi } from '@/api/exams'
import type { AnswerSheetResponse } from '@/types/dto'
import { cn } from '@/lib/utils'

// ── Sheet row ─────────────────────────────────────────────────────────

function SheetRow({
  sheet,
  onDelete,
  onPatch,
  onPreview,
}: {
  sheet: AnswerSheetResponse
  onDelete: () => void
  onPatch: (body: { name: string | null; student_no: string | null }) => void
  onPreview: () => void
}) {
  const nameRef = useRef<HTMLInputElement>(null)
  const noRef = useRef<HTMLInputElement>(null)
  const [nameVal, setNameVal] = useState(sheet.student_name ?? '')
  const [noVal, setNoVal] = useState(sheet.student_no ?? '')

  // Sync server-side updates (OCR 등) when the field isn't focused
  useEffect(() => {
    if (document.activeElement !== nameRef.current) setNameVal(sheet.student_name ?? '')
  }, [sheet.student_name])
  useEffect(() => {
    if (document.activeElement !== noRef.current) setNoVal(sheet.student_no ?? '')
  }, [sheet.student_no])

  const isComplete = !!nameVal.trim() && !!noVal.trim()

  const handleBlur = () => {
    const name = nameVal.trim() || null
    const student_no = noVal.trim() || null
    const prevName = sheet.student_name || null
    const prevNo = sheet.student_no || null
    if (name !== prevName || student_no !== prevNo) {
      onPatch({ name, student_no })
    }
  }

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    reset: () => void,
  ) => {
    if (e.key === 'Enter') e.currentTarget.blur()
    if (e.key === 'Escape') { reset(); e.currentTarget.blur() }
  }

  return (
    <div className="flex items-center border-b border-[#f2f3f6] group hover:bg-[#fafbfc]">
      {/* 답안지 썸네일 — 클릭하면 프리뷰 모달 */}
      <div className="w-[92px] px-[16px] py-[10px] flex-none">
        <button
          type="button"
          onClick={onPreview}
          className="w-[38px] h-[50px] rounded-[5px] bg-gradient-to-br from-[#f4f5f7] to-[#e9ebef] border border-[#e2e4e9] flex items-end p-[4px] hover:border-accent hover:shadow-sm transition-all cursor-pointer"
        >
          <div className="w-full h-[5px] rounded-[2px] bg-[#d4d7dd]" />
        </button>
      </div>

      {/* 이름 */}
      <div className="flex-1 px-[16px] py-[10px]">
        <input
          ref={nameRef}
          value={nameVal}
          onChange={(e) => setNameVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => handleKeyDown(e, () => setNameVal(sheet.student_name ?? ''))}
          placeholder={!nameVal.trim() ? '이름 미인식' : undefined}
          className={cn(
            'w-full h-[38px] rounded-[9px] px-[12px] text-[14px] bg-white text-[#15171d] font-medium outline-none transition-colors',
            !nameVal.trim()
              ? 'border-[1.5px] border-[#f0b4b4] placeholder:text-[#cf9a9a] focus:border-accent'
              : 'border border-[#e4e6eb] focus:border-accent',
          )}
        />
      </div>

      {/* 학번 */}
      <div className="flex-1 px-[16px] py-[10px]">
        <input
          ref={noRef}
          value={noVal}
          onChange={(e) => setNoVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => handleKeyDown(e, () => setNoVal(sheet.student_no ?? ''))}
          placeholder={!noVal.trim() ? '— — —' : undefined}
          className={cn(
            'w-full h-[38px] rounded-[9px] px-[12px] text-[14px] bg-white text-[#15171d] font-medium font-mono outline-none transition-colors',
            !noVal.trim()
              ? 'border-[1.5px] border-[#f0b4b4] placeholder:text-[#cf9a9a] focus:border-accent'
              : 'border border-[#e4e6eb] focus:border-accent',
          )}
        />
      </div>

      {/* 상태 */}
      <div className="w-[150px] px-[16px] py-[10px] flex items-center justify-between">
        <span
          className={cn(
            'inline-flex items-center gap-[5px] text-[12.5px] font-bold px-[11px] py-[5px] rounded-full',
            isComplete
              ? 'bg-[#e7f6ee] text-[#138a5a]'
              : 'bg-[#fdecec] text-[#c0392b]',
          )}
        >
          {isComplete ? (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              입력 완료
            </>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
              미인식
            </>
          )}
        </span>
        <button
          type="button"
          onClick={onDelete}
          className="text-[#d8dae0] hover:text-[#9aa0ab] transition-colors opacity-0 group-hover:opacity-100 mr-[4px]"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Step3Page ─────────────────────────────────────────────────────────

export default function Step3Page() {
  const { examId: examIdStr } = useParams<{ examId: string }>()
  const examId = Number(examIdStr)
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [regionModalOpen, setRegionModalOpen] = useState(false)
  const [previewSheet, setPreviewSheet] = useState<AnswerSheetResponse | null>(null)

  const { data: examRes } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => examsApi.get(examId),
    enabled: !!examId,
  })

  const {
    sheets,
    isLoading,
    uploading,
    matchedCount,
    recognizing,
    uploadSheets,
    deleteSheet,
    patchSheet,
    saveIdRegions,
    savingIdRegions,
  } = useAnswerSheets(examId)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) {
      uploadSheets(files)
      e.target.value = ''
    }
  }

  const firstSheet = sheets[0] ?? null

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* 사이드바 */}
      <aside className="w-[252px] shrink-0">
        <ExamSidebar examId={examId} examName={examRes?.data?.name} currentStep={3} />
      </aside>

      {/* 메인 */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="px-[30px] py-[24px] pb-[20px] border-b border-[#f0f1f4] flex-none">
          <h2 className="text-[22px] font-extrabold text-[#15171d] tracking-[-0.02em]">
            학생 정보 입력 / 매칭
          </h2>
          <p className="text-[14px] text-[#71757e] mt-[5px]">
            첫 답안지에서 이름·학번 영역을 지정하면 이후 답안지가 자동 인식됩니다
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col min-h-0 px-[30px] pt-[22px]">

          {/* Upload + Summary */}
          <div className="flex gap-[14px] mb-[18px] flex-none">
            {/* Upload zone */}
            <div
              className="flex-1 flex items-center gap-[14px] border-[1.5px] border-dashed border-[#cdd1d8] rounded-[13px] px-[18px] py-[16px] bg-[#fafbfc] cursor-pointer hover:border-accent hover:bg-accent/[.02] transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-[42px] h-[42px] rounded-[11px] bg-accent/[.08] flex items-center justify-center flex-none">
                <Upload size={20} className="text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-[14.5px] font-bold text-[#15171d]">답안지 업로드</p>
                <p className="text-[12.5px] text-[#9aa0ab] mt-[2px]">
                  PDF 또는 이미지 (JPG/PNG) · 학생별 파일
                </p>
              </div>
              <button
                type="button"
                disabled={uploading}
                className="h-[38px] px-[16px] border border-accent bg-accent/[.08] rounded-[10px] text-accent text-[13.5px] font-bold hover:bg-accent/[.14] disabled:opacity-50 transition-colors"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
              >
                {uploading ? '업로드 중...' : '파일 선택'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Summary card */}
            <div className="w-[200px] border border-[#ebedf1] rounded-[13px] px-[18px] py-[14px] flex flex-col justify-center">
              <p className="text-[12.5px] text-[#9aa0ab] font-medium">입력 / 업로드</p>
              <div className="flex items-baseline gap-[6px] mt-[3px]">
                <span className="text-[24px] font-extrabold text-[#15171d]">{matchedCount}</span>
                <span className="text-[14px] text-[#9aa0ab] font-semibold">/ {sheets.length}</span>
              </div>
              {recognizing && (
                <p className="text-[11.5px] text-accent font-semibold mt-[6px]">인식 중...</p>
              )}
            </div>
          </div>

          {/* Table area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Table toolbar */}
            <div className="flex items-center justify-between mb-[12px] flex-none">
              <p className="text-[15px] font-bold text-[#15171d]">
                인식된 학생 정보{' '}
                <span className="font-medium text-[#9aa0ab] text-[13px]">· {sheets.length}명</span>
              </p>
              <button
                type="button"
                disabled={!firstSheet}
                onClick={() => setRegionModalOpen(true)}
                className="flex items-center gap-[7px] h-[40px] px-[15px] border border-accent bg-accent/[.08] rounded-[10px] text-accent text-[13.5px] font-bold hover:bg-accent/[.14] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <LayoutGrid size={16} />
                학생 식별 영역 지정
              </button>
            </div>

            {/* Table */}
            <div className="flex-1 border border-[#ebedf1] rounded-[13px] overflow-hidden flex flex-col min-h-0">
              {/* Table header */}
              <div className="flex items-center bg-[#fafbfc] border-b border-[#eef0f3] text-[12.5px] text-[#8a8f99] font-bold flex-none">
                <div className="w-[92px] px-[16px] py-[12px]">답안지</div>
                <div className="flex-1 px-[16px] py-[12px]">이름</div>
                <div className="flex-1 px-[16px] py-[12px]">학번</div>
                <div className="w-[150px] px-[16px] py-[12px]">입력 상태</div>
              </div>

              {/* Table body */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full text-[13px] text-[#9aa0ab]">
                    불러오는 중...
                  </div>
                ) : sheets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-[10px]">
                    <div className="w-[44px] h-[44px] rounded-[12px] bg-[#f0f1f4] flex items-center justify-center">
                      <Upload size={20} className="text-[#9aa0ab]" />
                    </div>
                    <p className="text-[13.5px] text-[#71757e]">
                      답안지를 업로드하면 학생 정보가 표시됩니다
                    </p>
                  </div>
                ) : (
                  sheets.map((sheet) => (
                    <SheetRow
                      key={sheet.answer_sheet_id}
                      sheet={sheet}
                      onDelete={() => deleteSheet(sheet.answer_sheet_id)}
                      onPatch={(body) => patchSheet(sheet.answer_sheet_id, body)}
                      onPreview={() => setPreviewSheet(sheet)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-none px-[30px] py-4 mt-[18px] border-t border-[#f0f1f4] flex items-center justify-between bg-white">
          <button
            type="button"
            onClick={() => navigate(`/exam/${examId}/step/2`)}
            className="h-[44px] px-[18px] border border-[#e0e3e9] bg-white rounded-[11px] text-[14px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] transition-colors"
          >
            ← 이전
          </button>
          <button
            type="button"
            onClick={() => navigate(`/exam/${examId}/step/4`)}
            className="flex items-center gap-[6px] h-[44px] px-[20px] bg-accent text-white text-[14.5px] font-bold rounded-[11px] shadow-[0_4px_12px_rgba(79,70,229,.3)] hover:opacity-90 transition-opacity"
          >
            다음: 답안 영역 지정
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 5l7 7-7 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </main>

      {/* 답안지 프리뷰 모달 */}
      {previewSheet && (
        <SheetPreviewModal
          sheet={previewSheet}
          onClose={() => setPreviewSheet(null)}
        />
      )}

      {/* 식별 영역 지정 모달 */}
      {regionModalOpen && firstSheet && (
        <IdRegionModal
          firstSheet={firstSheet}
          sheetCount={sheets.length}
          saving={savingIdRegions}
          onClose={() => setRegionModalOpen(false)}
          onSave={(body) =>
            saveIdRegions(body, { onSuccess: () => setRegionModalOpen(false) })
          }
        />
      )}
    </div>
  )
}
