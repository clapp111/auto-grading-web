import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ExamSidebar } from '@/components/common/ExamSidebar'
import { gradingApi } from '@/api/grading'
import { examsApi } from '@/api/exams'

const ACCENT = '#4F46E5'
const DIST_STEP = 5

function buildDistribution(totalScores: number[], maxTotal: number) {
  if (maxTotal <= 0 || totalScores.length === 0) return []

  const bins: { start: number; end: number; count: number }[] = []
  let start = 0
  while (start <= maxTotal) {
    const end = Math.min(start + DIST_STEP - 1, maxTotal)
    bins.push({ start, end, count: 0 })
    if (end >= maxTotal) break
    start += DIST_STEP
  }

  for (const score of totalScores) {
    const clamped = Math.min(Math.max(score, 0), maxTotal)
    const idx = bins.findIndex((b) => clamped >= b.start && clamped <= b.end)
    if (idx >= 0) bins[idx].count++
  }

  return bins.map((b) => ({
    label: b.start === b.end ? `${b.start}` : `${b.start}-${b.end}`,
    count: b.count,
  }))
}

function calcStdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length)
}

export default function Step7Page() {
  const { examId: examIdStr } = useParams<{ examId: string }>()
  const examId = Number(examIdStr)
  const navigate = useNavigate()

  const { data: examRes } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => examsApi.get(examId),
    enabled: !!examId,
  })

  const { data: statsRes } = useQuery({
    queryKey: ['statistics', examId],
    queryFn: () => gradingApi.getStatistics(examId),
    enabled: !!examId,
  })

  const { data: resultsRes } = useQuery({
    queryKey: ['results', examId],
    queryFn: () => gradingApi.getResults(examId),
    enabled: !!examId,
  })

  const stats = statsRes?.data
  const examResult = resultsRes?.data
  const problems = examResult?.problems ?? []
  const students = examResult?.students ?? []

  const maxTotal = problems.reduce((s, p) => s + p.max_score, 0)
  const totalScores = students.map((s) => s.total_score)
  const sd = totalScores.length > 0 ? calcStdDev(totalScores) : null

  const distribution = buildDistribution(totalScores, maxTotal)
  const maxCount = Math.max(...distribution.map((d) => d.count), 1)

  const handleExportCsv = async () => {
    const blob = await gradingApi.exportCsv(examId)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `exam_${examId}_results.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const statCards = [
    {
      label: '평균',
      value: stats != null ? stats.average_score.toFixed(1) : '—',
      suffix: maxTotal > 0 ? ` / ${maxTotal}` : '',
    },
    { label: '최고', value: stats != null ? String(stats.highest_score) : '—' },
    { label: '최저', value: stats != null ? String(stats.lowest_score) : '—' },
    { label: '표준편차', value: sd != null ? sd.toFixed(1) : '—' },
    { label: '응시', value: stats != null ? String(stats.total_students) : '—', unit: '명' },
  ]

  return (
    <div className="relative flex h-screen overflow-hidden bg-white">
      <aside className="w-[252px] shrink-0">
        <ExamSidebar examId={examId} examName={examRes?.data?.name} currentStep={7} examStep={examRes?.data?.step} />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="px-[30px] py-[24px] pb-[20px] border-b border-[#f0f1f4] flex items-start justify-between flex-none">
          <div>
            <div className="flex items-center gap-[10px]">
              <h2 className="text-[22px] font-extrabold text-[#15171d] tracking-[-0.02em]">성적 검토</h2>
              <span className="text-[12px] font-bold text-[#138a5a] bg-[#e7f6ee] px-[9px] py-[3px] rounded-[20px]">
                채점 완료
              </span>
            </div>
            <p className="text-[14px] text-[#71757e] mt-[5px]">
              전체 점수 분포를 확인하고 결과를 내보내세요
            </p>
          </div>
          <div className="flex items-center gap-[10px]">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-[6px] h-[42px] px-[16px] border border-[#e0e3e9] bg-white rounded-[11px] text-[14px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              인쇄
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-[6px] h-[42px] px-[18px] rounded-[11px] bg-accent text-white text-[14px] font-bold shadow-[0_4px_12px_rgba(79,70,229,.25)] hover:opacity-90 transition-opacity"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14"
                  stroke="#fff"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              CSV 내보내기
            </button>
          </div>
        </div>

        {/* Scroll body */}
        <div className="flex-1 overflow-y-auto px-[30px] py-[24px]">
          {/* Stat cards */}
          <div className="flex gap-[14px] mb-[22px]">
            {statCards.map(({ label, value, suffix, unit }) => (
              <div key={label} className="flex-1 border border-[#ebedf1] rounded-[13px] px-[18px] py-[16px]">
                <div className="text-[12.5px] text-[#9aa0ab] font-semibold">{label}</div>
                <div className="text-[28px] font-extrabold text-[#15171d] mt-[3px] leading-none">
                  {value}
                  {suffix && (
                    <span className="text-[14px] text-[#aab0ba] font-semibold">{suffix}</span>
                  )}
                  {unit && (
                    <span className="text-[14px] text-[#aab0ba] font-semibold">{unit}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Distribution chart */}
          <div className="border border-[#ebedf1] rounded-[13px] px-[22px] py-[20px] mb-[18px]">
            <div className="text-[14.5px] font-bold text-[#15171d] mb-[18px]">점수 분포</div>
            <div style={{ position: 'relative', height: '164px', marginBottom: '28px' }}>
              <div className="flex items-end gap-[14px] h-full">
                {distribution.length === 0 ? (
                  <div className="flex-1 flex items-end justify-center pb-[4px]">
                    <span className="text-[13px] text-[#c2c6cd]">데이터 없음</span>
                  </div>
                ) : (
                  distribution.map((d) => {
                    const hPct = Math.max((d.count / maxCount) * 100, 2)
                    const isMax = d.count === maxCount
                    const bg = isMax
                      ? ACCENT
                      : d.count >= maxCount * 0.6
                        ? `${ACCENT}aa`
                        : `${ACCENT}44`
                    return (
                      <div
                        key={d.label}
                        className="flex-1 flex flex-col items-center justify-end h-full relative"
                      >
                        <span className="text-[12px] font-bold text-[#9aa0ab] mb-[6px]">
                          {d.count}
                        </span>
                        <div
                          style={{
                            width: '100%',
                            height: `${hPct}%`,
                            borderRadius: '6px 6px 0 0',
                            background: bg,
                          }}
                        />
                        <span
                          className="absolute text-[12px] text-[#aab0ba] font-mono whitespace-nowrap"
                          style={{ bottom: '-24px' }}
                        >
                          {d.label}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Score table */}
          <div className="border border-[#ebedf1] rounded-[13px] overflow-hidden">
            <div className="flex items-center bg-[#fafbfc] border-b border-[#eef0f3] text-[12.5px] text-[#8a8f99] font-bold">
              <div className="flex-1 px-[18px] py-[12px]">이름</div>
              <div className="w-[110px] px-[16px] py-[12px]">학번</div>
              {problems.map((p) => (
                <div key={p.problem_id} className="w-[70px] px-[16px] py-[12px]">
                  {p.label}
                </div>
              ))}
              <div className="w-[90px] px-[16px] py-[12px]">총점</div>
            </div>

            {students.length === 0 ? (
              <div className="px-[18px] py-[48px] text-center text-[13.5px] text-[#9aa0ab]">
                데이터를 불러오는 중...
              </div>
            ) : (
              students.map((s) => (
                <div
                  key={s.student_id}
                  className="flex items-center border-b border-[#f2f3f6] last:border-0 text-[14px] text-[#3a3e36]"
                >
                  <div className="flex-1 px-[18px] py-[11px] font-semibold text-[#15171d]">
                    {s.name}
                  </div>
                  <div className="w-[110px] px-[16px] py-[11px] text-[#9aa0ab] font-mono text-[13px]">
                    {s.student_no}
                  </div>
                  {problems.map((p) => {
                    const ps = s.problem_scores.find((ps) => ps.problem_id === p.problem_id)
                    return (
                      <div key={p.problem_id} className="w-[70px] px-[16px] py-[11px]">
                        {ps?.score != null ? ps.score : '—'}
                      </div>
                    )
                  })}
                  <div className="w-[90px] px-[16px] py-[11px] font-extrabold text-[#15171d]">
                    {s.total_score}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-none px-[30px] py-[16px] border-t border-[#f0f1f4] flex items-center bg-white">
          <button
            type="button"
            onClick={() => navigate(`/exam/${examId}/step/6`)}
            className="h-[44px] px-[18px] border border-[#e0e3e9] bg-white rounded-[11px] text-[14px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] transition-colors"
          >
            ← 이전
          </button>
        </div>
      </main>
    </div>
  )
}
