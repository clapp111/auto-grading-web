import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { PdfCanvas } from '@/components/exam/PdfCanvas'
import { sheetsApi } from '@/api/sheets'
import type { AnswerSheetResponse } from '@/types/dto'

interface SheetPreviewModalProps {
  sheet: AnswerSheetResponse
  onClose: () => void
}

export function SheetPreviewModal({ sheet, onClose }: SheetPreviewModalProps) {
  const [currentPage, setCurrentPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['sheet-download', sheet.answer_sheet_id],
    queryFn: () => sheetsApi.getDownloadUrl(sheet.answer_sheet_id).then((r) => r.data),
  })

  const overlays = [
    ...(data?.student_name_region
      ? [{ region: data.student_name_region, label: '이름', color: '#16a86a' }]
      : []),
    ...(data?.student_no_region
      ? [{ region: data.student_no_region, label: '학번', color: '#4F46E5' }]
      : []),
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,20,33,.46)] backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-[18px] shadow-[0_24px_60px_rgba(13,16,28,.34)] overflow-hidden flex flex-col w-[800px] h-[900px]">

        {/* Header */}
        <div className="flex items-center justify-between px-[22px] py-[16px] border-b border-[#f0f1f4] flex-none">
          <div className="flex items-center gap-[10px]">
            <div className="w-[32px] h-[42px] rounded-[5px] bg-gradient-to-br from-[#f4f5f7] to-[#e9ebef] border border-[#e2e4e9] flex-none" />
            <div>
              <p className="text-[15px] font-bold text-[#15171d]">
                {sheet.student_name ?? '이름 미인식'}
              </p>
              <p className="text-[12.5px] text-[#9aa0ab] font-mono mt-[1px]">
                {sheet.student_no ?? '학번 미인식'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center text-[#9aa0ab] bg-[#f4f5f7] hover:bg-[#eef0f3] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 min-h-0 bg-[#eceef2] p-[18px]">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-[13px] text-[#9aa0ab]">
              불러오는 중...
            </div>
          ) : (
            <PdfCanvas
              url={data?.url ?? null}
              pageWidth={530}
              regions={overlays}
              drawMode={null}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>
    </div>
  )
}
