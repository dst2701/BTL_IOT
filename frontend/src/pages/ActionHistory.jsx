import { useEffect, useMemo, useState } from 'react'
import { fetchActionHistory } from '../services/api'

const STATUS_CHIPS = [
  { value: 'all', label: 'All Status' },
  { value: 'success', label: 'Success' },
  { value: 'timeout', label: 'Timeout' },
  { value: 'pending', label: 'Pending' },
]

const ACTION_CHIPS = [
  { value: 'all', label: 'All Actions' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
]

const DEVICE_CHIPS = [
  { value: 'all', label: 'All Devices' },
  { value: 'LED_RED', label: 'Red Led' },
  { value: 'LED_YELLOW', label: 'Yellow Led' },
  { value: 'LED_GREEN', label: 'Green Led' },
]

function getDateTimeSearchValues(value) {
  const createdAt = new Date(value)
  const dateUS = createdAt.toLocaleDateString('en-US')
  const dateISO = [
    createdAt.getFullYear(),
    String(createdAt.getMonth() + 1).padStart(2, '0'),
    String(createdAt.getDate()).padStart(2, '0'),
  ].join('-')
  const time24 = createdAt.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const time12 = createdAt.toLocaleTimeString('en-US', {
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

function ActionHistory() {
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [order, setOrder] = useState('desc')
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [deviceFilter, setDeviceFilter] = useState('all')
  const [timePeriod, setTimePeriod] = useState('')
  const [page, setPage] = useState(1)
  const [targetPage, setTargetPage] = useState('')
  const [pageSizeInput, setPageSizeInput] = useState('10')
  const pageSize = Math.min(100, Math.max(1, Number(pageSizeInput) || 10))

  useEffect(() => {
    const load = async () => {
      try {
        const params = { limit: 500, order }
        if (timePeriod) params.period = timePeriod
        const data = await fetchActionHistory(params)
        setRows(data)
      } catch (error) {
        console.error(error)
      }
    }
    load()
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
  }, [order, timePeriod])

  // Reset trang về 1 khi đổi filter
  useEffect(
    // eslint-disable-next-line react-hooks/set-state-in-effect
    () => setPage(1),
    [query, order, statusFilter, actionFilter, deviceFilter, timePeriod, pageSizeInput],
  )

  const filtered = useMemo(() => {
    let result = rows
    if (statusFilter !== 'all') {
      result = result.filter((item) => item.status === statusFilter)
    }
    if (actionFilter !== 'all') {
      result = result.filter((item) => item.action === actionFilter)
    }
    if (deviceFilter !== 'all') {
      result = result.filter((item) => item.device_type === deviceFilter)
    }
    const normalized = query.toLowerCase().trim()
    if (normalized) {
      result = result.filter(
        (item) =>
          (item.device_name && item.device_name.toLowerCase().includes(normalized)) ||
          (item.user_name && item.user_name.toLowerCase().includes(normalized)) ||
          getDateTimeSearchValues(item.created_at).some((value) =>
            value.includes(normalized),
          ),
      )
    }
    return result
  }, [rows, query, statusFilter, actionFilter, deviceFilter])

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

  // eslint-disable-next-line no-unused-vars
  const exportCSV = () => {
    const header = 'Device,User,Type,Action,Status,Time'
    const csvRows = filtered.map((item) =>
      [
        `"${item.device_name}"`,
        `"${item.user_name || 'admin'}"`,
        item.device_type,
        item.action,
        item.status,
        `"${new Date(item.created_at).toLocaleString()}"`,
      ].join(','),
    )
    const blob = new Blob([[header, ...csvRows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `device_history_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <section className="history-page">
      <header className="page-title">
        <h1>Device History</h1>
        {/* <p>See history of all devices activities</p> */}
      </header>

      <div className="toolbar-row">
        <input
          className="search-input"
          placeholder="Search device, user, date or time..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="filter-control"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
        >
          <option value="desc">Latest</option>
          <option value="asc">Oldest</option>
        </select>
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
      </div>

      <div className="filter-panel">
        <div className="filter-controls-row">
          <label className="filter-select-control">
            Status:
            <select
              className="filter-control"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {STATUS_CHIPS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-select-control">
            Action:
            <select
              className="filter-control"
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
            >
              {ACTION_CHIPS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-select-control">
            Device:
            <select
              className="filter-control"
              value={deviceFilter}
              onChange={(event) => setDeviceFilter(event.target.value)}
            >
              {DEVICE_CHIPS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-select-control">
            Time:
            <select
              className="time-period"
              value={timePeriod}
              onChange={(event) => setTimePeriod(event.target.value)}
            >
              <option value="">AM/PM</option>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </label>
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
              <th>Device</th>
              <th>User</th>
              <th>Action</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((item) => (
              <tr key={item.id}>
                <td>{item.device_id}</td>
                <td>{item.device_name}</td>
                <td>
                  <span className="user-badge">{item.user_name || 'admin'}</span>
                </td>
                <td>{item.action === 'on' ? 'On' : 'Off'}</td>
                <td>
                  <span className={`status-badge status-${item.status}`}>
                    {item.status}
                  </span>
                </td>
                <td>{new Date(item.created_at).toLocaleString()}</td>
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
        <div className="go-to-page">
          <label htmlFor="history-go-to-page">Go to Page:</label>
          <input
            id="history-go-to-page"
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

    </section>
  )
}

export default ActionHistory
