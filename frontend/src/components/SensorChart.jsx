import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
)

function SensorChart({ values, label, title = 'Sensor', color = '#6b7eff' }) {
  const labels = values.map((item) => item.time)
  const dataset = values.map((item) => item.value)

  const data = {
    labels,
    datasets: [
      {
        label,
        data: dataset,
        borderColor: color,
        backgroundColor: color,
        pointRadius: 3,
        pointHoverRadius: 4,
        tension: 0.35,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        align: 'start',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 6,
          color: '#232730',
        },
      },
    },
    scales: {
      y: {
        grid: { color: '#edf1f7' },
        ticks: { color: '#5e6777' },
      },
      x: {
        grid: { color: '#f5f7fb' },
        ticks: { color: '#5e6777' },
      },
    },
  }

  return (
    <div className="panel chart-panel">
      <h3>{title}</h3>
      <div className="chart-wrap">
        <Line data={data} options={options} />
      </div>
    </div>
  )
}

export default SensorChart
