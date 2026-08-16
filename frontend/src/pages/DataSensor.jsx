import { useEffect, useMemo, useState } from 'react'
import { FaFilter } from 'react-icons/fa'
import { fetchSensorHistory } from '../services/api'

function DataSensor() {
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [order, setOrder] = useState('desc')

  useEffect(() => {
    const load = async () => {
      try {
        const params = {
          limit: 200,
          order,
        }
        if (dateFilter) {
          params.date = dateFilter
        }

        const data = await fetchSensorHistory(params)
        setRows(data)
      } catch (error) {
        console.error(error)
      }
    }

    load()
  }, [dateFilter, order])

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim()
    if (!normalized) {
      return rows
    }

    return rows.filter((item) =>
      item.sensor_name.toLowerCase().includes(normalized),
    )
  }, [rows, query])

  return (
    <section>
      <header className="page-title">
        <h1>Sensor Data</h1>
      </header>

      <div className="toolbar-row">
        <input
          className="search-input"
          placeholder="Search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="filter-box" title="Filter">
          <FaFilter />
        </div>
        <input
          type="date"
          className="filter-control"
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
        />
        <select
          className="filter-control"
          value={order}
          onChange={(event) => setOrder(event.target.value)}
        >
          <option value="desc">Mới nhất</option>
          <option value="asc">Cũ nhất</option>
        </select>
      </div>

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
            {filtered.map((item) => (
              <tr key={item.id}>
                <td>{item.sensor_name}</td>
                <td>{Number(item.value).toFixed(1)}</td>
                <td>{new Date(item.measured_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cta-row">
        <button type="button" className="btn-export">
          Export Data
        </button>
      </div>
    </section>
  )
}

export default DataSensor
