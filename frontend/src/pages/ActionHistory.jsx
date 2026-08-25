import { useEffect, useMemo, useState } from 'react'
import { FaFilter } from 'react-icons/fa'
import { fetchActionHistory } from '../services/api'

const PAGE_SIZE = 20

const STATUS_CHIPS = [
  { value: 'all', label: 'All Status' },
  { value: 'success', label: '✅ Success' },
  { value: 'timeout', label: '⏱ Timeout' },
  { value: 'pending', label: '⏳ Pending' },
]

const ACTION_CHIPS = [
  { value: 'all', label: 'All Actions' },
  { value: 'on', label: '💡 On' },
  { value: 'off', label: '⬛ Off' },
]

const DEVICE_CHIPS = [
  { value: 'all', label: 'All Devices' },
  { value: 'LED_RED', label: '🔴 Red Led' },
  { value: 'LED_YELLOW', label: '🟡 Yellow Led' },
  { value: 'LED_GREEN', label: '🟢 Green Led' },
]

function ActionHistory() {
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [order, setOrder] = useState('desc')
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [deviceFilter, setDeviceFilter] = useState('all')
  const [showFilter, setShowFilter] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    const load = async () => {
      try {
        const params = { limit: 500, order }
        if (dateFilter) params.date = dateFilter
        const data = await fetchActionHistory(params)
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
  useEffect(
    () => setPage(1),
    [query, dateFilter, order, statusFilter, actionFilter, deviceFilter],
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
          (item.user_name && item.user_name.toLowerCase().includes(normalized)),
      )
    }
    return result
  }, [rows, query, statusFilter, actionFilter, deviceFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const visiblePages = () => {
    const delta = 2
    const start = Math.max(1, page - delta)
    const end = Math.min(totalPages, page + delta)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

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
    <section>
      <header className="page-title">
        <h1>Device History</h1>
        <p>See history of all devices activities</p>
      </header>

      <div className="toolbar-row">
        <input
          className="search-input"
          placeholder="Search device name, user..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          className={`filter-box${showFilter ? ' filter-box-active' : ''}`}
          title="Filter by status / action / device"
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
          <option value="desc">Latest</option>
          <option value="asc">Oldest</option>
        </select>
      </div>

      {showFilter && (
        <div className="filter-panel">
          <div className="filter-panel-row">
            <span className="filter-panel-label">Status:</span>
            <div className="filter-chip-group">
              {STATUS_CHIPS.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  className={`filter-chip${statusFilter === chip.value ? ' filter-chip-active' : ''}`}
                  onClick={() => setStatusFilter(chip.value)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-panel-row">
            <span className="filter-panel-label">Action:</span>
            <div className="filter-chip-group">
              {ACTION_CHIPS.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  className={`filter-chip${actionFilter === chip.value ? ' filter-chip-active' : ''}`}
                  onClick={() => setActionFilter(chip.value)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-panel-row">
            <span className="filter-panel-label">Device:</span>
            <div className="filter-chip-group">
              {DEVICE_CHIPS.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  className={`filter-chip${deviceFilter === chip.value ? ' filter-chip-active' : ''}`}
                  onClick={() => setDeviceFilter(chip.value)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="panel table-panel">
        <table>
          <thead>
            <tr>
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

export default ActionHistory
