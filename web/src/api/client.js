import axios from "axios"

const LAN_URL   = import.meta.env.VITE_LAN_URL   || "http://192.168.1.10:8000"
const CLOUD_URL = import.meta.env.VITE_CLOUD_URL || "https://your-cloud-url.com"

const api = axios.create({ baseURL: LAN_URL, timeout: 5000 })

// Auto-fallback to cloud if LAN unreachable
api.interceptors.response.use(res => res, async err => {
    if (!err.response && !err.config._retried) {
        err.config._retried = true
        err.config.baseURL  = CLOUD_URL
        return api(err.config)
    }
    return Promise.reject(err)
})

// Attach JWT
api.interceptors.request.use(cfg => {
    const token = localStorage.getItem("cv_token")
    if (token) cfg.headers.Authorization = `Bearer ${token}`
    return cfg
})

export default api
