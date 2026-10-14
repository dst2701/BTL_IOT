import { Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend)

const formatTime = (value) => new Date(value).toLocaleTimeString('en-GB', { hour12: false })

function SensorChart({ series, title = 'Sensor readings' }) {
  const data = {
    datasets: series.map((sensor) => ({
      label: `${sensor.label} (${sensor.unit})`,
      data: sensor.values.map((item) => ({ x: item.time, y: item.value })),
      yAxisID: sensor.key,
      borderColor: sensor.color,
      backgroundColor: sensor.color,
      pointRadius: 3,
      pointHoverRadius: 5,
      tension: 0.35,
    })),
  }
  const axis = (title, color, position, drawOnChartArea = false) => ({
    type: 'linear', position,
    title: { display: true, text: title, color },
    ticks: { color },
    grid: { drawOnChartArea, color: '#edf1f7' },
  })
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'nearest', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
      tooltip: {
        callbacks: {
          title: (items) => items.length ? new Date(items[0].parsed.x).toLocaleString() : '',
          label: (context) => `${context.dataset.label}: ${context.parsed.y}`,
        },
      },
    },
    scales: {
      temp: axis('Temperature (degC)', '#ff6b6b', 'left', true),
      humidity: axis('Humidity (%)', '#4ecdc4', 'left'),
      light: axis('Light (ADC)', '#b58c00', 'right'),
      x: {
        type: 'linear',
        title: { display: true, text: 'Time' },
        ticks: { color: '#5e6777', maxTicksLimit: 6, callback: formatTime },
        grid: { color: '#f5f7fb' },
      },
    },
  }
  return (
    <div className="panel chart-panel combined-chart">
      <h3>{title}</h3>
      <div className="chart-wrap"><Line data={data} options={options} /></div>
    </div>
  )
}

export default SensorChart
