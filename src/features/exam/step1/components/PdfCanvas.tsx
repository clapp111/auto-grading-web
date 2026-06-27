import { useState, useRef, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Stage, Layer, Rect, Text } from 'react-konva'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Region } from '@/types/dto'

// react-pdf v10 + pdfjs-dist v6 worker 설정
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export interface RegionOverlay {
  region: Region
  label: string
  color: string
}

interface DrawRect {
  x: number
  y: number
  w: number
  h: number
}

interface PdfCanvasProps {
  url: string | null
  pageWidth?: number
  regions?: RegionOverlay[]
  drawMode?: 'rect' | 'lasso' | null
  onDrawComplete?: (region: Region) => void
  currentPage?: number
  onPageChange?: (page: number) => void
}

export function PdfCanvas({
  url,
  pageWidth = 430,
  regions = [],
  drawMode = null,
  onDrawComplete,
  currentPage = 1,
  onPageChange,
}: PdfCanvasProps) {
  const [numPages, setNumPages] = useState(0)
  const [stageSize, setStageSize] = useState({ width: pageWidth, height: 600 })
  const [drawing, setDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentRect, setCurrentRect] = useState<DrawRect | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // PDF 페이지 렌더 후 실제 크기를 Konva Stage에 동기화
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) {
        setStageSize({ width: Math.round(width), height: Math.round(height) })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const getRelativePos = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawMode) return
    const pos = getRelativePos(e)
    setDrawing(true)
    setStartPos(pos)
    setCurrentRect({ x: pos.x, y: pos.y, w: 0, h: 0 })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawing) return
    const pos = getRelativePos(e)
    setCurrentRect({
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      w: Math.abs(pos.x - startPos.x),
      h: Math.abs(pos.y - startPos.y),
    })
  }

  const handleMouseUp = () => {
    if (!drawing || !currentRect) return
    setDrawing(false)
    if (currentRect.w > 10 && currentRect.h > 10) {
      const sw = stageSize.width
      const sh = stageSize.height
      onDrawComplete?.({
        page: currentPage,
        x: currentRect.x / sw,
        y: currentRect.y / sh,
        w: currentRect.w / sw,
        h: currentRect.h / sh,
      })
    }
    setCurrentRect(null)
  }

  return (
    <div className="flex flex-col h-full select-none">
      {/* 페이지 네비게이션 */}
      {numPages > 0 && (
        <div className="flex items-center justify-center gap-3 mb-[14px]">
          <button
            className="text-[#8a8f99] disabled:opacity-30 hover:text-[#5f636b] transition-colors"
            disabled={currentPage <= 1}
            onClick={() => onPageChange?.(currentPage - 1)}
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-[12.5px] text-[#8a8f99]">{currentPage} / {numPages} 페이지</span>
          <button
            className="text-[#8a8f99] disabled:opacity-30 hover:text-[#5f636b] transition-colors"
            disabled={currentPage >= numPages}
            onClick={() => onPageChange?.(currentPage + 1)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* 캔버스 영역 */}
      <div
        className="flex-1 flex items-start justify-center overflow-hidden"
        style={{ cursor: drawMode ? 'crosshair' : 'default' }}
      >
        <div
          ref={containerRef}
          className="relative rounded-[4px] overflow-hidden bg-white shadow-[0_6px_20px_rgba(20,24,40,.16)]"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {url ? (
            <Document
              file={url}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={
                <div
                  className="flex items-center justify-center bg-white"
                  style={{ width: pageWidth, height: stageSize.height }}
                >
                  <span className="text-[13px] text-[#9aa0ab]">PDF 로딩 중...</span>
                </div>
              }
              error={
                <div
                  className="flex items-center justify-center bg-white"
                  style={{ width: pageWidth, height: 400 }}
                >
                  <span className="text-[13px] text-red-400">PDF를 불러오지 못했습니다</span>
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                width={pageWidth}
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
            </Document>
          ) : (
            <div style={{ width: pageWidth, height: 500 }} className="bg-white" />
          )}

          {/* Konva 오버레이 — pointerEvents: none 으로 마우스 이벤트는 outer div가 처리 */}
          {url && (
            <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
              <Stage width={stageSize.width} height={stageSize.height}>
                <Layer>
                  {regions
                    .filter(r => r.region.page === currentPage)
                    .flatMap((r, i) => {
                      const rx = r.region.x * stageSize.width
                      const ry = r.region.y * stageSize.height
                      const rw = r.region.w * stageSize.width
                      const rh = r.region.h * stageSize.height
                      return [
                        <Rect
                          key={`fill-${i}`}
                          x={rx} y={ry}
                          width={rw} height={rh}
                          stroke={r.color} strokeWidth={2}
                          fill={r.color + '1f'} cornerRadius={5}
                        />,
                        <Rect
                          key={`lbl-bg-${i}`}
                          x={rx + 6} y={ry - 14}
                          width={r.label.length * 7.2 + 14} height={18}
                          fill={r.color} cornerRadius={4}
                        />,
                        <Text
                          key={`lbl-txt-${i}`}
                          x={rx + 13} y={ry - 10}
                          text={r.label} fontSize={11} fontStyle="bold" fill="#fff"
                        />,
                      ]
                    })}
                  {/* 드로잉 중인 사각형 */}
                  {currentRect && (
                    <Rect
                      x={currentRect.x} y={currentRect.y}
                      width={currentRect.w} height={currentRect.h}
                      stroke="#4F46E5" strokeWidth={2}
                      fill="#4F46E520" dash={[6, 3]} cornerRadius={4}
                    />
                  )}
                </Layer>
              </Stage>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
