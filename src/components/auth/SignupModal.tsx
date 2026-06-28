import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Check, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { authApi } from '@/api/auth'
import { cn } from '@/lib/utils'

const ROLE_OPTIONS = [
  { value: 'PROFESSOR', label: '교수' },
  { value: 'TEACHER', label: '선생님' },
  { value: 'TUTOR', label: '튜터' },
  { value: 'TA', label: 'TA' },
] as const

function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[0-9A-Z]/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: '약함', color: '#ef4444' }
  if (score === 2) return { score, label: '보통', color: '#16a86a' }
  return { score: 3, label: '강함', color: '#138a5a' }
}

const schema = z.object({
  name: z.string().min(2, '이름을 입력하세요'),
  email: z.string().email('올바른 이메일을 입력하세요'),
  affiliation: z.string().min(1, '소속을 입력하세요'),
  affiliationRole: z.enum(['PROFESSOR', 'TEACHER', 'TUTOR', 'TA'] as const),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
  agreeTerms: z.boolean().refine((v) => v, { message: '이용약관에 동의해야 합니다' }),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  onSwitchToLogin: () => void
}

export default function SignupModal({ open, onClose, onSwitchToLogin }: Props) {
  const [showPw, setShowPw] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { affiliationRole: 'PROFESSOR', agreeTerms: false },
  })

  const pw = watch('password', '')
  const agreeTerms = watch('agreeTerms', false)
  const strength = getStrength(pw)

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.signup({
        name: data.name,
        email: data.email,
        affiliation: data.affiliation,
        affiliation_role: data.affiliationRole,
        password: data.password,
      })
      if (!res.data) throw new Error(res.error?.message ?? '회원가입에 실패했습니다.')
      toast.success('회원가입이 완료됐습니다! 로그인해 주세요.')
      onClose()
      onSwitchToLogin()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '회원가입 중 오류가 발생했습니다.')
    }
  }

  if (!open) return null

  const inputCls = (hasError: boolean) =>
    cn(
      'w-full h-[46px] border-[1.5px] rounded-[11px] bg-[#fbfbfc] px-[14px] text-[14.5px] text-[#15171d]',
      'outline-none focus:border-accent transition-colors placeholder:text-[#aab0ba]',
      hasError ? 'border-red-400' : 'border-[#e0e3e9]',
    )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-[400px] bg-white rounded-2xl shadow-[0_4px_18px_rgba(20,24,40,.08)] px-9 py-[34px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[23px] font-extrabold text-[#15171d] tracking-[-0.02em]">회원가입</h2>
        <p className="text-sm text-[#71757e] mt-1 mb-2">채점 보조 계정을 만드세요</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* 이름 */}
          <label className="block text-[13px] font-semibold text-[#3a3e46] mb-[7px] mt-4">이름</label>
          <input
            type="text"
            placeholder="홍길동"
            autoComplete="name"
            {...register('name')}
            className={inputCls(!!errors.name)}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}

          {/* 이메일 */}
          <label className="block text-[13px] font-semibold text-[#3a3e46] mb-[7px] mt-4">이메일</label>
          <input
            type="email"
            placeholder="hong@school.ac.kr"
            autoComplete="email"
            {...register('email')}
            className={inputCls(!!errors.email)}
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}

          {/* 소속 + 역할 */}
          <div className="flex gap-[11px]">
            <div className="flex-[1.4] min-w-0">
              <label className="block text-[13px] font-semibold text-[#3a3e46] mb-[7px] mt-4">소속</label>
              <input
                type="text"
                placeholder="○○대학교"
                {...register('affiliation')}
                className={inputCls(!!errors.affiliation)}
              />
              {errors.affiliation && <p className="text-xs text-red-500 mt-1">{errors.affiliation.message}</p>}
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[13px] font-semibold text-[#3a3e46] mb-[7px] mt-4">역할</label>
              <div className="relative">
                <select
                  {...register('affiliationRole')}
                  className={cn(inputCls(false), 'appearance-none pr-8 cursor-pointer')}
                >
                  {ROLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa0ab] pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* 비밀번호 */}
          <label className="block text-[13px] font-semibold text-[#3a3e46] mb-[7px] mt-4">비밀번호</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="new-password"
              {...register('password')}
              className={cn(inputCls(!!errors.password), 'pr-11')}
            />
            <button
              type="button"
              onClick={() => setShowPw((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aab0ba] hover:text-[#71757e] transition-colors"
            >
              {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}

          {/* 비밀번호 강도 */}
          {pw && (
            <div className="flex items-center gap-[6px] mt-[9px]">
              {[1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="flex-1 h-[5px] rounded-[3px] transition-colors"
                  style={{ background: i <= strength.score ? strength.color : '#eef0f3' }}
                />
              ))}
              <span className="text-[12px] font-bold ml-1" style={{ color: strength.color }}>
                {strength.label}
              </span>
            </div>
          )}

          {/* 약관 동의 */}
          <label className="flex items-start gap-2 mt-5 cursor-pointer">
            <input type="checkbox" {...register('agreeTerms')} className="sr-only" />
            <span
              className={cn(
                'w-[18px] h-[18px] rounded-[5px] flex items-center justify-center flex-none mt-[1px] transition-colors',
                agreeTerms ? 'bg-accent' : 'border-[1.5px] border-[#cdd1d8]',
              )}
            >
              {agreeTerms && <Check size={11} strokeWidth={3} className="text-white" />}
            </span>
            <span className="text-[13px] text-[#4b4f57] leading-[1.5]">
              <span className="text-accent font-semibold">이용약관</span> 및{' '}
              <span className="text-accent font-semibold">개인정보 처리방침</span>에 동의합니다
            </span>
          </label>
          {errors.agreeTerms && <p className="text-xs text-red-500 mt-1">{errors.agreeTerms.message}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[48px] rounded-[12px] bg-accent text-white text-[15px] font-bold shadow-[0_4px_14px_rgba(79,70,229,.3)] disabled:opacity-60 mt-5"
          >
            {isSubmitting ? '가입 중...' : '가입하기'}
          </button>
        </form>

        <p className="text-center mt-[18px] text-sm text-[#9aa0ab]">
          이미 계정이 있으신가요?{' '}
          <button
            type="button"
            className="text-accent font-bold"
            onClick={() => { onClose(); onSwitchToLogin() }}
          >
            로그인
          </button>
        </p>
      </div>
    </div>
  )
}
