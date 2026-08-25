import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FaRegLightbulb, FaTemperatureHigh } from 'react-icons/fa'
import { IoWaterOutline } from 'react-icons/io5'
import SensorChart from '../components/SensorChart'
import { useToast } from '../context/ToastContext'
import {
  controlDevices,
  fetchActionHistory,
  fetchDeviceStatus,
  fetchLatestSensors,
  fetchSensorHistory,
  fetchSystemStatus,
} from '../services/api'

const LED_LABELS = {
  led1: 'Red Led',
  led2: 'Yellow Led',
  led3: 'Green Led',
}

const CHART_OPTIONS = [
  { key: 'temp',     label: 'Temperature', unit: 'degC', color: '#ff6b6b' },
  { key: 'humidity', label: 'Humidity',    unit: '%',    color: '#4ecdc4' },
  { key: 'light',    label: 'Light',       unit: 'ADC',  color: '#ffd93d' },
]

function Dashboard() {
  const showToast = useToast()

  const [latest, setLatest] = useState({ temp: null, humidity: null, light: null })
  const [ledState, setLedState] = useState({ led1: false, led2: false, led3: false })
  const [tempSeries, setTempSeries] = useState([])
  const [humiditySeries, setHumiditySeries] = useState([])
  const [lightSeries, setLightSeries] = useState([])
  const [systemStatus, setSystemStatus] = useState({ mqtt_connected: true, demo_mode: false })
  const [selectedChart, setSelectedChart] = useState('temp')

  // Tránh show duplicate sensor warning
  const sensorWarningRef = useRef(false)
  // Set theo dõi các LED đang chờ check timeout (tránh duplicate toast)
  const pendingToastRef = useRef(new Set())

  // ── Data fetching ────────────────────────────────────────────
  useEffect(() => {
    const toSeries = (data) =>
      [...data].reverse().map((item) => ({
        value: Number(item.value),
        time: new Date(item.measured_at).getHours().toString().padStart(2, '0'),
      }))

    const load = async () => {
      try {
        const [latestData, tempHistory, humidityHistory, lightHistory] = await Promise.all([
          fetchLatestSensors(),
          fetchSensorHistory({ sensor_id: 1, limit: 7 }),
          fetchSensorHistory({ sensor_id: 2, limit: 7 }),
          fetchSensorHistory({ sensor_id: 3, limit: 7 }),
        ])

        setLatest(latestData)
        setTempSeries(toSeries(tempHistory))
        setHumiditySeries(toSeries(humidityHistory))
        setLightSeries(toSeries(lightHistory))

        // Phát hiện hardware offline: measured_at cũ hơn 30 giây
        if (latestData.measured_at && !sensorWarningRef.current) {
          const ageSeconds = (Date.now() - new Date(latestData.measured_at).getTime()) / 1000
          if (ageSeconds > 30) {
            sensorWarningRef.current = true
            showToast('Sensor hardware not detected — showing last recorded data', 'warning')
          }
        }
        // Reset khi có dữ liệu mới (hardware reconnect)
        if (latestData.measured_at) {
          const ageSeconds = (Date.now() - new Date(latestData.measured_at).getTime()) / 1000
          if (ageSeconds <= 30) sensorWarningRef.current = false
        }
      } catch (error) {
        console.error(error)
      }
    }

    const loadStatus = async () => {
      try {
        const status = await fetchSystemStatus()
        setSystemStatus(status)
        // Fallback: nếu MQTT không kết nối được broker
        if (!status.mqtt_connected && !sensorWarningRef.current) {
          sensorWarningRef.current = true
          showToast('Sensor hardware not detected — showing last recorded data', 'warning')
        }
        if (status.mqtt_connected) sensorWarningRef.current = false
      } catch (error) {
        console.error(error)
      }
    }

    const loadDeviceStatus = async () => {
      try {
        const status = await fetchDeviceStatus()
        setLedState((prev) => ({ ...prev, ...status }))
      } catch (error) {
        console.error(error)
      }
    }

    load()
    loadStatus()
    loadDeviceStatus()
    const timer = setInterval(load, 5000)
    const statusTimer = setInterval(loadStatus, 7000)
    return () => {
      clearInterval(timer)
      clearInterval(statusTimer)
    }
  }, [showToast])

  // ── Sensor cards ─────────────────────────────────────────────
  const cards = useMemo(
    () => [
      {
        title: 'Temperature Sensor',
        value: latest.temp != null ? `${Number(latest.temp).toFixed(1)} degC` : '--',
        className: 'stat-red',
        icon: <FaTemperatureHigh />,
      },
      {
        title: 'Humidity Sensor',
        value: latest.humidity != null ? `${Number(latest.humidity).toFixed(1)}%` : '--',
        className: 'stat-green',
        icon: <IoWaterOutline />,
      },
      {
        title: 'Light Sensor',
        value: latest.light != null ? `${Math.round(latest.light)} (ADC)` : '--',
        className: 'stat-yellow',
        icon: <FaRegLightbulb />,
      },
    ],
    [latest],
  )

  // ── LED toggle ───────────────────────────────────────────────
  const handleToggle = useCallback(async (key) => {
    if (!['led1', 'led2', 'led3'].includes(key)) {
      setLedState((prev) => ({ ...prev, [key]: !prev[key] }))
      return
    }

    const nextState = !ledState[key]
    setLedState((prev) => ({ ...prev, [key]: nextState }))

    try {
      await controlDevices({ [key]: nextState ? 'on' : 'off' })

      // Nếu LED này đang có check pending rồi thì bỏ qua (tránh duplicate)
      if (pendingToastRef.current.has(key)) return
      pendingToastRef.current.add(key)

      // Khớp với backend timeout 5s — check sau 5.5s
      setTimeout(async () => {
        pendingToastRef.current.delete(key)
        try {
          const history = await fetchActionHistory({ limit: 5 })
          const ledName = LED_LABELS[key]
          const timedOut = history.find((item) => {
            if (item.device_name !== ledName || item.status !== 'timeout') return false
            const ageSeconds = (Date.now() - new Date(item.created_at).getTime()) / 1000
            return ageSeconds < 7 // chỉ tính action vừa gửi (< 7 giây)
          })
          if (timedOut) {
            showToast(`${ledName} is not responding`, 'warning')
          }
        } catch (e) {
          // Bỏ qua lỗi khi check history
        }
      }, 5500)
    } catch (error) {
      pendingToastRef.current.delete(key)
      // Rollback UI khi API lỗi
      setLedState((prev) => ({ ...prev, [key]: !nextState }))
      showToast(`Failed to send command to ${LED_LABELS[key]}`, 'error')
      console.error(error)
    }
  }, [ledState, showToast])

  // ── Render ───────────────────────────────────────────────────
  const seriesMap = { temp: tempSeries, humidity: humiditySeries, light: lightSeries }
  const activeChart = CHART_OPTIONS.find((o) => o.key === selectedChart)

  return (
    <section>
      <header className="page-title">
        <h1>Home Dashboard</h1>
        <p>Real time Sensing Data and Devices Control</p>
      </header>

      {systemStatus.demo_mode && !systemStatus.mqtt_connected && (
        <div className="demo-banner">
          Demo mode đang bật: chưa thấy phần cứng MQTT, dữ liệu đang được mô phỏng.
        </div>
      )}

      <div className="stat-grid">
        {cards.map((card) => (
          <article key={card.title} className={`panel stat-card ${card.className}`}>
            <h3>
              <span className="sensor-icon">{card.icon}</span>
              {card.title}
            </h3>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>

      <div className="toggle-grid">
        {Object.entries(ledState).map(([key, value]) => (
          <article key={key} className="panel toggle-card">
            <span>{LED_LABELS[key] || key}</span>
            <button
              type="button"
              className={value ? 'switch switch-on' : 'switch'}
              onClick={() => handleToggle(key)}
            >
              <span className="switch-dot" />
            </button>
          </article>
        ))}
      </div>

      <div className="panel chart-panel">
        <div className="chart-header">
          <select
            className="chart-select"
            value={selectedChart}
            onChange={(e) => setSelectedChart(e.target.value)}
          >
            {CHART_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <SensorChart
          values={seriesMap[selectedChart]}
          label={`${activeChart.label} (${activeChart.unit})`}
          title=""
          color={activeChart.color}
        />
      </div>
    </section>
  )
}

export default Dashboard
