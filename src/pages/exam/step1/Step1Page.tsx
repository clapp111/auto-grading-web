import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ExamSidebar } from '@/components/common/ExamSidebar'
import { SubStep1 } from '@/features/exam/step1/components/SubStep1'
import { SubStep2 } from '@/features/exam/step1/components/SubStep2'
import { SubStep3 } from '@/features/exam/step1/components/SubStep3'
import { examsApi } from '@/api/exams'

type SubStep = 0 | 1 | 2

export default function Step1Page() {
  const { examId: examIdStr } = useParams<{ examId: string }>()
  const examId = Number(examIdStr)
  const navigate = useNavigate()
  const [currentSub, setCurrentSub] = useState<SubStep>(0)

  const { data: examRes } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => examsApi.get(examId),
    enabled: !!examId,
  })
  const examName = examRes?.data?.name
  const problemSheetUrl = examRes?.data?.problem_sheet_url ?? null
  const modelAnswerUrl = examRes?.data?.model_answer_url ?? null

  const goNext = () => {
    if (currentSub < 2) {
      setCurrentSub((s) => (s + 1) as SubStep)
    } else {
      navigate(`/exam/${examId}/step/2`)
    }
  }

  const goBack = () => {
    if (currentSub > 0) setCurrentSub((s) => (s - 1) as SubStep)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* 사이드바 */}
      <aside className="w-[252px] shrink-0">
        <ExamSidebar
          examId={examId}
          examName={examName}
          currentStep={1}
          currentSub={currentSub}
        />
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {currentSub === 0 && (
          <SubStep1
            examId={examId}
            initialSheetUrl={problemSheetUrl}
            onNext={goNext}
            onSkip={goNext}
          />
        )}
        {currentSub === 1 && (
          <SubStep2
            examId={examId}
            initialModelAnswerUrl={modelAnswerUrl}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {currentSub === 2 && (
          <SubStep3
            examId={examId}
            onNext={goNext}
            onBack={goBack}
            onGoToOcr={() => setCurrentSub(1)}
          />
        )}
      </main>
    </div>
  )
}
