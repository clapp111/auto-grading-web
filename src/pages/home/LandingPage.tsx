import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  AlignLeft,
  ClipboardCheck,
  UserCheck,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/api/auth";
import LoginModal from "@/components/auth/LoginModal";
import SignupModal from "@/components/auth/SignupModal";

const FEATURES = [
  {
    bg: "#4F46E512",
    icon: <AlignLeft size={22} color="#4F46E5" />,
    title: "손글씨 OCR",
    desc: "서술형·손코딩 답안을 텍스트로 인식하고, 손코딩은 언어 문법으로 자동 보정합니다.",
  },
  {
    bg: "#14b8a612",
    icon: <ClipboardCheck size={22} color="#0d9488" />,
    title: "루브릭 추천",
    desc: "문제와 모범답안을 바탕으로 채점 기준과 배점을 AI가 제안합니다.",
  },
  {
    bg: "#f59e0b12",
    icon: <Sparkles size={22} color="#d68310" />,
    title: "자동 채점·코멘트",
    desc: "루브릭 기준으로 점수와 코멘트를 작성하고, 객관식·단답형은 즉시 채점합니다.",
  },
  {
    bg: "#0ea5e912",
    icon: <UserCheck size={22} color="#0284c7" />,
    title: "사람이 최종 확인",
    desc: "신뢰도가 낮은 부분만 짚어주어, 선생님은 확인하고 확정만 하면 됩니다.",
  },
];

const STEPS = [
  { n: 1, title: "문제지 세팅", desc: "문제 영역·유형·정답 등록" },
  { n: 2, title: "루브릭 설정", desc: "AI 추천 기준 검토" },
  { n: 3, title: "답안 업로드", desc: "학생 매칭·영역 지정" },
  { n: 4, title: "OCR 확인", desc: "인식 결과 검토·수정" },
  { n: 5, title: "채점·성적", desc: "확정 후 결과 내보내기" },
];

