import { useEffect, useMemo, useState } from 'react'
import { FaRegLightbulb, FaTemperatureHigh } from 'react-icons/fa'
import { IoWaterOutline } from 'react-icons/io5'
import SensorChart from '../components/SensorChart'
import {
  controlDevices,
  fetchLatestSensors,
  fetchSensorHistory,
  fetchSystemStatus,
} from '../services/api'

function Dashboard() {
  const [latest, setLatest] = useState({ temp: null, humidity: null, light: null })
  const [ledState, setLedState] = useState({ led1: false, led2: false, led3: true })
  const [series, setSeries] = useState([])
  const [systemStatus, setSystemStatus] = useState({ mqtt_connected: true, demo_mode: false })

  useEffect(() => {
    const load = async () => {
      try {
        const [latestData, historyData] = await Promise.all([
          fetchLatestSensors(),
          fetchSensorHistory({ sensor_id: 1, limit: 7 }),
        ])

        setLatest(latestData)
        setSeries(
          [...historyData]
            .reverse()
            .map((item) => ({
              value: Number(item.value),
              time: new Date(item.measured_at).getHours().toString().padStart(2, '0'),
            })),
        )
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

    load()
    loadStatus()
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
    if (!['led1', 'led2'].includes(key)) {
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
            <span>{key}</span>
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

      <SensorChart values={series} label="Temperature (degC)" />
    </section>
  )
}

export default Dashboard
