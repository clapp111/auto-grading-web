import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ExamSidebar } from '@/components/common/ExamSidebar'
import { SubStep1 } from '@/components/exam/SubStep1'
import { SubStep2 } from '@/components/exam/SubStep2'
import { SubStep3 } from '@/components/exam/SubStep3'
import { examsApi } from '@/api/exams'

export default function Step1Page() {
  const { examId: examIdStr, sub: subStr } = useParams<{ examId: string; sub: string }>()
  const examId = Number(examIdStr)
  const navigate = useNavigate()

  const urlSub = Number(subStr) || 1
  const currentSub = Math.min(Math.max(urlSub - 1, 0), 2)

  const { data: examRes } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => examsApi.get(examId),
    enabled: !!examId,
  })
  const examName = examRes?.data?.name
  const problemSheetUrl = examRes?.data?.problem_sheet_url ?? null
  const modelAnswerUrl = examRes?.data?.model_answer_url ?? null

  const goNext = () => {
    if (urlSub < 3) {
      navigate(`/exam/${examId}/step/1/${urlSub + 1}`)
    } else {
      navigate(`/exam/${examId}/step/2`)
    }
  }

  const goBack = () => {
    if (urlSub > 1) navigate(`/exam/${examId}/step/1/${urlSub - 1}`)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <aside className="w-[252px] shrink-0">
        <ExamSidebar
          examId={examId}
          examName={examName}
          currentStep={1}
          currentSub={currentSub}
        />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {urlSub === 1 && (
          <SubStep1
            examId={examId}
            initialSheetUrl={problemSheetUrl}
            onNext={goNext}
            onSkip={goNext}
          />
        )}
        {urlSub === 2 && (
          <SubStep2
            examId={examId}
            initialModelAnswerUrl={modelAnswerUrl}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {urlSub === 3 && (
          <SubStep3
            examId={examId}
            onNext={goNext}
            onBack={goBack}
            onGoToOcr={() => navigate(`/exam/${examId}/step/1/2`)}
          />
        )}
      </main>
    </div>
  )
}
