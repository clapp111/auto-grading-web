import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Check } from 'lucide-react'
import { isAxiosError } from 'axios'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

const schema = z.object({
  email: z.string().email('올바른 이메일을 입력하세요'),
  password: z.string().min(1, '비밀번호를 입력하세요'),
  keepLogin: z.boolean().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  onSwitchToSignup: () => void
}

export default function LoginModal({ open, onClose, onSwitchToSignup }: Props) {
  const [showPw, setShowPw] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const keepLogin = watch('keepLogin', false)

  const onSubmit = async (data: FormData) => {
    setLoginError(null)
    try {
      const res = await authApi.login({ email: data.email, password: data.password })
      if (!res.data) throw new Error(res.error?.message ?? '로그인에 실패했습니다.')
      setAuth(res.data.access_token, res.data.member)
      onClose()
      navigate('/')
    } catch (err) {
      const fallback = '이메일 또는 비밀번호가 올바르지 않습니다.'
      const apiMessage = isAxiosError(err) ? err.response?.data?.error?.message : undefined
      setLoginError(apiMessage ?? (err instanceof Error && !isAxiosError(err) ? err.message : fallback))
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-[400px] bg-white rounded-2xl shadow-[0_4px_18px_rgba(20,24,40,.08)] px-9 py-[34px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[23px] font-extrabold text-[#15171d] tracking-[-0.02em]">로그인</h2>
        <p className="text-sm text-[#71757e] mt-1 mb-6">채점을 이어서 진행하세요</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <label className="block text-[13px] font-semibold text-[#3a3e46] mb-[7px] mt-4">이메일</label>
          <input
            type="email"
            placeholder="hong@school.ac.kr"
            autoComplete="email"
            {...register('email')}
            className={cn(
              'w-full h-[46px] border-[1.5px] rounded-[11px] bg-[#fbfbfc] px-[14px] text-[14.5px] text-[#15171d]',
              'outline-none focus:border-accent transition-colors placeholder:text-[#aab0ba]',
              errors.email ? 'border-red-400' : 'border-[#e0e3e9]',
            )}
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}

          <label className="block text-[13px] font-semibold text-[#3a3e46] mb-[7px] mt-4">비밀번호</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('password')}
              className={cn(
                'w-full h-[46px] border-[1.5px] rounded-[11px] bg-[#fbfbfc] px-[14px] pr-11 text-[14.5px] text-[#15171d]',
                'outline-none focus:border-accent transition-colors placeholder:text-[#aab0ba]',
                errors.password ? 'border-red-400' : 'border-[#e0e3e9]',
              )}
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

          <div className="flex items-center justify-between mt-[14px] mb-[22px]">
            <label className="flex items-center gap-[7px] cursor-pointer">
              <input type="checkbox" {...register('keepLogin')} className="sr-only" />
              <span
                className={cn(
                  'w-[17px] h-[17px] rounded-[5px] border-[1.5px] flex items-center justify-center flex-none transition-colors',
                  keepLogin ? 'bg-accent border-accent' : 'border-[#cdd1d8]',
                )}
              >
                {keepLogin && <Check size={11} strokeWidth={3} className="text-white" />}
              </span>
              <span className="text-[13.5px] text-[#4b4f57] font-medium">로그인 유지</span>
            </label>
            <button type="button" className="text-[13.5px] text-accent font-semibold">
              비밀번호 찾기
            </button>
          </div>

          {loginError && (
            <p className="mb-3 text-[13px] text-red-500 text-center">
              {loginError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[48px] rounded-[12px] bg-accent text-white text-[15px] font-bold shadow-[0_4px_14px_rgba(79,70,229,.3)] disabled:opacity-60"
          >
            {isSubmitting ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5 text-[#aab0ba] text-[12.5px] font-medium">
          <span className="flex-1 h-px bg-[#eef0f3]" />
          또는
          <span className="flex-1 h-px bg-[#eef0f3]" />
        </div>

        <button className="w-full h-[46px] border border-[#e0e3e9] rounded-[11px] bg-white flex items-center justify-center gap-[9px] text-[14.5px] text-[#3a3e46] font-semibold hover:bg-[#f7f8fa] transition-colors">
          <div
            className="w-[18px] h-[18px] rounded-full flex-none"
            style={{ background: 'conic-gradient(#ea4335 0deg 90deg, #fbbc05 90deg 180deg, #34a853 180deg 270deg, #4285f4 270deg 360deg)' }}
          />
          Google로 계속하기
        </button>

        <p className="text-center mt-6 text-sm text-[#9aa0ab]">
          계정이 없으신가요?{' '}
          <button
            type="button"
            className="text-accent font-bold"
            onClick={() => { onClose(); onSwitchToSignup() }}
          >
            회원가입
          </button>
        </p>
      </div>
    </div>
  )
}
