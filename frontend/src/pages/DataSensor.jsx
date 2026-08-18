import { useEffect, useMemo, useState } from 'react'
import { FaFilter } from 'react-icons/fa'
import { fetchSensorHistory } from '../services/api'

const PAGE_SIZE = 20

function DataSensor() {
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [order, setOrder] = useState('desc')
  const [sensorFilter, setSensorFilter] = useState('all')
  const [showFilter, setShowFilter] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    const load = async () => {
      try {
        const params = { limit: 500, order }
        if (dateFilter) params.date = dateFilter
        const data = await fetchSensorHistory(params)
        setRows(data)
      } catch (error) {
        console.error(error)
      }
    }
    load()
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
  }, [dateFilter, order])

  // Reset trang về 1 khi đổi filter
  useEffect(() => setPage(1), [query, dateFilter, order, sensorFilter])

  const filtered = useMemo(() => {
    let result = rows
    if (sensorFilter !== 'all') {
      result = result.filter((item) => item.sensor_type === sensorFilter)
    }
    const normalized = query.toLowerCase().trim()
    if (normalized) {
      result = result.filter((item) =>
        item.sensor_name.toLowerCase().includes(normalized),
      )
    }
    return result
  }, [rows, query, sensorFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const visiblePages = () => {
    const delta = 2
    const start = Math.max(1, page - delta)
    const end = Math.min(totalPages, page + delta)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  const exportCSV = () => {
    const header = 'Sensor,Type,Value,Time'
    const csvRows = filtered.map((item) =>
      [
        `"${item.sensor_name}"`,
        item.sensor_type,
        Number(item.value).toFixed(1),
        `"${new Date(item.measured_at).toLocaleString()}"`,
      ].join(','),
    )
    const blob = new Blob([[header, ...csvRows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sensor_data_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const SENSOR_CHIPS = [
    { value: 'all', label: 'All' },
    { value: 'DHT11_Temp', label: '🌡 Temperature' },
    { value: 'DHT11_Humid', label: '💧 Humidity' },
    { value: 'LDR_Light', label: '☀️ Light' },
  ]

  return (
    <section>
      <header className="page-title">
        <h1>Sensor Data</h1>
        <p>All sensor readings history</p>
      </header>

      <div className="toolbar-row">
        <input
          className="search-input"
          placeholder="Search sensor name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          className={`filter-box${showFilter ? ' filter-box-active' : ''}`}
          title="Filter by sensor type"
          onClick={() => setShowFilter((s) => !s)}
        >
          <FaFilter />
        </button>
        <input
          type="date"
          className="filter-control"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
        <select
          className="filter-control"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
        >
          <option value="desc">Mới nhất</option>
          <option value="asc">Cũ nhất</option>
        </select>
      </div>

      {showFilter && (
        <div className="filter-panel">
          <span className="filter-panel-label">Sensor:</span>
          <div className="filter-chip-group">
            {SENSOR_CHIPS.map((chip) => (
              <button
                key={chip.value}
                type="button"
                className={`filter-chip${sensorFilter === chip.value ? ' filter-chip-active' : ''}`}
                onClick={() => setSensorFilter(chip.value)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="panel table-panel">
        <table>
          <thead>
            <tr>
              <th>Sensor</th>
              <th>Value</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((item) => (
              <tr key={item.id}>
                <td>{item.sensor_name}</td>
                <td>{Number(item.value).toFixed(1)}</td>
                <td>{new Date(item.measured_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button
          type="button"
          className="page-btn"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          ← Prev
        </button>
        {page > 3 && (
          <>
            <button type="button" className="page-btn" onClick={() => setPage(1)}>1</button>
            {page > 4 && <span className="page-ellipsis">…</span>}
          </>
        )}
        {visiblePages().map((n) => (
          <button
            key={n}
            type="button"
            className={`page-btn${page === n ? ' page-btn-active' : ''}`}
            onClick={() => setPage(n)}
          >
            {n}
          </button>
        ))}
        {page < totalPages - 2 && (
          <>
            {page < totalPages - 3 && <span className="page-ellipsis">…</span>}
            <button type="button" className="page-btn" onClick={() => setPage(totalPages)}>{totalPages}</button>
          </>
        )}
        <button
          type="button"
          className="page-btn"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          Next →
        </button>
      </div>

      <div className="cta-row">
        <span className="table-info">{filtered.length} records · Page {page}/{totalPages}</span>
        <button type="button" className="btn-export" onClick={exportCSV}>
          Export CSV
        </button>
      </div>
    </section>
  )
}

export default DataSensor
