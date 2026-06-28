import { useState, useRef, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Stage, Layer, Rect, Text, Line, Circle } from 'react-konva'
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react'
import type { Region, Point } from '@/types/dto'
import type { RegionShape } from '@/types/enums'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export type DrawSelection =
  | { shape: 'RECT'; bbox_region: Region }
  | { shape: 'LASSO'; bbox_region: Region; polygon_points: Point[] }

export interface RegionOverlay {
  region: Region
  label: string
  color: string
  shape?: RegionShape
  polygon_points?: Point[]
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
  onDrawComplete?: (selection: DrawSelection) => void
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
  const [zoom, setZoom] = useState(1)

  const changeZoom = (delta: number) =>
    setZoom((z) => Math.min(3, Math.max(0.5, Math.round((z + delta) * 4) / 4)))

  // RECT 드래그 상태
  const [drawing, setDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentRect, setCurrentRect] = useState<DrawRect | null>(null)

  // LASSO 폴리곤 상태
  const [lassoVertices, setLassoVertices] = useState<{ x: number; y: number }[]>([])
  const [lassoPreviewPos, setLassoPreviewPos] = useState<{ x: number; y: number } | null>(null)
  // dblclick 핸들러에서 최신 vertices를 동기적으로 읽기 위한 ref
  const lassoVerticesRef = useRef<{ x: number; y: number }[]>([])

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0)
        setStageSize({ width: Math.round(width), height: Math.round(height) })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Escape로 올가미 취소
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawMode === 'lasso') {
        setLassoVertices([])
        lassoVerticesRef.current = []
        setLassoPreviewPos(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawMode])

  const getRelativePos = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  // ── RECT 이벤트 ──────────────────────────────────────────────────────────

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drawMode !== 'rect') return
    const pos = getRelativePos(e)
    setDrawing(true)
    setStartPos(pos)
    setCurrentRect({ x: pos.x, y: pos.y, w: 0, h: 0 })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const pos = getRelativePos(e)
    if (drawMode === 'rect' && drawing) {
      setCurrentRect({
        x: Math.min(startPos.x, pos.x),
        y: Math.min(startPos.y, pos.y),
        w: Math.abs(pos.x - startPos.x),
        h: Math.abs(pos.y - startPos.y),
      })
    } else if (drawMode === 'lasso') {
      setLassoPreviewPos(pos)
    }
  }

  const handleMouseUp = () => {
    if (drawMode !== 'rect' || !drawing || !currentRect) return
    setDrawing(false)
    if (currentRect.w > 10 && currentRect.h > 10) {
      const sw = stageSize.width
      const sh = stageSize.height
      onDrawComplete?.({
        shape: 'RECT',
        bbox_region: {
          page: currentPage,
          x: currentRect.x / sw,
          y: currentRect.y / sh,
          w: currentRect.w / sw,
          h: currentRect.h / sh,
        },
      })
    }
    setCurrentRect(null)
  }

  const handleMouseLeave = () => {
    if (drawMode === 'rect') handleMouseUp()
    if (drawMode === 'lasso') setLassoPreviewPos(null)
  }

  // ── LASSO 폴리곤 이벤트 ──────────────────────────────────────────────────

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drawMode !== 'lasso') return
    const pos = getRelativePos(e)
    setLassoVertices(prev => {
      const next = [...prev, pos]
      lassoVerticesRef.current = next
      return next
    })
  }

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drawMode !== 'lasso') return
    e.stopPropagation()

    // dblclick 직전 두 번의 click 이벤트 중 마지막 것(두 번째 클릭)을 제거
    const vertices = lassoVerticesRef.current.slice(0, -1)

    if (vertices.length >= 3) {
      const sw = stageSize.width
      const sh = stageSize.height
      const xs = vertices.map(p => p.x)
      const ys = vertices.map(p => p.y)
      onDrawComplete?.({
        shape: 'LASSO',
        bbox_region: {
          page: currentPage,
          x: Math.min(...xs) / sw,
          y: Math.min(...ys) / sh,
          w: (Math.max(...xs) - Math.min(...xs)) / sw,
          h: (Math.max(...ys) - Math.min(...ys)) / sh,
        },
        polygon_points: vertices.map(p => ({
          page: currentPage,
          x: p.x / sw,
          y: p.y / sh,
        })),
      })
    }

    setLassoVertices([])
    lassoVerticesRef.current = []
    setLassoPreviewPos(null)
  }

  // ── 렌더 ─────────────────────────────────────────────────────────────────

  const isLassoInProgress = drawMode === 'lasso' && lassoVertices.length > 0

  return (
    <div className="flex flex-col h-full select-none">
      {numPages > 0 && (
        <div className="flex items-center justify-between mb-[14px]">
          {/* 확대/축소 */}
          <div className="flex items-center gap-[4px]">
            <button
              className="w-[24px] h-[24px] flex items-center justify-center rounded-[6px] text-[#8a8f99] hover:bg-[#eef0f3] hover:text-[#5f636b] disabled:opacity-30 transition-colors"
              disabled={zoom <= 0.5}
              onClick={() => changeZoom(-0.25)}
            >
              <Minus size={12} />
            </button>
            <span className="text-[12px] text-[#8a8f99] w-[36px] text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              className="w-[24px] h-[24px] flex items-center justify-center rounded-[6px] text-[#8a8f99] hover:bg-[#eef0f3] hover:text-[#5f636b] disabled:opacity-30 transition-colors"
              disabled={zoom >= 3}
              onClick={() => changeZoom(0.25)}
            >
              <Plus size={12} />
            </button>
          </div>
          {/* 페이지 이동 */}
          <div className="flex items-center gap-[6px]">
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
        </div>
      )}

      {isLassoInProgress && (
        <p className="text-center text-[12px] text-[#9aa0ab] mb-[8px]">
          클릭으로 꼭짓점 추가 · 더블클릭으로 완료 · Esc로 취소
        </p>
      )}

      <div
        className="flex-1 flex items-start justify-center overflow-auto"
        style={{ cursor: drawMode ? 'crosshair' : 'default' }}
      >
        <div
          ref={containerRef}
          className="relative rounded-[4px] overflow-hidden bg-white shadow-[0_6px_20px_rgba(20,24,40,.16)]"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
        >
          {url ? (
            <Document
              file={url}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={
                <div
                  className="flex items-center justify-center bg-white"
                  style={{ width: pageWidth * zoom, height: stageSize.height }}
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
                width={pageWidth * zoom}
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
            </Document>
          ) : (
            <div style={{ width: pageWidth, height: 500 }} className="bg-white" />
          )}

          {url && (
            <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
              <Stage width={stageSize.width} height={stageSize.height}>
                <Layer>
                  {/* 저장된 오버레이 */}
                  {regions
                    .filter(r => r.region.page === currentPage)
                    .flatMap((r, i) => {
                      const rx = r.region.x * stageSize.width
                      const ry = r.region.y * stageSize.height
                      const rw = r.region.w * stageSize.width
                      const rh = r.region.h * stageSize.height
                      const shape = r.shape ?? 'RECT'

                      const shapeEl =
                        shape === 'LASSO' && r.polygon_points && r.polygon_points.length > 2 ? (
                          <Line
                            key={`fill-${i}`}
                            points={r.polygon_points
                              .filter(p => p.page === currentPage)
                              .flatMap(p => [p.x * stageSize.width, p.y * stageSize.height])}
                            stroke={r.color}
                            strokeWidth={2}
                            fill={r.color + '1f'}
                            closed
                          />
                        ) : (
                          <Rect
                            key={`fill-${i}`}
                            x={rx} y={ry}
                            width={rw} height={rh}
                            stroke={r.color} strokeWidth={2}
                            fill={r.color + '1f'} cornerRadius={5}
                          />
                        )

                      return [
                        shapeEl,
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

                  {/* RECT 드로잉 프리뷰 */}
                  {currentRect && (
                    <Rect
                      x={currentRect.x} y={currentRect.y}
                      width={currentRect.w} height={currentRect.h}
                      stroke="#4F46E5" strokeWidth={2}
                      fill="#4F46E520" dash={[6, 3]} cornerRadius={4}
                    />
                  )}

                  {/* LASSO 폴리곤 프리뷰 — 기존 엣지 */}
                  {lassoVertices.length >= 2 && (
                    <Line
                      points={lassoVertices.flatMap(p => [p.x, p.y])}
                      stroke="#4F46E5"
                      strokeWidth={2}
                      closed={false}
                    />
                  )}

                  {/* LASSO 폴리곤 프리뷰 — 커서까지의 예상 엣지 */}
                  {lassoVertices.length >= 1 && lassoPreviewPos && (
                    <Line
                      points={[
                        lassoVertices[lassoVertices.length - 1].x,
                        lassoVertices[lassoVertices.length - 1].y,
                        lassoPreviewPos.x,
                        lassoPreviewPos.y,
                      ]}
                      stroke="#4F46E5"
                      strokeWidth={1.5}
                      dash={[5, 4]}
                      opacity={0.5}
                    />
                  )}

                  {/* LASSO 꼭짓점 점 */}
                  {lassoVertices.map((p, i) => (
                    <Circle
                      key={`v-${i}`}
                      x={p.x} y={p.y}
                      radius={i === 0 ? 5 : 3.5}
                      fill={i === 0 ? '#fff' : '#4F46E5'}
                      stroke="#4F46E5"
                      strokeWidth={2}
                    />
                  ))}
                </Layer>
              </Stage>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
