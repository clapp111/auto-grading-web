import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Sparkles, Trash2, RefreshCw } from 'lucide-react'
import { ExamSidebar } from '@/components/common/ExamSidebar'
import { useRubric } from '@/hooks/exam/useRubric'
import { examsApi } from '@/api/exams'
import { problemsApi, type RubricUpdateRequest } from '@/api/problems'
import type { ProblemResponse, ModelAnswerResponse, RubricResponse } from '@/types/dto'
import { TYPE_COLORS, TYPE_TEXT_COLORS, TYPE_LABELS_KO } from '@/types/constants'
import { cn } from '@/lib/utils'

// ── 루브릭 기준 카드 ──────────────────────────────────────────────────

function RubricCriterionCard({
  rubric,
  onUpdate,
  onDelete,
}: {
  rubric: RubricResponse
  onUpdate: (body: RubricUpdateRequest) => void
  onDelete: () => void
}) {
  const [text, setText] = useState(rubric.text)
  const [scoreStr, setScoreStr] = useState(String(rubric.allocated_score))

  useEffect(() => { setText(rubric.text) }, [rubric.text])
  useEffect(() => { setScoreStr(String(rubric.allocated_score)) }, [rubric.allocated_score])

  const handleTextBlur = () => {
    const trimmed = text.trim()
    if (trimmed !== rubric.text) onUpdate({ text: trimmed })
  }

  const handleScoreBlur = () => {
    const n = parseFloat(scoreStr)
    if (!isNaN(n) && n >= 0 && n !== rubric.allocated_score) {
      onUpdate({ allocated_score: n })
    } else {
      setScoreStr(String(rubric.allocated_score))
    }
  }

  return (
    <div className="border border-[#ebedf1] rounded-[12px] p-[15px_16px] flex items-start gap-3 group">
      {/* AI 뱃지 */}
      <div className="flex-none mt-[2px] w-[26px]">
        {rubric.source === 'LLM' && (
          <span className="inline-flex items-center justify-center w-[26px] h-[18px] rounded-[5px] bg-[#7c5cfc15] text-[10px] font-extrabold text-accent">
            AI
          </span>
        )}
      </div>

      {/* 텍스트 */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={handleTextBlur}
        rows={text.split('\n').length || 1}
        placeholder="채점 기준을 입력하세요"
        className="flex-1 resize-none text-[13.5px] text-[#3a3e46] leading-[1.65] outline-none bg-transparent placeholder:text-[#c2c6cd]"
        style={{ minHeight: 24, overflow: 'hidden', fieldSizing: 'content' } as React.CSSProperties}
      />

      {/* 배점 + 삭제 */}
      <div className="flex items-center gap-[8px] flex-none">
        <div className="flex items-center h-[30px] border border-[#e2e4e9] rounded-[8px] px-[9px] bg-white">
          <span className="text-[12px] text-[#9aa0ab] mr-[3px] font-medium">+</span>
          <input
            type="number"
            min="0"
            step="0.5"
            value={scoreStr}
            onChange={e => setScoreStr(e.target.value)}
            onBlur={handleScoreBlur}
            className="w-[32px] text-right text-[14px] font-bold text-[#15171d] font-mono outline-none bg-transparent"
          />
          <span className="text-[12px] text-[#9aa0ab] ml-[2px]">점</span>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="text-[#d8dae0] hover:text-[#9aa0ab] transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

// ── 루브릭 패널 ───────────────────────────────────────────────────────

function RubricPanel({
  problem,
  modelAnswer,
}: {
  problem: ProblemResponse
  modelAnswer: ModelAnswerResponse | null
}) {
  const { rubric, suggesting, suggest, addCriterion, updateCriterion, deleteCriterion } =
    useRubric(problem.problem_id)

  const totalAllocated = rubric.reduce((sum, r) => sum + r.allocated_score, 0)
  const color = TYPE_COLORS[problem.type]
  const textColor = TYPE_TEXT_COLORS[problem.type]

  return (
    <div className="flex-1 flex min-h-0">
      {/* Left: 문제 정보 */}
      <div className="w-[680px] shrink-0 border-r border-[#f0f1f4] flex flex-col overflow-y-auto">
        <div className="px-[24px] py-[20px] flex flex-col gap-[18px]">

          {/* 문제 텍스트 */}
          {problem.problem_text && (
            <div>
              <p className="text-[12px] font-semibold text-[#9aa0ab] mb-[8px] uppercase tracking-wide">
                문제
              </p>
              <p
                className="text-[13px] text-[#4b4f57] leading-[1.75] whitespace-pre-wrap font-mono bg-[#f7f8fa] border border-[#eef0f3] rounded-[10px] p-[12px_14px]">
                {problem.problem_text.length > 400
                  ? problem.problem_text.slice(0, 400) + '...'
                  : problem.problem_text}
              </p>
            </div>
          )}

          {/* 모범답안 */}
          <div>
            <p className="text-[12px] font-semibold text-[#9aa0ab] mb-[8px] uppercase tracking-wide">
              모범답안
            </p>
            {modelAnswer?.model_answer_text ? (
              <p className="text-[13px] text-[#4b4f57] leading-[1.75] whitespace-pre-wrap font-mono bg-[#f7f8fa] border border-[#eef0f3] rounded-[10px] p-[12px_14px]">
                {modelAnswer.model_answer_text}
              </p>
            ) : (
              <p className="text-[13px] text-[#b0b4bc] italic">
                모범답안 OCR이 아직 완료되지 않았습니다
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right: 루브릭 기준 */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* 루브릭 헤더 */}
        <div className="px-[24px] py-[16px] border-b border-[#f0f1f4] flex items-center gap-[10px] flex-none">
          <span className="text-[14.5px] font-bold text-[#15171d]">채점 기준</span>
          <span className="flex items-center gap-[4px] text-[11.5px] font-bold px-[8px] py-[3px] rounded-[6px] bg-[#7c5cfc12] text-accent">
            <Sparkles size={10} />
            AI 추천
          </span>

          <div className="ml-auto flex items-center gap-[8px]">
            {/* 배점 합계 */}
            <span
              className={cn(
                'text-[12.5px] font-bold px-[10px] py-[4px] rounded-[8px]',
                totalAllocated === problem.max_score
                  ? 'bg-[#16a86a15] text-[#16a86a]'
                  : totalAllocated > problem.max_score
                    ? 'bg-[#f0625c15] text-[#f0625c]'
                    : 'bg-[#f0f1f4] text-[#71757e]',
              )}
            >
              {totalAllocated} / {problem.max_score}점
            </span>

            {/* 다시 추천 버튼 */}
            <button
              type="button"
              onClick={() => suggest()}
              disabled={suggesting}
              className="flex items-center gap-[5px] h-[32px] px-[12px] border border-[#e2e4e9] bg-white rounded-[9px] text-[12.5px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] disabled:opacity-50 transition-colors"
            >
              <RefreshCw
                size={13}
                className={cn(suggesting && 'animate-spin')}
              />
              {suggesting ? 'AI 추천 중...' : '다시 추천'}
            </button>
          </div>
        </div>

        {/* 기준 목록 */}
        <div className="flex-1 overflow-y-auto px-[24px] py-[16px] flex flex-col gap-[8px]">
          {rubric.length === 0 && !suggesting ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-accent/10 flex items-center justify-center">
                <Sparkles size={20} className="text-accent" />
              </div>
              <p className="text-[13.5px] text-[#71757e] text-center">
                채점 기준이 없습니다<br />
                <span className="text-accent font-semibold">다시 추천</span>을 눌러 AI가 기준을 생성하게 하거나<br />직접 추가하세요
              </p>
            </div>
          ) : suggesting && rubric.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <RefreshCw size={22} className="text-accent animate-spin" />
              <p className="text-[13.5px] text-[#9aa0ab]">AI가 채점 기준을 생성하고 있습니다...</p>
            </div>
          ) : (
            rubric
              .slice()
              .sort((a, b) => a.order_index - b.order_index)
              .map(r => (
                <RubricCriterionCard
                  key={r.rubric_id}
                  rubric={r}
                  onUpdate={body => updateCriterion(r.rubric_id, body)}
                  onDelete={() => deleteCriterion(r.rubric_id)}
                />
              ))
          )}

          {/* 기준 추가 버튼 */}
          <button
            type="button"
            onClick={addCriterion}
            className="flex items-center gap-[6px] h-[40px] px-[14px] border-[1.5px] border-dashed border-[#d0d3d9] rounded-[11px] text-[13px] text-[#8a8f99] font-semibold hover:border-accent hover:text-accent transition-colors mt-1"
          >
            <Plus size={15} />
            채점 기준 추가
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Step2Page ─────────────────────────────────────────────────────────

export default function Step2Page() {
  const { examId: examIdStr } = useParams<{ examId: string }>()
  const examId = Number(examIdStr)
  const navigate = useNavigate()
  const [activeProblemId, setActiveProblemId] = useState<number | null>(null)

  const { data: examRes } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => examsApi.get(examId),
    enabled: !!examId,
  })

  const { data: problemsData } = useQuery({
    queryKey: ['problems', examId],
    queryFn: () => problemsApi.list(examId).then(r => r.data ?? []),
    enabled: !!examId,
  })

  const { data: modelAnswersData } = useQuery({
    queryKey: ['model-answers', examId],
    queryFn: () => problemsApi.listModelAnswers(examId).then(r => r.data ?? []),
    enabled: !!examId,
  })

  const problems: ProblemResponse[] = problemsData ?? []
  const modelAnswers: ModelAnswerResponse[] = modelAnswersData ?? []

  // 서술형·손코딩 문제만 루브릭 설정 대상
  const rubricProblems = problems.filter(
    p => p.type === 'DESCRIPTIVE' || p.type === 'CODING',
  )

  useEffect(() => {
    if (rubricProblems.length > 0 && activeProblemId === null) {
      setActiveProblemId(rubricProblems[0].problem_id)
    }
  }, [rubricProblems, activeProblemId])

  const activeProblem = rubricProblems.find(p => p.problem_id === activeProblemId) ?? null
  const activeModelAnswer = modelAnswers.find(a => a.problem_id === activeProblemId) ?? null

  const examName = examRes?.data?.name

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* 사이드바 */}
      <aside className="w-[252px] shrink-0">
        <ExamSidebar examId={examId} examName={examName} currentStep={2} />
      </aside>

      {/* 메인 */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="px-[30px] py-[24px] pb-[0px] border-b border-[#f0f1f4] flex-none">
          <div className="flex items-center gap-[10px] mb-[16px]">
            <h2 className="text-[22px] font-extrabold text-[#15171d] tracking-[-0.02em]">
              루브릭 설정
            </h2>
          </div>
          <p className="text-[14px] text-[#71757e] mb-[16px]">
            서술형·손코딩 문제의 채점 기준을 검토하고 수정하세요
          </p>

          {/* 문제 탭 */}
          {rubricProblems.length > 0 && (
            <div className="flex gap-[4px]">
              {rubricProblems.map(p => {
                const isActive = activeProblemId === p.problem_id
                const color = TYPE_COLORS[p.type]
                return (
                  <button
                    key={p.problem_id}
                    type="button"
                    onClick={() => setActiveProblemId(p.problem_id)}
                    className={cn(
                      'h-[36px] flex items-center gap-[6px] px-[14px] rounded-t-[10px] text-[13px] font-semibold transition-colors border-b-2',
                      isActive
                        ? 'border-b-transparent bg-white text-[#15171d]'
                        : 'border-transparent text-[#9aa0ab] hover:text-[#5f636b]',
                    )}
                    style={isActive ? { boxShadow: '0 -1px 0 0 #ecedf1 inset' } : {}}
                  >
                    <span
                      className="w-[7px] h-[7px] rounded-full flex-none"
                      style={{ background: color }}
                    />
                    {p.label}
                    <span
                      className="text-[11px] font-bold px-[7px] py-[2px] rounded-[6px]"
                      style={
                        isActive
                          ? { background: color + '18', color: TYPE_TEXT_COLORS[p.type] }
                          : { background: '#f0f1f4', color: '#9aa0ab' }
                      }
                    >
                      {TYPE_LABELS_KO[p.type]}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col min-h-0">
          {rubricProblems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-12 h-12 rounded-[14px] bg-[#f0f1f4] flex items-center justify-center">
                <Sparkles size={22} className="text-[#9aa0ab]" />
              </div>
              <p className="text-[14px] text-[#71757e]">
                서술형 또는 손코딩 문제가 없어 루브릭 설정을 건너뜁니다
              </p>
              <p className="text-[12.5px] text-[#9aa0ab]">
                1단계에서 서술형·손코딩 문제를 추가하면 여기서 채점 기준을 설정할 수 있습니다
              </p>
            </div>
          ) : activeProblem ? (
            <RubricPanel problem={activeProblem} modelAnswer={activeModelAnswer} />
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex-none px-[30px] py-4 border-t border-[#f0f1f4] flex items-center justify-between bg-white">
          <button
            type="button"
            onClick={() => navigate(`/exam/${examId}/step/1`)}
            className="h-[44px] px-[18px] border border-[#e0e3e9] bg-white rounded-[11px] text-[14px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] transition-colors"
          >
            ← 이전
          </button>
          <button
            type="button"
            onClick={() => navigate(`/exam/${examId}/step/3`)}
            className="flex items-center gap-[6px] h-[44px] px-[20px] bg-accent text-white text-[14.5px] font-bold rounded-[11px] shadow-[0_4px_12px_rgba(79,70,229,.3)] hover:opacity-90 transition-opacity"
          >
            다음: 학생 정보 입력
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 5l7 7-7 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </main>
    </div>
  )
}
