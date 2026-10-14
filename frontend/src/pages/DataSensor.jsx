import { useEffect, useMemo, useState } from 'react'
import { fetchSensorHistory } from '../services/api'

const SENSOR_LABELS = {
  DHT11_Temp: 'Temperature Sensor',
  DHT11_Humid: 'Humidity Sensor',
  LDR_Light: 'Light Sensor',
}

const SENSOR_UNITS = {
  DHT11_Temp: '°C',
  DHT11_Humid: '%',
  LDR_Light: 'ADC',
}

const SENSOR_FILTERS = [
  { value: 'all', label: 'All Sensors' },
  { value: 'DHT11_Temp', label: 'Temperature' },
  { value: 'DHT11_Humid', label: 'Humidity' },
  { value: 'LDR_Light', label: 'Light' },
  { value: 'time', label: 'Time' },
]

function getDateTimeSearchValues(value) {
  const measuredAt = new Date(value)
  const dateUS = measuredAt.toLocaleDateString('en-US')
  const dateISO = [
    measuredAt.getFullYear(),
    String(measuredAt.getMonth() + 1).padStart(2, '0'),
    String(measuredAt.getDate()).padStart(2, '0'),
  ].join('-')
  const time24 = measuredAt.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const time12 = measuredAt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
  const time12Short = time12.replace(/^0/, '')

  return [
    dateUS,
    dateISO,
    time24,
    time24.replace(/^0/, ''),
    time12,
    time12Short,
    `${dateUS}, ${time24}`,
    `${dateUS}, ${time24.replace(/^0/, '')}`,
    `${dateUS}, ${time12}`,
    `${dateUS}, ${time12Short}`,
  ].map((item) => item.toLowerCase())
}

function DataSensor() {
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [order, setOrder] = useState('desc')
  const [sensorFilter, setSensorFilter] = useState('all')
  const [appliedSearch, setAppliedSearch] = useState({ query: '', by: 'all' })
  const [page, setPage] = useState(1)
  const [targetPage, setTargetPage] = useState('')
  const [pageSizeInput, setPageSizeInput] = useState('10')
  const pageSize = Math.min(100, Math.max(1, Number(pageSizeInput) || 10))

  useEffect(() => {
    const load = async () => {
      try {
        const params = { limit: 500, order }
        const data = await fetchSensorHistory(params)
        setRows(data)
      } catch (error) {
        console.error(error)
      }
    }
    load()
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
  }, [order])

  // Reset trang về 1 khi đổi filter
  useEffect(
    // eslint-disable-next-line react-hooks/set-state-in-effect
    () => setPage(1),
    [appliedSearch, order, pageSizeInput],
  )

  const filtered = useMemo(() => {
    const normalized = appliedSearch.query.toLowerCase().trim()
    if (!normalized) return rows
    const searchBy = appliedSearch.by
    let result = rows
    if (searchBy !== 'all' && searchBy !== 'time') {
      result = result.filter((item) => item.sensor_type === searchBy)
    }
    if (normalized) {
      result = result.filter((item) => {
        const sensorName = item.sensor_name?.toLowerCase() || ''
        const uiSensorName = SENSOR_LABELS[item.sensor_type]?.toLowerCase() || ''
        const timeValues = getDateTimeSearchValues(item.measured_at)
        if (searchBy === 'time') return timeValues.some((value) => value.includes(normalized))
        const valueMatches = [String(item.value), Number(item.value).toFixed(1)]
          .some((value) => value.toLowerCase().includes(normalized))
        if (searchBy !== 'all') return valueMatches
        return sensorName.includes(normalized) || uiSensorName.includes(normalized) || valueMatches
      })
    }
    return result
  }, [rows, appliedSearch])

  const getSensorLabel = (item) =>
    SENSOR_LABELS[item.sensor_type] || item.sensor_name || 'Sensor'

  const getSensorUnit = (item) => SENSOR_UNITS[item.sensor_type] || ''

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const visiblePages = () => {
    const delta = 2
    const start = Math.max(1, page - delta)
    const end = Math.min(totalPages, page + delta)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  const goToPage = () => {
    const requestedPage = Number(targetPage)
    if (!Number.isInteger(requestedPage) || requestedPage < 1) return

    setPage(Math.min(requestedPage, totalPages))
    setTargetPage('')
  }

  const exportCSV = () => {
    const header = 'Sensor,Type,Value,Time'
    const csvRows = filtered.map((item) =>
      [
        `"${getSensorLabel(item)}"`,
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

  return (
    <section className="data-page">
      <header className="page-title history-title">
        <h1>Sensor Data</h1>
        {/* <p>All sensor readings history</p> */}
      </header>

      <div className="filter-panel">
        <div className="filter-controls-row">
          <input className="search-input" aria-label="Search records"
            placeholder={sensorFilter === 'time' ? 'Search date or time...' : sensorFilter === 'all' ? 'Search name or value...' : 'Search value...'} value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                setAppliedSearch({ query, by: sensorFilter })
                setPage(1)
              }
            }} />
          <label className="filter-select-control">
            Search by:
            <select
              className="filter-control"
              value={sensorFilter}
              onChange={(event) => setSensorFilter(event.target.value)}
            >
              {SENSOR_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>
        <select
          className="filter-control order-select" aria-label="Sort by time"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
        >
          <option value="desc">Latest</option>
          <option value="asc">Oldest</option>
        </select>
        </div>
      </div>

      <div className="cta-row table-summary">
        <span className="table-info">
          Page {page}: showing {paginated.length} results (of {filtered.length})
        </span>
      </div>

      <div className="panel table-panel">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Sensor</th>
              <th>Value</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((item) => (
              <tr key={item.id}>
                <td>{item.sensor_id}</td>
                <td>{getSensorLabel(item)}</td>
                <td>
                  {Number(item.value).toFixed(1)} {getSensorUnit(item)}
                </td>
                <td>{new Date(item.measured_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <label className="page-size-control">
          Rows:
          <input
            type="number"
            min="1"
            max="100"
            value={pageSizeInput}
            onChange={(event) => setPageSizeInput(event.target.value)}
          />
        </label>
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
        <div className="go-to-page">
          <label htmlFor="sensor-go-to-page">Go to Page:</label>
          <input
            id="sensor-go-to-page"
            type="number"
            min="1"
            max={totalPages}
            value={targetPage}
            onChange={(event) => setTargetPage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') goToPage()
            }}
          />
          <button type="button" className="page-btn" onClick={goToPage}>
            Go
          </button>
        </div>
      </div>

      </div>
      <div className="table-export-row">
        <button type="button" className="btn-export" onClick={exportCSV}>
          Export CSV
        </button>
      </div>
    </section>
  )
}

export default DataSensor
