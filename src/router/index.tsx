import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

// Lazy-loaded pages (코드 스플리팅)
import { lazy, Suspense, type ReactNode } from 'react'

const LandingPage    = lazy(() => import('@/pages/home/LandingPage'))
const DashboardPage  = lazy(() => import('@/pages/dashboard/DashboardPage'))
const Step1Page      = lazy(() => import('@/pages/exam/step1/Step1Page'))
const Step2Page      = lazy(() => import('@/pages/exam/step2/Step2Page'))
const Step3Page      = lazy(() => import('@/pages/exam/step3/Step3Page'))
const Step4Page      = lazy(() => import('@/pages/exam/step4/Step4Page'))
const Step5Page      = lazy(() => import('@/pages/exam/step5/Step5Page'))
const Step6Page      = lazy(() => import('@/pages/exam/step6/Step6Page'))
const Step7Page      = lazy(() => import('@/pages/exam/step7/Step7Page'))

function PrivateRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/" replace />
}

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-content-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  )
}

function Wrap({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  { path: '/', element: <Wrap><LandingPage /></Wrap> },
  {
    path: '/dashboard',
    element: <PrivateRoute><Wrap><DashboardPage /></Wrap></PrivateRoute>,
  },
  {
    path: '/exam/:examId/step/1',
    element: <PrivateRoute><Wrap><Step1Page /></Wrap></PrivateRoute>,
  },
  {
    path: '/exam/:examId/step/2',
    element: <PrivateRoute><Wrap><Step2Page /></Wrap></PrivateRoute>,
  },
  {
    path: '/exam/:examId/step/3',
    element: <PrivateRoute><Wrap><Step3Page /></Wrap></PrivateRoute>,
  },
  {
    path: '/exam/:examId/step/4',
    element: <PrivateRoute><Wrap><Step4Page /></Wrap></PrivateRoute>,
  },
  {
    path: '/exam/:examId/step/5',
    element: <PrivateRoute><Wrap><Step5Page /></Wrap></PrivateRoute>,
  },
  {
    path: '/exam/:examId/step/6',
    element: <PrivateRoute><Wrap><Step6Page /></Wrap></PrivateRoute>,
  },
  {
    path: '/exam/:examId/step/7',
    element: <PrivateRoute><Wrap><Step7Page /></Wrap></PrivateRoute>,
  },
])
