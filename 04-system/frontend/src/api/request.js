import axios from 'axios'

// 生产环境使用完整 API 地址，开发环境使用代理
const baseURL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL + '/api'
  : '/api'

const request = axios.create({
  baseURL,
  timeout: 15000
})

request.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

request.interceptors.response.use(
  res => res.data,
  err => {
    const url = err.config?.url || ''
    const isAuthRequest = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/forgot-password') || url.includes('/auth/reset-password')
    if (err.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    const msg = err.response?.data?.message || err.message
    const fallback = err.code === 'ERR_NETWORK' || !err.response
      ? '无法连接服务器，请确认后端已启动（npm run dev）'
      : '请求失败'
    return Promise.reject(new Error(msg || fallback))
  }
)

export default request
