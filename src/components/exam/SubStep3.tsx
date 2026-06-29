import { useState, useEffect } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { Check, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { useProblems } from '../../hooks/exam/useProblems'
import { useModelAnswerOcr } from '../../hooks/exam/useModelAnswerOcr'
import { TYPE_COLORS, TYPE_TEXT_COLORS, TYPE_LABELS_KO } from '../../types/constants'
import { problemsApi } from '@/api/problems'
import type { ModelAnswerResponse, ProblemResponse } from '@/types/dto'
import { cn } from '@/lib/utils'

// ── 공통 카드 헤더 ────────────────────────────────────────────────────

function CardHeader({
  problem,
  hint,
  right,
}: {
  problem: ProblemResponse
  hint?: string
  right?: React.ReactNode
}) {
  const color = TYPE_COLORS[problem.type]
  const textColor = TYPE_TEXT_COLORS[problem.type]
  return (
    <div className="flex items-center gap-[9px] mb-[15px]">
      <span className="w-[9px] h-[9px] rounded-full flex-none" style={{ background: color }} />
      <span className="text-[15.5px] font-bold text-[#15171d]">{problem.label}</span>
      <span
        className="text-[12px] font-bold px-[10px] py-[3px] rounded-[20px]"
        style={{ color: textColor, background: color + '15' }}
      >
        {TYPE_LABELS_KO[problem.type]}
      </span>
      {hint && <span className="text-[13px] text-[#9aa0ab]">{hint}</span>}
      {right && <div className="ml-auto flex-none">{right}</div>}
    </div>
  )
}

// ── 객관식 카드 ────────────────────────────────────────────────────────

function MultipleChoiceCard({
  examId,
  problem,
  answer,
}: {
  examId: number
  problem: ProblemResponse
  answer: ModelAnswerResponse | null
}) {
  const qc = useQueryClient()
  const [choiceCount, setChoiceCount] = useState(answer?.choice_count ?? 5)
  const [selected, setSelected] = useState<number | null>(answer?.correct_choice ?? null)

  useEffect(() => {
    setChoiceCount(answer?.choice_count ?? 5)
    setSelected(answer?.correct_choice ?? null)
  }, [answer?.choice_count, answer?.correct_choice])

  const mutation = useMutation({
    mutationFn: (body: { correct_choice?: number; choice_count?: number }) =>
      problemsApi.updateModelAnswer(problem.problem_id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['model-answers', examId] }),
    onError: () => toast.error('정답 저장에 실패했습니다.'),
  })

  const changeCount = (delta: number) => {
    const next = Math.max(2, Math.min(10, choiceCount + delta))
    setChoiceCount(next)
    mutation.mutate({ choice_count: next, correct_choice: selected ?? undefined })
  }

  const selectChoice = (n: number) => {
    setSelected(n)
    mutation.mutate({ correct_choice: n, choice_count: choiceCount })
  }

  return (
    <div className="border border-[#ebedf1] rounded-[13px] p-[18px_20px]">
      <CardHeader
        problem={problem}
        hint="정답 번호를 선택하세요"
        right={
          <div className="flex items-center gap-[8px]">
            <button
              type="button"
              onClick={() => changeCount(-1)}
              disabled={choiceCount <= 2}
              className="w-[30px] h-[30px] border border-[#e0e3e9] bg-white rounded-[8px] text-[#5f636b] text-[18px] font-semibold leading-none disabled:opacity-30 hover:bg-[#f7f8fa] transition-colors"
            >
              −
            </button>
            <span className="text-[13px] text-[#71757e] font-semibold whitespace-nowrap">
              보기 {choiceCount}개
            </span>
            <button
              type="button"
              onClick={() => changeCount(1)}
              disabled={choiceCount >= 10}
              className="w-[30px] h-[30px] border border-accent bg-accent/10 rounded-[8px] text-accent text-[18px] font-bold leading-none disabled:opacity-30 hover:bg-accent/20 transition-colors"
            >
              +
            </button>
          </div>
        }
      />
      <div className="flex gap-[11px] flex-wrap">
        {Array.from({ length: choiceCount }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            type="button"
            onClick={() => selectChoice(n)}
            className={cn(
              'w-[48px] h-[48px] rounded-[12px] text-[17px] font-semibold transition-all',
              selected === n
                ? 'border-[2px] border-[#7c5cfc] bg-[#7c5cfc14] text-[#7c5cfc] font-extrabold shadow-[0_2px_8px_#7c5cfc33]'
                : 'border-[1.5px] border-[#e2e4e9] text-[#aab0ba] hover:border-[#c2c6cd]',
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── 단답형 카드 ────────────────────────────────────────────────────────

function ShortAnswerCard({
  examId,
  problem,
  answer,
}: {
  examId: number
  problem: ProblemResponse
  answer: ModelAnswerResponse | null
}) {
  const qc = useQueryClient()
  const [chips, setChips] = useState<string[]>(answer?.accepted_answers ?? [])
  const [adding, setAdding] = useState(false)
  const [inputVal, setInputVal] = useState('')

  useEffect(() => { setChips(answer?.accepted_answers ?? []) }, [answer?.accepted_answers])

  const mutation = useMutation({
    mutationFn: (accepted_answers: string[]) =>
      problemsApi.updateModelAnswer(problem.problem_id, { accepted_answers }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['model-answers', examId] }),
    onError: () => toast.error('정답 저장에 실패했습니다.'),
  })

  const addChip = () => {
    const val = inputVal.trim()
    setInputVal('')
    setAdding(false)
    if (!val || chips.includes(val)) return
    const next = [...chips, val]
    setChips(next)
    mutation.mutate(next)
  }

  const removeChip = (idx: number) => {
    const next = chips.filter((_, i) => i !== idx)
    setChips(next)
    mutation.mutate(next)
  }

  return (
    <div className="border border-[#ebedf1] rounded-[13px] p-[18px_20px]">
      <CardHeader problem={problem} hint="허용 정답을 모두 추가하세요" />
      <div className="flex items-center gap-[9px] flex-wrap">
        {chips.map((chip, i) => (
          <span
            key={i}
            className="flex items-center h-[34px] px-[13px] border-[1.5px] border-[#0ea5e9] bg-[#0ea5e912] rounded-[9px] text-[13.5px] font-semibold text-[#0284c7]"
          >
            {chip}
            <button
              type="button"
              onClick={() => removeChip(i)}
              className="ml-[6px] text-[#0284c7] hover:text-[#0369a1] transition-colors"
            >
              <X size={13} />
            </button>
          </span>
        ))}

        {adding ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') addChip()
                if (e.key === 'Escape') { setAdding(false); setInputVal('') }
              }}
              className="h-[34px] px-[12px] border border-[#e2e4e9] rounded-[9px] text-[13.5px] outline-none focus:border-accent w-[140px] transition-colors"
              placeholder="정답 입력"
            />
            <button
              type="button"
              onClick={addChip}
              className="text-accent hover:text-accent/80 transition-colors"
            >
              <Check size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-[5px] h-[34px] px-[13px] border-[1.5px] border-dashed border-[#cdd1d8] rounded-[9px] text-[13.5px] text-[#8a8f99] font-semibold hover:border-accent hover:text-accent transition-colors"
          >
            <Plus size={14} />
            추가
          </button>
        )}
      </div>
    </div>
  )
}

// ── 서술형 / 손코딩 카드 ───────────────────────────────────────────────

function OcrTypeCard({
  problem,
  answer,
  onGoToOcr,
}: {
  problem: ProblemResponse
  answer: ModelAnswerResponse | null
  onGoToOcr: () => void
}) {
  const hasOcr = !!answer?.model_answer_text
  return (
    <div className="border border-[#ebedf1] rounded-[13px] p-[18px_20px]">
      <CardHeader
        problem={problem}
        right={
          hasOcr ? (
            <span className="flex items-center gap-[5px] text-[12.5px] text-[#16a86a] font-semibold">
              <Check size={14} />
              모범답안 OCR 완료
            </span>
          ) : undefined
        }
      />
      <div className="flex items-center justify-between bg-[#f7f8fa] border border-[#eef0f3] rounded-[10px] p-[12px_15px]">
        <span className="text-[13.5px] text-[#71757e]">
          모범답안은 이전 단계(모범답안 OCR)에서 추출·수정합니다
        </span>
        <button
          type="button"
          onClick={onGoToOcr}
          className="h-[36px] px-[14px] border border-[#e0e3e9] bg-white rounded-[9px] text-[13px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] transition-colors flex-none ml-3"
        >
          OCR 보기 / 수정
        </button>
      </div>
    </div>
  )
}

// ── SubStep3 ───────────────────────────────────────────────────────────

interface SubStep3Props {
  examId: number
  onNext: () => void
  onBack: () => void
  onGoToOcr: () => void
  isNextDisabled?: boolean
}

export function SubStep3({ examId, onNext, onBack, onGoToOcr, isNextDisabled }: SubStep3Props) {
  const { problems } = useProblems(examId)
  const { modelAnswers } = useModelAnswerOcr(examId)

  return (
    <>
      {/* Header */}
      <div className="px-[30px] py-[24px] pb-[20px] border-b border-[#f0f1f4] flex-none">
        <div className="flex items-center gap-[10px]">
          <h2 className="text-[22px] font-extrabold text-[#15171d] tracking-[-0.02em]">
            정답 입력
          </h2>
          <span className="text-[12px] font-bold text-accent bg-accent/[.08] px-[9px] py-[3px] rounded-[20px]">
            3 / 3
          </span>
        </div>
        <p className="text-[14px] text-[#71757e] mt-[5px]">
          문제 유형별로 정답을 등록합니다 · 객관식·단답형은 자동 채점에 사용됩니다
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-[30px] py-[24px] flex flex-col gap-[16px]">
        {problems.length === 0 ? (
          <p className="py-16 text-center text-[13px] text-[#9aa0ab]">
            1단계에서 문제를 먼저 추가하세요
          </p>
        ) : (
          problems.map(p => {
            const answer = modelAnswers.find(a => a.problem_id === p.problem_id) ?? null
            if (p.type === 'MULTIPLE_CHOICE') {
              return (
                <MultipleChoiceCard key={p.problem_id} examId={examId} problem={p} answer={answer} />
              )
            }
            if (p.type === 'SHORT_ANSWER') {
              return (
                <ShortAnswerCard key={p.problem_id} examId={examId} problem={p} answer={answer} />
              )
            }
            return (
              <OcrTypeCard key={p.problem_id} problem={p} answer={answer} onGoToOcr={onGoToOcr} />
            )
          })
        )}
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
          disabled={isNextDisabled}
          className="flex items-center gap-[6px] h-[44px] px-[20px] bg-accent text-white text-[14.5px] font-bold rounded-[11px] shadow-[0_4px_12px_rgba(79,70,229,.3)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          다음: 루브릭 설정
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 5l7 7-7 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </>
  )
}
