import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url ?? ''
    const isAuthRequest = url.includes('/auth/login') || url.includes('/auth/signup')
    if (err.response?.status === 401 && !isAuthRequest) {
      useAuthStore.getState().clearAuth()
      window.location.href = '/'
    }
    return Promise.reject(err)
  },
)
