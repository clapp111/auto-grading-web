import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft, LogOut, ChevronDown, Check, Camera, Upload, RotateCcw, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/api/auth'
import { cn } from '@/lib/utils'
import AvatarCropModal from './AvatarCropModal'

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const binary = atob(base64)
  const arr = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

const ROLE_OPTIONS = [
  { value: 'PROFESSOR', label: '교수' },
  { value: 'TEACHER', label: '선생님' },
  { value: 'TUTOR', label: '튜터' },
  { value: 'TA', label: 'TA' },
] as const

type Tab = 'profile' | 'password' | 'plan'

// pending photo: null = no change, { type:'upload', dataUrl } = new photo, { type:'reset' } = cleared
type PendingPhoto =
  | { type: 'upload'; dataUrl: string }
  | { type: 'reset' }
  | null

const profileSchema = z.object({
  affiliation: z.string().min(1, '소속을 입력하세요'),
  affiliationRole: z.enum(['PROFESSOR', 'TEACHER', 'TUTOR', 'TA'] as const),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력하세요'),
    newPassword: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
    confirmPassword: z.string().min(1, '비밀번호 확인을 입력하세요'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: '새 비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  })

type PasswordForm = z.infer<typeof passwordSchema>

type ProfileForm = z.infer<typeof profileSchema>

export default function AccountPage() {
  const [tab, setTab] = useState<Tab>('profile')
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto>(null)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const storeMember = useAuthStore((s) => s.member)
  const token = useAuthStore((s) => s.token)
  const setAuth = useAuthStore((s) => s.setAuth)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const popoverBtnRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const { data: member } = useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.me().then((r) => r.data),
    initialData: storeMember ?? undefined,
  })

  // Close popover on outside click
  useEffect(() => {
    if (!popoverOpen) return
    const handler = (e: MouseEvent) => {
      if (
        !popoverRef.current?.contains(e.target as Node) &&
        !popoverBtnRef.current?.contains(e.target as Node)
      ) {
        setPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [popoverOpen])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      affiliation: member?.affiliation ?? '',
      affiliationRole: member?.affiliation_role ?? 'PROFESSOR',
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      let profileUrl: string | null | undefined = undefined

      if (pendingPhoto?.type === 'upload') {
        const blob = dataUrlToBlob(pendingPhoto.dataUrl)
        const presignedRes = await authApi.uploadProfilePresigned({
          file_name: 'profile.jpg',
          content_type: 'image/jpeg',
        })
        if (!presignedRes.data) throw new Error('업로드 URL을 가져오지 못했습니다.')
        const { upload_url, file_key } = presignedRes.data
        console.log('[profile upload] PUT', upload_url)
        const s3Res = await fetch(upload_url, {
          method: 'PUT',
          body: blob,
          headers: { 'Content-Type': 'image/jpeg' },
        })
        console.log('[profile upload] S3 status', s3Res.status)
        if (!s3Res.ok) {
          const text = await s3Res.text().catch(() => '')
          throw new Error(`S3 업로드 실패 (${s3Res.status})${text ? `: ${text}` : ''}`)
        }
        profileUrl = file_key
      } else if (pendingPhoto?.type === 'reset') {
        profileUrl = null
      }

      return authApi.updateProfile({
        affiliation: data.affiliation,
        affiliation_role: data.affiliationRole,
        ...(profileUrl !== undefined && { profile_url: profileUrl }),
      })
    },
    onSuccess: (res) => {
      if (res.data && token) {
        setAuth(token, res.data)
        queryClient.setQueryData(['me'], res.data)
        toast.success('변경사항이 저장되었습니다.')
        reset({ affiliation: res.data.affiliation ?? '', affiliationRole: res.data.affiliation_role })
        setPendingPhoto(null)
      }
    },
    onError: () => toast.error('저장 중 오류가 발생했습니다.'),
  })

  const {
    register: regPw,
    handleSubmit: handlePwSubmit,
    reset: resetPw,
    watch: watchPw,
    formState: { errors: pwErrors, isSubmitting: pwSubmitting },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  const newPwValue = watchPw('newPassword', '')

  const pwStrength = (() => {
    const v = newPwValue
    let score = 0
    if (v.length >= 8) score++
    if (/[A-Z]/.test(v) || /[^a-zA-Z0-9]/.test(v)) score++
    if (v.length >= 12) score++
    if (score === 0) return null
    if (score === 1) return { label: '약함', color: '#ef4444', width: '33%' }
    if (score === 2) return { label: '보통', color: '#f59e0b', width: '66%' }
    return { label: '강함', color: '#16a86a', width: '100%' }
  })()

  const pwMutation = useMutation({
    mutationFn: (data: PasswordForm) =>
      authApi.updatePassword({
        current_password: data.currentPassword,
        new_password: data.newPassword,
      }),
    onSuccess: () => {
      toast.success('비밀번호가 변경되었습니다.')
      resetPw()
    },
    onError: () => toast.error('비밀번호 변경에 실패했습니다. 현재 비밀번호를 확인하세요.'),
  })

  const handleLogout = () => {
    clearAuth()
    navigate('/')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setCropFile(file)
    e.target.value = ''
  }

  const initial = member?.name?.[0]?.toUpperCase() ?? '?'

  // Resolved avatar source: pending photo → member profile_url → null (gradient)
  const avatarSrc =
    pendingPhoto?.type === 'upload'
      ? pendingPhoto.dataUrl
      : pendingPhoto?.type === 'reset'
      ? null
      : member?.profile_url ?? null

  const hasPhoto = !!avatarSrc
  const photoChanged = pendingPhoto !== null
  const canSave = isDirty || photoChanged

  const navCls = (t: Tab) =>
    cn(
      'flex items-center w-full px-[13px] py-[10px] rounded-[9px] text-[14.5px] text-left transition-colors',
      tab === t
        ? 'bg-accent/[.07] text-accent font-bold'
        : 'text-[#71757e] font-medium hover:bg-[#f7f8fa]',
    )

  const inputCls = (hasError?: boolean) =>
    cn(
      'w-full h-[46px] border-[1.5px] rounded-[11px] bg-[#fbfbfc] px-[14px] text-[14.5px] text-[#15171d]',
      'outline-none focus:border-accent transition-colors',
      hasError ? 'border-red-400' : 'border-[#e0e3e9]',
    )

  const AvatarDisplay = ({ size, fontSize }: { size: number; fontSize: number }) =>
    avatarSrc ? (
      <img
        src={avatarSrc}
        alt="profile"
        style={{ width: size, height: size }}
        className="rounded-full object-cover flex-none"
      />
    ) : (
      <div
        style={{ width: size, height: size, fontSize }}
        className="rounded-full bg-gradient-to-br from-accent to-[#7c83f0] flex items-center justify-center text-white font-bold flex-none"
      >
        {initial}
      </div>
    )

  return (
    <>
      <div className="h-screen flex flex-col bg-white overflow-hidden">
        {/* ── Top bar ── */}
        <div className="h-[60px] flex-none border-b border-[#ecedf1] flex items-center px-[26px] gap-[14px]">
          <button
            className="flex items-center gap-[6px] text-[14px] text-[#9aa0ab] font-medium hover:text-[#71757e] transition-colors"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft size={16} strokeWidth={1.9} />
            뒤로 가기
          </button>
          <span className="text-[18px] font-extrabold text-[#15171d] tracking-[-0.02em] ml-[6px]">
            계정 설정
          </span>
          <div className="ml-auto">
            <AvatarDisplay size={34} fontSize={14} />
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-[210px] flex-none border-r border-[#f0f1f4] p-[20px_14px] flex flex-col gap-[3px]">
            <button className={navCls('profile')} onClick={() => setTab('profile')}>프로필</button>
            <button className={navCls('password')} onClick={() => setTab('password')}>비밀번호</button>
            <button className={navCls('plan')} onClick={() => setTab('plan')}>요금제 / 사용량</button>

            <button
              className="mt-auto flex items-center gap-[9px] px-[13px] py-[10px] rounded-[9px] text-[14.5px] text-[#c0392b] font-semibold hover:bg-red-50 transition-colors"
              onClick={handleLogout}
            >
              <LogOut size={16} />
              로그아웃
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-[30px_36px] overflow-y-auto min-w-0">
            {tab === 'profile' && (
              <div className="max-w-[560px]">
                {/* 아바타 행 */}
                <div className="flex items-center gap-[18px] mb-[30px]">
                  <AvatarDisplay size={74} fontSize={26} />
                  <div>
                    <p className="text-[20px] font-extrabold text-[#15171d] tracking-[-0.02em]">
                      {member?.name ?? member?.email ?? ''}
                    </p>
                    <p className="text-[14px] text-[#9aa0ab] mt-[2px]">
                      {member?.affiliation ?? ''}
                    </p>
                  </div>

                  {/* 사진 변경 버튼 + 팝오버 */}
                  <div className="relative ml-auto">
                    <button
                      ref={popoverBtnRef}
                      type="button"
                      className="h-[38px] px-4 border border-[#e0e3e9] bg-white rounded-[10px] text-[13.5px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] transition-colors flex items-center gap-[6px]"
                      onClick={() => setPopoverOpen(p => !p)}
                    >
                      <Camera size={14} />
                      사진 변경
                    </button>

                    {popoverOpen && (
                      <div
                        ref={popoverRef}
                        className="absolute right-0 top-[calc(100%+6px)] bg-white border border-[#e0e3e9] rounded-[12px] shadow-lg py-[6px] w-[168px] z-20"
                      >
                        <button
                          type="button"
                          className="w-full px-4 py-[10px] text-left text-[13.5px] text-[#3a3e46] hover:bg-[#f7f8fa] flex items-center gap-[9px]"
                          onClick={() => {
                            setPopoverOpen(false)
                            fileInputRef.current?.click()
                          }}
                        >
                          <Upload size={14} className="text-[#9aa0ab] flex-none" />
                          파일에서 업로드
                        </button>
                        {hasPhoto && (
                          <button
                            type="button"
                            className="w-full px-4 py-[10px] text-left text-[13.5px] text-[#c0392b] hover:bg-red-50 flex items-center gap-[9px]"
                            onClick={() => {
                              setPopoverOpen(false)
                              setPendingPhoto({ type: 'reset' })
                            }}
                          >
                            <RotateCcw size={14} className="flex-none" />
                            기본 이미지로 변경
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 숨긴 파일 입력 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* 폼 */}
                <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
                  {/* 소속 + 역할 */}
                  <div className="flex gap-[14px]">
                    <div className="flex-[1.4] min-w-0">
                      <label className="block text-[13px] font-semibold text-[#3a3e46] mb-[7px] mt-4">소속</label>
                      <input
                        type="text"
                        {...register('affiliation')}
                        className={inputCls(!!errors.affiliation)}
                      />
                      {errors.affiliation && (
                        <p className="text-xs text-red-500 mt-1">{errors.affiliation.message}</p>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-[13px] font-semibold text-[#3a3e46] mb-[7px] mt-4">역할</label>
                      <div className="relative">
                        <select
                          {...register('affiliationRole')}
                          className={cn(inputCls(), 'appearance-none pr-8 cursor-pointer')}
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

                  {/* 이메일 (읽기 전용) */}
                  <label className="block text-[13px] font-semibold text-[#3a3e46] mb-[7px] mt-4">이메일</label>
                  <div className="h-[46px] border-[1.5px] border-[#eef0f3] rounded-[11px] bg-[#f4f5f7] px-[14px] flex items-center justify-between text-[14.5px] text-[#9aa0ab]">
                    <span>{member?.email}</span>
                    <span className="flex items-center gap-[5px] text-[12.5px] text-[#138a5a] font-bold">
                      <Check size={14} strokeWidth={2.2} />
                      인증됨
                    </span>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex justify-end gap-[10px] mt-[30px] pt-[20px] border-t border-[#f0f1f4]">
                    <button
                      type="button"
                      onClick={() => { reset(); setPendingPhoto(null) }}
                      className="h-[44px] px-[18px] border border-[#e0e3e9] bg-white rounded-[11px] text-[14px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] transition-colors"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={!canSave || mutation.isPending}
                      className="h-[44px] px-5 bg-accent text-white rounded-[11px] text-[14px] font-bold shadow-[0_4px_12px_rgba(79,70,229,.25)] disabled:opacity-50 transition-opacity"
                    >
                      {mutation.isPending ? '저장 중...' : '변경사항 저장'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {tab === 'password' && (
              <div className="max-w-[480px]">
                <p className="text-[18px] font-extrabold text-[#15171d] tracking-[-0.02em] mb-[28px]">비밀번호 변경</p>
                <form onSubmit={handlePwSubmit((d) => pwMutation.mutate(d))} noValidate>
                  {/* 현재 비밀번호 */}
                  <label className="block text-[13px] font-semibold text-[#3a3e46] mb-[7px]">현재 비밀번호</label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      placeholder="현재 비밀번호 입력"
                      autoComplete="current-password"
                      {...regPw('currentPassword')}
                      className={cn(inputCls(!!pwErrors.currentPassword), 'pr-11')}
                    />
                    <button type="button" onClick={() => setShowCurrent(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aab0ba] hover:text-[#71757e] transition-colors">
                      {showCurrent ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {pwErrors.currentPassword && <p className="text-xs text-red-500 mt-1">{pwErrors.currentPassword.message}</p>}

                  {/* 새 비밀번호 */}
                  <label className="block text-[13px] font-semibold text-[#3a3e46] mb-[7px] mt-4">새 비밀번호</label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      placeholder="새 비밀번호 입력 (8자 이상)"
                      autoComplete="new-password"
                      {...regPw('newPassword')}
                      className={cn(inputCls(!!pwErrors.newPassword), 'pr-11')}
                    />
                    <button type="button" onClick={() => setShowNew(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aab0ba] hover:text-[#71757e] transition-colors">
                      {showNew ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {pwErrors.newPassword && <p className="text-xs text-red-500 mt-1">{pwErrors.newPassword.message}</p>}
                  {pwStrength && (
                    <div className="mt-2">
                      <div className="h-[4px] rounded-full bg-[#eef0f3] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: pwStrength.width, backgroundColor: pwStrength.color }}
                        />
                      </div>
                      <p className="text-[11.5px] font-semibold mt-1" style={{ color: pwStrength.color }}>
                        {pwStrength.label}
                      </p>
                    </div>
                  )}

                  {/* 새 비밀번호 확인 */}
                  <label className="block text-[13px] font-semibold text-[#3a3e46] mb-[7px] mt-4">새 비밀번호 확인</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="새 비밀번호 재입력"
                      autoComplete="new-password"
                      {...regPw('confirmPassword')}
                      className={cn(inputCls(!!pwErrors.confirmPassword), 'pr-11')}
                    />
                    <button type="button" onClick={() => setShowConfirm(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aab0ba] hover:text-[#71757e] transition-colors">
                      {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {pwErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{pwErrors.confirmPassword.message}</p>}

                  <div className="flex justify-end gap-[10px] mt-[30px] pt-[20px] border-t border-[#f0f1f4]">
                    <button
                      type="button"
                      onClick={() => resetPw()}
                      className="h-[44px] px-[18px] border border-[#e0e3e9] bg-white rounded-[11px] text-[14px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] transition-colors"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={pwSubmitting || pwMutation.isPending}
                      className="h-[44px] px-5 bg-accent text-white rounded-[11px] text-[14px] font-bold shadow-[0_4px_12px_rgba(79,70,229,.25)] disabled:opacity-50 transition-opacity"
                    >
                      {pwMutation.isPending ? '변경 중...' : '비밀번호 변경'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {tab === 'plan' && (
              <div className="flex items-center justify-center h-48 text-[14px] text-[#9aa0ab]">
                준비 중입니다.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 크롭 모달 */}
      {cropFile && (
        <AvatarCropModal
          file={cropFile}
          onApply={(dataUrl) => {
            setPendingPhoto({ type: 'upload', dataUrl })
            setCropFile(null)
          }}
          onCancel={() => setCropFile(null)}
        />
      )}
    </>
  )
}
