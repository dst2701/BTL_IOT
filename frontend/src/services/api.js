import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
  timeout: 10000,
})

export async function fetchLatestSensors() {
  const { data } = await api.get('/api/sensors/latest')
  return data
}

export async function fetchSensorHistory(params = {}) {
  const { data } = await api.get('/api/sensors/history', { params })
  return data
}

export async function controlDevices(payload) {
  const { data } = await api.post('/api/devices/control', payload)
  return data
}

export async function fetchActionHistory(params = {}) {
  const { data } = await api.get('/api/actions/history', { params })
  return data
}

export async function fetchSystemStatus() {
  const { data } = await api.get('/api/system/status')
  return data
}

export async function fetchDeviceStatus() {
  const { data } = await api.get('/api/devices/status')
  return data
}

export default api