export default function LandingPage() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const member = useAuthStore((s) => s.member);
  const setAuth = useAuthStore((s) => s.setAuth);

  const { data: freshMember } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me().then((r) => r.data),
    enabled: !!token,
  });

  useEffect(() => {
    if (freshMember && token) setAuth(token, freshMember);
  }, [freshMember, token, setAuth]);

  const displayMember = freshMember ?? member;

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-10 h-[62px] bg-white border-b border-[#ecedf1] flex items-center px-[26px] gap-[22px]">
        {/* 로고 */}
        <div className="flex items-center gap-2 flex-none">
          <div className="w-8 h-8 rounded-[8px] bg-accent flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="text-[15px] font-extrabold text-[#15171d] tracking-tight">
            Grading
          </span>
        </div>

        {/* 네비 링크 */}
        <div className="flex items-center gap-[6px]">
          <span className="w-[74px] text-center text-[14.5px] text-[#1a1d24] font-semibold py-[7px] rounded-[8px] bg-[#f1f2f5]">
            홈
          </span>
          <button
            className="w-[74px] text-center text-[14.5px] text-[#71757e] font-medium py-[7px] rounded-[8px] hover:bg-[#f7f8fa] transition-colors"
            onClick={() =>
              token ? navigate("/dashboard") : setLoginOpen(true)
            }
          >
            내 시험
          </button>
        </div>

        <div className="ml-auto flex items-center gap-[10px]">
          {token ? (
            <>
              <button
                className="h-[44px] px-[18px] border border-[#e0e3e9] bg-white rounded-[11px] text-[#4b4f57] text-[14px] font-semibold hover:bg-[#f7f8fa] transition-colors"
                onClick={() => navigate("/dashboard")}
              >
                내 시험 바로가기
              </button>
              <button
                onClick={() => navigate("/account")}
                className="w-[34px] h-[34px] rounded-full overflow-hidden flex-none"
                title="계정 설정"
              >
                {displayMember?.profile_url ? (
                  <img
                    src={displayMember.profile_url}
                    alt="profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-accent to-[#7c83f0] flex items-center justify-center text-white font-bold text-[14px]">
                    {displayMember?.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
              </button>
            </>
          ) : (
            <button
              className="h-[44px] px-[18px] border border-[#e0e3e9] bg-white rounded-[11px] text-[#4b4f57] text-[14px] font-semibold hover:bg-[#f7f8fa] transition-colors"
              onClick={() => setLoginOpen(true)}
            >
              로그인
            </button>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="px-10 pt-[72px] pb-16 text-center bg-gradient-to-b from-[#f7f8ff] to-white">
        {/* 배지 */}
        <div className="inline-flex items-center gap-[7px] h-8 px-[14px] bg-accent/[.07] rounded-[20px] text-[13px] font-bold text-accent mb-6">
          <Sparkles size={13} />
          서술형·손코딩 채점에 특화된 AI 보조
        </div>

        <h1 className="text-[32px] font-extrabold text-black tracking-[-0.03em] leading-[1.2]">
          채점 시간, 지금 절반으로 줄여보세요
        </h1>
        <p className="text-[18px] text-[#5f636b] mt-[22px] leading-[1.65] max-w-[620px] mx-auto">
          손글씨 OCR부터 루브릭 추천, 자동 채점과 코멘트 작성까지.
          <br />
          반복 작업은 맡기고, 판단이 필요한 곳에만 집중하세요.
        </p>

        <div className="flex items-center justify-center gap-3 mt-[34px]">
          <button
            className="h-[52px] px-[26px] bg-accent text-white text-[16px] font-bold rounded-[13px] shadow-[0_6px_18px_rgba(79,70,229,.3)] hover:opacity-90 transition-opacity"
            onClick={() => setSignupOpen(true)}
          >
            무료로 시작하기
          </button>
        </div>

        {/* 제품 목업 */}
        <div className="mt-[54px] max-w-[880px] mx-auto bg-white border border-[#ebedf1] rounded-2xl shadow-[0_20px_50px_rgba(20,24,40,.14)] overflow-hidden">
          {/* 브라우저 크롬 */}
          <div className="h-[38px] flex items-center gap-[7px] px-4 bg-[#fafbfc] border-b border-[#eef0f3]">
            <span className="w-[11px] h-[11px] rounded-full bg-[#f0625c]" />
            <span className="w-[11px] h-[11px] rounded-full bg-[#f5bb42]" />
            <span className="w-[11px] h-[11px] rounded-full bg-[#5fc274]" />
          </div>
          {/* 목업 본문 */}
          <div className="flex h-[300px]">
            {/* 왼쪽: 답안지 미리보기 */}
            <div className="flex-1 bg-[#eceef2] flex items-start justify-center p-6">
              <div className="w-[200px] h-full bg-white rounded-[4px] shadow-[0_4px_14px_rgba(20,24,40,.12)] p-[18px]">
                <div className="relative border-2 border-[#16a86a] bg-[#16a86a]/[.07] rounded-[5px] h-[54px] mb-3" />
                <div className="relative border-2 border-dashed border-[#f59e0b] bg-[#f59e0b]/[.07] rounded-[5px] h-[120px]" />
              </div>
            </div>
            {/* 오른쪽: OCR 텍스트 + 점수 */}
            <div className="flex-1 p-6 flex flex-col gap-[11px]">
              <div className="h-[11px] rounded-[4px] bg-[#e7e9ed] w-[80%]" />
              <div className="h-[11px] rounded-[4px] bg-[#e7e9ed] w-[64%]" />
              <div className="h-[11px] rounded-[4px] bg-[#fde68a] w-[72%]" />
              <div className="h-[11px] rounded-[4px] bg-[#e7e9ed] w-[55%]" />
              <div className="mt-auto flex items-center justify-between pt-[14px] border-t border-[#f0f1f4]">
                <span className="text-[13px] text-[#9aa0ab] font-semibold">
                  점수
                </span>
                <span className="text-[20px] font-extrabold text-[#15171d]">
                  7 / 10
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-10 py-[72px]">
        <div className="text-center mb-11">
          <p className="text-[13px] font-bold text-accent tracking-[.08em] uppercase">
            Features
          </p>
          <h2 className="text-[32px] font-extrabold text-[#15171d] tracking-[-0.03em] mt-2">
            사람의 일을 덜어주는 4가지
          </h2>
        </div>
        <div className="grid grid-cols-4 gap-[18px] max-w-[1100px] mx-auto">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="border border-[#ebedf1] rounded-[14px] p-[24px_22px]"
            >
              <div
                className="w-[44px] h-[44px] rounded-[11px] flex items-center justify-center mb-4"
                style={{ background: f.bg }}
              >
                {f.icon}
              </div>
              <p className="text-[16.5px] font-bold text-[#15171d] mb-2">
                {f.title}
              </p>
              <p className="text-[13.5px] text-[#71757e] leading-[1.6]">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-10 py-[72px] bg-[#f7f8fa]">
        <div className="text-center mb-11">
          <p className="text-[13px] font-bold text-accent tracking-[.08em] uppercase">
            How it works
          </p>
          <h2 className="text-[32px] font-extrabold text-[#15171d] tracking-[-0.03em] mt-2">
            5단계로 끝나는 채점
          </h2>
        </div>
        <div className="flex items-start justify-center max-w-[980px] mx-auto">
          {STEPS.flatMap((s, i) => {
            const step = (
              <div
                key={s.n}
                className="flex flex-col items-center text-center flex-1"
              >
                <div className="w-[44px] h-[44px] rounded-full bg-accent text-white flex items-center justify-center text-[17px] font-extrabold">
                  {s.n}
                </div>
                <p className="text-[14.5px] font-bold text-[#15171d] mt-[14px]">
                  {s.title}
                </p>
                <p className="text-[12.5px] text-[#71757e] leading-[1.5] mt-[6px]">
                  {s.desc}
                </p>
              </div>
            );
            if (i < STEPS.length - 1) {
              return [
                step,
                <ChevronRight
                  key={`arrow-${i}`}
                  size={22}
                  className="text-[#cdd1d8] mt-[14px] flex-none"
                />,
              ];
            }
            return [step];
          })}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-10 py-[30px] border-t border-[#f0f1f4] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[7px] bg-accent flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="text-[14px] font-bold text-[#15171d]">Grading</span>
        </div>
        <div className="flex gap-[22px] text-[13px] text-[#9aa0ab] font-medium">
          <button className="hover:text-[#71757e] transition-colors">
            이용약관
          </button>
          <button className="hover:text-[#71757e] transition-colors">
            개인정보 처리방침
          </button>
          <button className="hover:text-[#71757e] transition-colors">
            문의
          </button>
        </div>
        <p className="text-[12.5px] text-[#aab0ba]">© 2026 Grading</p>
      </footer>

      {/* ── 모달 ── */}
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSwitchToSignup={() => {
          setLoginOpen(false);
          setSignupOpen(true);
        }}
      />
      <SignupModal
        open={signupOpen}
        onClose={() => setSignupOpen(false)}
        onSwitchToLogin={() => {
          setSignupOpen(false);
          setLoginOpen(true);
        }}
      />
    </div>
  );
}
