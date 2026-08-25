import { useEffect, useMemo, useState } from 'react'
import { FaRegLightbulb, FaTemperatureHigh } from 'react-icons/fa'
import { IoWaterOutline } from 'react-icons/io5'
import SensorChart from '../components/SensorChart'
import {
  controlDevices,
  fetchDeviceStatus,
  fetchLatestSensors,
  fetchSensorHistory,
  fetchSystemStatus,
} from '../services/api'

// Tên hiển thị trên UI cho từng LED key
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
  const [latest, setLatest] = useState({ temp: null, humidity: null, light: null })
  const [ledState, setLedState] = useState({ led1: false, led2: false, led3: false })
  const [tempSeries, setTempSeries] = useState([])
  const [humiditySeries, setHumiditySeries] = useState([])
  const [lightSeries, setLightSeries] = useState([])
  const [systemStatus, setSystemStatus] = useState({ mqtt_connected: true, demo_mode: false })
  const [selectedChart, setSelectedChart] = useState('temp')

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
      } catch (error) {
        console.error(error)
      }
    }

    const loadStatus = async () => {
      try {
        const status = await fetchSystemStatus()
        setSystemStatus(status)
      } catch (error) {
        console.error(error)
      }
    }

    const loadDeviceStatus = async () => {
      try {
        const status = await fetchDeviceStatus()
        // Merge với default false cho các key chưa có lịch sử
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
  }, [])

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
        value:
          latest.humidity != null ? `${Number(latest.humidity).toFixed(1)}%` : '--',
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

  const handleToggle = async (key) => {
    if (!['led1', 'led2', 'led3'].includes(key)) {
      setLedState((prev) => ({ ...prev, [key]: !prev[key] }))
      return
    }

    const nextState = !ledState[key]
    setLedState((prev) => ({ ...prev, [key]: nextState }))

    try {
      await controlDevices({ [key]: nextState ? 'on' : 'off' })
    } catch (error) {
      setLedState((prev) => ({ ...prev, [key]: !nextState }))
      console.error(error)
    }
  }

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

      {(() => {
        const seriesMap = {
          temp: tempSeries,
          humidity: humiditySeries,
          light: lightSeries,
        }
        const opt = CHART_OPTIONS.find((o) => o.key === selectedChart)
        return (
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
              label={`${opt.label} (${opt.unit})`}
              title=""
              color={opt.color}
            />
          </div>
        )
      })()}
    </section>
  )
}

export default Dashboard
