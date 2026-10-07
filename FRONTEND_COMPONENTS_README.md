# Frontend Components README - BTL_IOT

Tài liệu này giải thích chi tiết 5 file frontend quan trọng của dự án:

1. `src/components/SensorChart.jsx`
2. `src/components/Sidebar.jsx`
3. `src/pages/Dashboard.jsx`
4. `src/pages/DataSensor.jsx`
5. `src/pages/ActionHistory.jsx`

Ngoài ra, tài liệu giải thích `src/services/api.js` vì đây là nơi trung gian để các page gọi backend.

---

## 1. Sơ đồ hoạt động tổng quát

```text
ESP8266
   ↓ MQTT
Backend FastAPI
   ↓ REST API
src/services/api.js
   ↓ import function
Dashboard / DataSensor / ActionHistory
   ↓ setState
React render HTML + component + table + chart
```

Frontend không trực tiếp kết nối MQTT. Frontend chỉ gọi REST API bằng Axios. Backend mới là thành phần giao tiếp với MQTT và MySQL.

---

# 2. `services/api.js` - Cầu nối tới backend

File: `frontend/src/services/api.js`

Các page không tự viết Axios trực tiếp. Chúng import các hàm từ file này.

## 2.1. Import Axios

```jsx
import axios from 'axios'
```

Import thư viện Axios để gửi HTTP request tới FastAPI.

Axios hỗ trợ các method thường dùng:

- `GET`: lấy dữ liệu.
- `POST`: gửi dữ liệu hoặc tạo thao tác mới.
- `PUT/PATCH`: cập nhật dữ liệu.
- `DELETE`: xóa dữ liệu.

Dự án này chủ yếu dùng `GET` và `POST`.

## 2.2. Tạo Axios instance

```jsx
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
  timeout: 10000,
})
```

### `baseURL`

Đây là địa chỉ gốc của backend.

Nếu frontend có file `.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

thì Axios dùng địa chỉ đó.

Nếu biến môi trường không tồn tại, nó dùng địa chỉ dự phòng:

```text
http://127.0.0.1:8000
```

### `timeout`

```jsx
timeout: 10000
```

Request tối đa chờ 10 giây. Nếu backend không trả lời trong thời gian đó, Axios phát sinh lỗi và code page sẽ chạy vào `catch`.

## 2.3. Lấy sensor mới nhất

```jsx
export async function fetchLatestSensors() {
  const { data } = await api.get('/api/sensors/latest')
  return data
}
```

Request thực tế:

```text
GET http://127.0.0.1:8000/api/sensors/latest
```

Dữ liệu dự kiến:

```json
{
  "temp": 28.5,
  "humidity": 65,
  "light": 720,
  "measured_at": "2026-08-19T14:30:00Z"
}
```

Nơi sử dụng: `Dashboard.jsx`.

## 2.4. Lấy lịch sử sensor

```jsx
export async function fetchSensorHistory(params = {}) {
  const { data } = await api.get('/api/sensors/history', { params })
  return data
}
```

`params` được Axios chuyển thành query string.

Ví dụ frontend gọi:

```jsx
fetchSensorHistory({
  sensor_id: 1,
  order: 'desc',
  limit: 7,
})
```

Request thực tế:

```text
GET /api/sensors/history?sensor_id=1&order=desc&limit=7
```

Các tham số dự án có thể dùng:

- `sensor_id`: ID loại sensor.
- `date`: ngày cần lọc.
- `hour`: giờ.
- `minute`: phút.
- `second`: giây.
- `period`: `AM` hoặc `PM`.
- `order`: `asc` hoặc `desc`.
- `limit`: số bản ghi tối đa.

Nơi sử dụng:

- `Dashboard.jsx`: lấy dữ liệu để vẽ biểu đồ.
- `DataSensor.jsx`: lấy lịch sử hiển thị trong bảng.

## 2.5. Điều khiển LED

```jsx
export async function controlDevices(payload) {
  const { data } = await api.post('/api/devices/control', payload)
  return data
}
```

Ví dụ gọi:

```jsx
await controlDevices({ led1: 'on' })
```

Request gửi tới backend:

```text
POST /api/devices/control
```

Body JSON:

```json
{
  "led1": "on"
}
```

Flow tiếp theo:

```text
Frontend POST
   ↓
FastAPI ghi action_history
   ↓
Backend publish MQTT
   ↓
ESP8266 nhận lệnh
   ↓
ESP bật/tắt LED
   ↓
ESP gửi device_response
```

Nơi sử dụng: `Dashboard.jsx`.

## 2.6. Lấy lịch sử điều khiển

```jsx
export async function fetchActionHistory(params = {}) {
  const { data } = await api.get('/api/actions/history', { params })
  return data
}
```

Request:

```text
GET /api/actions/history
```

Có thể gửi:

```jsx
fetchActionHistory({
  date: '2026-09-24',
  order: 'desc',
  limit: 500,
})
```

Nơi sử dụng:

- `ActionHistory.jsx`: hiển thị bảng.
- `Dashboard.jsx`: kiểm tra action mới có bị timeout không.

## 2.7. Lấy trạng thái MQTT/demo

```jsx
export async function fetchSystemStatus() {
  const { data } = await api.get('/api/system/status')
  return data
}
```

Kết quả ví dụ:

```json
{
  "mqtt_connected": true,
  "demo_mode": false
}
```

Nơi sử dụng: `Dashboard.jsx`.

## 2.8. Lấy trạng thái LED

```jsx
export async function fetchDeviceStatus() {
  const { data } = await api.get('/api/devices/status')
  return data
}
```

Kết quả ví dụ:

```json
{
  "led1": true,
  "led2": false,
  "led3": true
}
```

Nơi sử dụng: `Dashboard.jsx`, lúc page được mở hoặc reload.

---

# 3. `SensorChart.jsx` - Component biểu đồ

File: `frontend/src/components/SensorChart.jsx`

Component này có nhiệm vụ nhận dữ liệu từ Dashboard và vẽ line chart.

## 3.1. Import các thành phần Chart.js

```jsx
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
```

Các thành phần có ý nghĩa:

- `CategoryScale`: trục X dạng category, ví dụ các mốc thời gian.
- `LinearScale`: trục Y dạng số.
- `LineElement`: đường nối các điểm.
- `PointElement`: các điểm trên đường biểu đồ.
- `Tooltip`: thông tin khi hover.
- `Legend`: chú thích biểu đồ.
- `Chart as ChartJS`: đổi tên `Chart` thành `ChartJS` để đăng ký plugin.

## 3.2. Đăng ký Chart.js components

```jsx
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
)
```

Chart.js cần được đăng ký những thành phần muốn sử dụng. Nếu thiếu đăng ký, chart có thể không hiển thị đúng hoặc báo lỗi scale/plugin.

## 3.3. Props của component

```jsx
function SensorChart({
  values,
  label,
  title = 'Sensor',
  color = '#6b7eff',
}) {
```

Component nhận 4 props:

- `values`: mảng dữ liệu.
- `label`: tên dataset.
- `title`: tiêu đề chart, mặc định là `Sensor`.
- `color`: màu đường chart.

Ví dụ Dashboard truyền:

```jsx
<SensorChart
  values={seriesMap[selectedChart]}
  label={`${activeChart.label} (${activeChart.unit})`}
  title=""
  color={activeChart.color}
/>
```

## 3.4. Tách labels và values

```jsx
const labels = values.map((item) => item.time)
const dataset = values.map((item) => item.value)
```

Giả sử `values` là:

```js
[
  { time: '10', value: 27.5 },
  { time: '11', value: 28.2 },
]
```

thì:

```js
labels = ['10', '11']
dataset = [27.5, 28.2]
```

Chart.js cần hai loại dữ liệu này để biết:

- Điểm nằm ở thời gian nào.
- Điểm có giá trị bao nhiêu.

## 3.5. Cấu hình data

```jsx
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
```

Các thuộc tính quan trọng:

- `labels`: nhãn trục X.
- `data`: số liệu trục Y.
- `borderColor`: màu đường.
- `backgroundColor`: màu điểm/nền dataset.
- `pointRadius`: kích thước điểm bình thường.
- `pointHoverRadius`: kích thước điểm khi hover.
- `tension`: độ cong của đường.

Muốn đường thẳng hơn:

```jsx
tension: 0
```

Muốn đường cong hơn:

```jsx
tension: 0.5
```

## 3.6. Cấu hình options

```jsx
const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {...},
  scales: {...},
}
```

- `responsive: true`: chart co giãn theo container.
- `maintainAspectRatio: false`: cho phép CSS quyết định chiều cao chart.

CSS container:

```css
.chart-wrap {
  height: 190px;
}
```

## 3.7. Legend

```jsx
legend: {
  position: 'bottom',
  align: 'start',
  labels: {
    usePointStyle: true,
    pointStyle: 'circle',
    boxWidth: 6,
    color: '#232730',
  },
}
```

Cấu hình vị trí và kiểu chú thích bên dưới chart.

## 3.8. Trục chart

```jsx
scales: {
  y: {
    grid: { color: '#edf1f7' },
    ticks: { color: '#5e6777' },
  },
  x: {
    grid: { color: '#f5f7fb' },
    ticks: { color: '#5e6777' },
  },
}
```

- `grid.color`: màu lưới.
- `ticks.color`: màu số trên trục.

## 3.9. Render component

```jsx
return (
  <div className="panel chart-panel">
    <h3>{title}</h3>
    <div className="chart-wrap">
      <Line data={data} options={options} />
    </div>
  </div>
)
```

`Line` là component của `react-chartjs-2`.

## 3.10. Đoạn cốt lõi cần nhớ

```jsx
const labels = values.map((item) => item.time)
const dataset = values.map((item) => item.value)
```

và:

```jsx
<Line data={data} options={options} />
```

Đây là phần biến dữ liệu JavaScript thành biểu đồ.

---

# 4. `Sidebar.jsx` - Thanh điều hướng

File: `frontend/src/components/Sidebar.jsx`

## 4.1. Import routing và icon

```jsx
import { NavLink } from 'react-router-dom'
import { FiActivity, FiCpu, FiGrid, FiHome } from 'react-icons/fi'
```

- `NavLink`: tạo link và biết link nào đang active.
- `FiHome`: icon Home.
- `FiActivity`: icon Sensor Data.
- `FiCpu`: icon Device History.
- `FiGrid`: icon ở header Dashboard.

## 4.2. Cấu hình menu

```jsx
const navItems = [
  { label: 'Home', to: '/dashboard', icon: FiHome },
  { label: 'Sensor Data', to: '/sensor-data', icon: FiActivity },
  { label: 'Device History', to: '/device-history', icon: FiCpu },
]
```

Mỗi object gồm:

- `label`: chữ hiển thị.
- `to`: URL.
- `icon`: component icon.

Muốn thêm menu mới:

```jsx
{ label: 'Profile', to: '/profile', icon: FiUser }
```

và phải có route tương ứng trong `App.jsx`.

## 4.3. Component Sidebar

```jsx
function Sidebar() {
  return (
    <aside className="sidebar">
```

`aside` thể hiện đây là khu vực phụ của trang, ở đây là navigation.

## 4.4. Header sidebar

```jsx
<div className="sidebar-head">
  <h2>DASHBOARD</h2>
  <FiGrid className="sidebar-icon" aria-hidden="true" />
</div>
```

- `h2`: tên khu vực.
- `FiGrid`: icon trang trí/chức năng.
- `aria-hidden`: icon không cần đọc bởi screen reader.

## 4.5. Lặp menu bằng `map`

```jsx
{navItems.map((item) => (
  <NavLink key={item.to} to={item.to} ...>
```

`map` tạo một `NavLink` cho mỗi menu.

`key={item.to}` giúp React nhận diện từng phần tử trong danh sách.

## 4.6. Active class

```jsx
className={({ isActive }) =>
  isActive ? 'nav-item nav-item-active' : 'nav-item'
}
```

React Router truyền vào `isActive`:

- `true`: URL hiện tại trùng link.
- `false`: link không được chọn.

CSS tương ứng:

```css
.nav-item-active {
  background: #dfe2e8;
  color: #0a84ff;
}
```

## 4.7. Render icon động

```jsx
<item.icon className="nav-icon" aria-hidden="true" />
```

`item.icon` là component được lưu trong mảng `navItems`.

Ví dụ item Home có:

```jsx
icon: FiHome
```

nên React render:

```jsx
<FiHome />
```

## 4.8. Đoạn cốt lõi cần nhớ

```jsx
{navItems.map((item) => (
  <NavLink
    key={item.to}
    to={item.to}
    className={({ isActive }) =>
      isActive ? 'nav-item nav-item-active' : 'nav-item'
    }
  >
    <item.icon className="nav-icon" />
    {item.label}
  </NavLink>
))}
```

Đây là block tạo toàn bộ menu và đánh dấu menu đang chọn.

---

# 5. `Dashboard.jsx` - Dashboard chính

File: `frontend/src/pages/Dashboard.jsx`

## 5.1. Import hook

```jsx
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
```

Vai trò:

- `useState`: lưu sensor, LED, chart, status.
- `useEffect`: gọi API và tạo timer.
- `useMemo`: tạo danh sách card.
- `useCallback`: tạo hàm toggle ổn định.
- `useRef`: lưu cờ chống toast trùng.

## 5.2. Import icon, chart, toast và API

```jsx
import SensorChart from '../components/SensorChart'
import { useToast } from '../context/ToastContext'
```

- `SensorChart`: component vẽ biểu đồ.
- `useToast`: hiển thị thông báo.

```jsx
import {
  controlDevices,
  fetchActionHistory,
  fetchDeviceStatus,
  fetchLatestSensors,
  fetchSensorHistory,
  fetchSystemStatus,
} from '../services/api'
```

Các API được Dashboard sử dụng:

| Hàm | Endpoint | Mục đích |
|---|---|---|
| `fetchLatestSensors` | `GET /api/sensors/latest` | Sensor mới nhất |
| `fetchSensorHistory` | `GET /api/sensors/history` | Dữ liệu chart |
| `fetchDeviceStatus` | `GET /api/devices/status` | Trạng thái LED |
| `fetchSystemStatus` | `GET /api/system/status` | MQTT/demo status |
| `controlDevices` | `POST /api/devices/control` | Gửi lệnh LED |
| `fetchActionHistory` | `GET /api/actions/history` | Kiểm tra timeout |

## 5.3. LED labels và chart options

```jsx
const LED_LABELS = {
  led1: 'Red Led',
  led2: 'Yellow Led',
  led3: 'Green Led',
}
```

Map key kỹ thuật sang tên UI.

```jsx
const CHART_OPTIONS = [
  { key: 'temp', label: 'Temperature', unit: 'degC', color: '#ff6b6b' },
  { key: 'humidity', label: 'Humidity', unit: '%', color: '#4ecdc4' },
  { key: 'light', label: 'Light', unit: 'ADC', color: '#ffd93d' },
]
```

Đây là nguồn dữ liệu cho dropdown chart.

## 5.4. State

```jsx
const [latest, setLatest] = useState({
  temp: null,
  humidity: null,
  light: null,
})
```

Lưu số đo mới nhất.

```jsx
const [ledState, setLedState] = useState({
  led1: false,
  led2: false,
  led3: false,
})
```

Lưu trạng thái công tắc LED.

```jsx
const [tempSeries, setTempSeries] = useState([])
const [humiditySeries, setHumiditySeries] = useState([])
const [lightSeries, setLightSeries] = useState([])
```

Lưu lịch sử để vẽ từng loại chart.

```jsx
const [systemStatus, setSystemStatus] = useState({
  mqtt_connected: true,
  demo_mode: false,
})
```

Lưu trạng thái backend.

```jsx
const [selectedChart, setSelectedChart] = useState('temp')
```

Loại chart đang chọn.

## 5.5. Ref chống toast lặp

```jsx
const sensorWarningRef = useRef(false)
const pendingToastRef = useRef(new Set())
```

`useRef` giữ dữ liệu qua các lần render nhưng không khiến component render lại.

Mục đích:

- `sensorWarningRef`: không hiện cảnh báo sensor offline nhiều lần.
- `pendingToastRef`: không đặt nhiều timer kiểm tra cùng một LED.

## 5.6. Chuyển history thành dữ liệu chart

```jsx
const toSeries = (data) =>
  [...data].reverse().map((item) => ({
    value: Number(item.value),
    time: new Date(item.measured_at)
      .getHours()
      .toString()
      .padStart(2, '0'),
  }))
```

Các thao tác:

1. `[...]`: tạo bản sao mảng.
2. `.reverse()`: đảo dữ liệu để chart đi từ cũ đến mới.
3. `.map()`: chuyển mỗi record DB thành `{ value, time }`.
4. `Number(item.value)`: ép value về số.
5. `getHours()`: lấy giờ từ timestamp.
6. `padStart(2, '0')`: biến `9` thành `09`.

## 5.7. Load dữ liệu Dashboard

```jsx
const [latestData, tempHistory, humidityHistory, lightHistory] =
  await Promise.all([
    fetchLatestSensors(),
    fetchSensorHistory({ sensor_id: 1, limit: 7 }),
    fetchSensorHistory({ sensor_id: 2, limit: 7 }),
    fetchSensorHistory({ sensor_id: 3, limit: 7 }),
  ])
```

Đây là block gọi API cốt lõi của Dashboard.

Ý nghĩa:

- Lấy latest của tất cả sensor.
- Lấy 7 bản ghi nhiệt độ.
- Lấy 7 bản ghi độ ẩm.
- Lấy 7 bản ghi ánh sáng.

Sau đó cập nhật state:

```jsx
setLatest(latestData)
setTempSeries(toSeries(tempHistory))
setHumiditySeries(toSeries(humidityHistory))
setLightSeries(toSeries(lightHistory))
```

## 5.8. Refresh định kỳ

```jsx
load()
loadStatus()
loadDeviceStatus()

const timer = setInterval(load, 5000)
const statusTimer = setInterval(loadStatus, 7000)
```

- Sensor refresh mỗi 5 giây.
- MQTT/system status refresh mỗi 7 giây.
- LED status gọi khi page mount.

Cleanup:

```jsx
return () => {
  clearInterval(timer)
  clearInterval(statusTimer)
}
```

## 5.9. Tạo card sensor

```jsx
const cards = useMemo(
  () => [
    {
      title: 'Temperature Sensor',
      value: latest.temp != null
        ? `${Number(latest.temp).toFixed(1)} degC`
        : '--',
      className: 'stat-red',
      icon: <FaTemperatureHigh />,
    },
    ...
  ],
  [latest],
)
```

Muốn sửa card:

- `title`: tiêu đề.
- `value`: giá trị hiển thị.
- `className`: màu CSS.
- `icon`: icon SVG.

## 5.10. Toggle LED

```jsx
const nextState = !ledState[key]
```

Đảo trạng thái hiện tại.

```jsx
setLedState((prev) => ({
  ...prev,
  [key]: nextState,
}))
```

Cập nhật giao diện ngay.

```jsx
await controlDevices({
  [key]: nextState ? 'on' : 'off',
})
```

Gửi request:

```json
{
  "led1": "on"
}
```

Nếu lỗi:

```jsx
setLedState((prev) => ({
  ...prev,
  [key]: !nextState,
}))
```

Rollback công tắc về trạng thái cũ.

## 5.11. Render LED

```jsx
{Object.entries(ledState).map(([key, value]) => (
  <article key={key}>
    <span>{LED_LABELS[key] || key}</span>
    <button
      className={value ? 'switch switch-on' : 'switch'}
      onClick={() => handleToggle(key)}
    >
      <span className="switch-dot" />
    </button>
  </article>
))}
```

`Object.entries` biến object:

```js
{ led1: false, led2: true }
```

thành các cặp:

```js
['led1', false]
['led2', true]
```

## 5.12. Render chart

```jsx
const seriesMap = {
  temp: tempSeries,
  humidity: humiditySeries,
  light: lightSeries,
}
```

```jsx
const activeChart = CHART_OPTIONS.find(
  (o) => o.key === selectedChart,
)
```

```jsx
<SensorChart
  values={seriesMap[selectedChart]}
  label={`${activeChart.label} (${activeChart.unit})`}
  color={activeChart.color}
/>
```

Khi đổi dropdown, `selectedChart` đổi và chart nhận series khác.

---

# 6. `DataSensor.jsx` - Lịch sử sensor

File: `frontend/src/pages/DataSensor.jsx`

## 6.1. Hằng số và mapping

```jsx
const PAGE_SIZE = 10
```

Mỗi page hiển thị tối đa 10 dòng.

```jsx
const SENSOR_LABELS = {
  DHT11_Temp: 'Temperature Sensor',
  DHT11_Humid: 'Humidity Sensor',
  LDR_Light: 'Light Sensor',
}
```

Database có thể lưu tên tiếng Việt, nhưng UI dùng mapping này để hiển thị tiếng Anh.

## 6.2. State

```jsx
const [rows, setRows] = useState([])
```

Dữ liệu thô từ backend.

```jsx
const [query, setQuery] = useState('')
```

Search text.

```jsx
const [dateFilter, setDateFilter] = useState('')
const [order, setOrder] = useState('desc')
```

Ngày và thứ tự dữ liệu.

```jsx
const [sensorFilter, setSensorFilter] = useState('all')
```

Lọc theo loại sensor.

```jsx
const [timeHour, setTimeHour] = useState('')
const [timeMinute, setTimeMinute] = useState('')
const [timeSecond, setTimeSecond] = useState('')
const [timePeriod, setTimePeriod] = useState('')
```

Lọc theo thành phần thời gian.

```jsx
const [showFilter, setShowFilter] = useState(false)
const [page, setPage] = useState(1)
```

- `showFilter`: filter panel đóng/mở.
- `page`: trang hiện tại.

## 6.3. Gọi API lịch sử

```jsx
const params = { limit: 500, order }
```

Tải tối đa 500 record để frontend tự filter và phân trang.

```jsx
if (dateFilter) params.date = dateFilter
if (timeHour) params.hour = Number(timeHour)
if (timeMinute) params.minute = Number(timeMinute)
if (timeSecond) params.second = Number(timeSecond)
if (timePeriod) params.period = timePeriod
```

Chỉ thêm query parameter khi input có giá trị.

```jsx
const data = await fetchSensorHistory(params)
setRows(data)
```

Đây là đoạn lấy dữ liệu và lưu vào state.

## 6.4. Refresh và cleanup

```jsx
load()
const timer = setInterval(load, 5000)
return () => clearInterval(timer)
```

Bảng tự tải lại sau mỗi 5 giây.

## 6.5. Reset page khi filter đổi

```jsx
useEffect(
  () => setPage(1),
  [query, dateFilter, order, sensorFilter, ...],
)
```

Nếu đang ở page 4 mà đổi filter, quay về page 1 để tránh trường hợp page hiện tại không còn dữ liệu.

## 6.6. Lọc dữ liệu

```jsx
const filtered = useMemo(() => {
  let result = rows
```

Lọc sensor type:

```jsx
if (sensorFilter !== 'all') {
  result = result.filter(
    (item) => item.sensor_type === sensorFilter,
  )
}
```

Lọc search:

```jsx
const sensorName = item.sensor_name?.toLowerCase() || ''
const uiSensorName = SENSOR_LABELS[item.sensor_type]?.toLowerCase() || ''
const sensorValue = String(item.value)
```

```jsx
return (
  sensorName.includes(normalized) ||
  uiSensorName.includes(normalized) ||
  sensorValue.includes(normalized)
)
```

Search theo:

- Tên gốc trong database.
- Tên tiếng Anh trên UI.
- Giá trị đo.

## 6.7. Mapping nhãn UI

```jsx
const getSensorLabel = (item) =>
  SENSOR_LABELS[item.sensor_type] || item.sensor_name || 'Sensor'
```

Ưu tiên:

1. Tên tiếng Anh theo `sensor_type`.
2. Tên trong database.
3. Chuỗi dự phòng `Sensor`.

## 6.8. Phân trang

```jsx
const totalPages = Math.max(
  1,
  Math.ceil(filtered.length / PAGE_SIZE),
)
```

```jsx
const paginated = filtered.slice(
  (page - 1) * PAGE_SIZE,
  page * PAGE_SIZE,
)
```

Đây là phần cốt lõi của pagination.

## 6.9. Export CSV

```jsx
const header = 'Sensor,Type,Value,Time'
```

Tạo dòng tiêu đề CSV.

```jsx
const csvRows = filtered.map((item) => (...))
```

Tạo từng dòng CSV từ dữ liệu đã lọc.

```jsx
const blob = new Blob([
  [header, ...csvRows].join('\n'),
], {
  type: 'text/csv;charset=utf-8;',
})
```

Tạo file CSV trong browser.

```jsx
a.download = `sensor_data_${...}.csv`
a.click()
```

Bắt đầu tải file.

## 6.10. Render table

```jsx
{paginated.map((item) => (
  <tr key={item.id}>
```

Mỗi record tạo một hàng.

```jsx
<td>{getSensorLabel(item)}</td>
<td>{Number(item.value).toFixed(1)}</td>
<td>{new Date(item.measured_at).toLocaleString()}</td>
```

Hiển thị tên, value và thời gian.

---

# 7. `ActionHistory.jsx` - Lịch sử điều khiển

File: `frontend/src/pages/ActionHistory.jsx`

## 7.1. Các nhóm filter

```jsx
const STATUS_CHIPS = [
  { value: 'all', label: 'All Status' },
  { value: 'success', label: 'Success' },
  { value: 'timeout', label: 'Timeout' },
  { value: 'pending', label: 'Pending' },
]
```

Lọc theo trạng thái action.

```jsx
const ACTION_CHIPS = [
  { value: 'all', label: 'All Actions' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
]
```

Lọc theo bật/tắt.

```jsx
const DEVICE_CHIPS = [
  { value: 'all', label: 'All Devices' },
  { value: 'LED_RED', label: 'Red Led' },
  { value: 'LED_YELLOW', label: 'Yellow Led' },
  { value: 'LED_GREEN', label: 'Green Led' },
]
```

Lọc theo loại LED.

## 7.2. State

```jsx
const [rows, setRows] = useState([])
```

Danh sách action từ backend.

```jsx
const [statusFilter, setStatusFilter] = useState('all')
const [actionFilter, setActionFilter] = useState('all')
const [deviceFilter, setDeviceFilter] = useState('all')
```

Ba nhóm filter trong panel.

```jsx
const [query, setQuery] = useState('')
```

Search theo tên device và user.

```jsx
const [dateFilter, setDateFilter] = useState('')
const [order, setOrder] = useState('desc')
```

Lọc ngày và sắp xếp.

## 7.3. Gọi API

```jsx
const params = { limit: 500, order }
```

```jsx
if (dateFilter) params.date = dateFilter
if (timeHour) params.hour = Number(timeHour)
if (timeMinute) params.minute = Number(timeMinute)
if (timeSecond) params.second = Number(timeSecond)
if (timePeriod) params.period = timePeriod
```

```jsx
const data = await fetchActionHistory(params)
setRows(data)
```

Request tương ứng:

```text
GET /api/actions/history
```

## 7.4. Refresh định kỳ

```jsx
const timer = setInterval(load, 5000)
return () => clearInterval(timer)
```

Bảng tự refresh 5 giây một lần.

## 7.5. Reset pagination

```jsx
useEffect(
  () => setPage(1),
  [query, dateFilter, order, statusFilter, actionFilter, deviceFilter, ...],
)
```

Mỗi lần filter đổi, quay lại page 1.

## 7.6. Lọc status/action/device

```jsx
if (statusFilter !== 'all') {
  result = result.filter(
    (item) => item.status === statusFilter,
  )
}
```

```jsx
if (actionFilter !== 'all') {
  result = result.filter(
    (item) => item.action === actionFilter,
  )
}
```

```jsx
if (deviceFilter !== 'all') {
  result = result.filter(
    (item) => item.device_type === deviceFilter,
  )
}
```

Đây là logic lọc ở frontend trên mảng `rows`.

## 7.7. Search device/user

```jsx
result = result.filter(
  (item) =>
    (item.device_name &&
      item.device_name.toLowerCase().includes(normalized)) ||
    (item.user_name &&
      item.user_name.toLowerCase().includes(normalized)),
)
```

Search được:

- `device_name`.
- `user_name`.

## 7.8. Pagination

```jsx
const PAGE_SIZE = 8
```

Trang này có 5 cột nên chỉ hiển thị 8 dòng để vừa viewport.

```jsx
const totalPages = Math.max(
  1,
  Math.ceil(filtered.length / PAGE_SIZE),
)
```

```jsx
const paginated = filtered.slice(
  (page - 1) * PAGE_SIZE,
  page * PAGE_SIZE,
)
```

## 7.9. Render bảng

```jsx
<td>{item.device_name}</td>
```

Tên thiết bị.

```jsx
<td>
  <span className="user-badge">
    {item.user_name || 'admin'}
  </span>
</td>
```

Tên user, nếu không có thì hiển thị `admin`.

```jsx
<td>{item.action === 'on' ? 'On' : 'Off'}</td>
```

Chuyển giá trị kỹ thuật thành chữ UI.

```jsx
<span className={`status-badge status-${item.status}`}>
  {item.status}
</span>
```

Nếu `item.status` là `success`, class cuối cùng là:

```text
status-badge status-success
```

CSS quyết định màu badge.

## 7.10. Export CSV

```jsx
const header = 'Device,User,Type,Action,Status,Time'
```

```jsx
const csvRows = filtered.map((item) => (...))
```

Export toàn bộ dữ liệu đã lọc, không chỉ 8 dòng đang hiển thị ở trang hiện tại.

## 7.11. Đoạn cốt lõi cần nhớ

```jsx
const data = await fetchActionHistory(params)
setRows(data)
```

```jsx
const filtered = useMemo(() => {
  let result = rows
  // filter status/action/device/search
  return result
}, [...])
```

```jsx
const paginated = filtered.slice(
  (page - 1) * PAGE_SIZE,
  page * PAGE_SIZE,
)
```

Đây là flow chính:

```text
API data
   ↓
rows
   ↓
filtered
   ↓
paginated
   ↓
table
```

---

# 8. Frontend filter nào chạy ở đâu?

## Filter chạy ở backend

Các filter được gửi trong query API:

- Date.
- Hour.
- Minute.
- Second.
- AM/PM.
- Order.
- Limit.

Ví dụ:

```text
/api/sensors/history?date=2026-10-06&hour=10&period=AM
```

Backend dùng các điều kiện SQL để lọc trước khi trả dữ liệu.

## Filter chạy ở frontend

Các filter xử lý trên mảng đã nhận:

- Sensor type.
- Status.
- Action.
- Device.
- Search text.
- Pagination.

Lý do chia như vậy:

- Lọc theo thời gian phù hợp để database xử lý.
- Lọc chip/search nhỏ và nhanh thì frontend xử lý thuận tiện.

---

# 9. Các câu hỏi báo cáo thường gặp

## “File nào gọi API?”

Các page gọi hàm được export từ:

```text
src/services/api.js
```

Ví dụ:

```jsx
import { fetchActionHistory } from '../services/api'
```

## “Dữ liệu API đi vào đâu?”

Ví dụ Action History:

```jsx
const data = await fetchActionHistory(params)
setRows(data)
```

Dữ liệu đi vào state `rows`, sau đó được lọc và render bằng `map`.

## “Tại sao dùng `useEffect`?”

Để thực hiện các thao tác bên ngoài việc render, như gọi API và tạo timer refresh.

## “Tại sao dùng `useMemo`?”

Để tính danh sách `filtered` từ `rows` và các filter hiện tại.

## “Tại sao dùng `key={item.id}`?”

Để React nhận diện ổn định từng dòng khi danh sách thay đổi.

## “Frontend kết nối MQTT ở đâu?”

Không kết nối trực tiếp. Frontend gọi REST API backend. Backend mới kết nối MQTT với ESP8266.

## “Nếu database có tên sensor tiếng Việt nhưng UI tiếng Anh thì sao?”

Frontend dùng `SENSOR_LABELS` để map `sensor_type` sang tên hiển thị tiếng Anh. Database vẫn giữ dữ liệu gốc.

## “Bấm LED thì flow như thế nào?”

```text
handleToggle
   ↓
setLedState
   ↓
controlDevices()
   ↓
POST /api/devices/control
   ↓
Backend insert action_history
   ↓
Backend publish MQTT
   ↓
ESP8266 xử lý
   ↓
ESP trả device_response
```

---

# 10. Checklist khi cần chỉnh sửa

## Đổi màu chart

Mở `Dashboard.jsx`, sửa `CHART_OPTIONS`:

```jsx
color: '#ff6b6b'
```

## Đổi màu card

Mở `App.css`:

```css
.stat-red { ... }
.stat-green { ... }
.stat-yellow { ... }
```

## Đổi số dòng bảng

- Sensor Data: sửa `PAGE_SIZE = 10`.
- Action History: sửa `PAGE_SIZE = 8`.

## Đổi tên filter

- Sensor: `SENSOR_CHIPS`.
- Action History: `STATUS_CHIPS`, `ACTION_CHIPS`, `DEVICE_CHIPS`.

## Đổi endpoint

Mở `services/api.js`, sửa URL trong `api.get` hoặc `api.post`.

## Đổi thời gian refresh

Tìm:

```jsx
setInterval(load, 5000)
```

`5000` nghĩa là 5 giây.

## Đổi kiểu bảng

Mở page tương ứng và sửa:

```jsx
<thead>...</thead>
<tbody>...</tbody>
```

## Kiểm tra sau khi sửa

```powershell
cd D:\BTL_IOT\frontend
npm run build
```

Nếu build thành công, frontend không có lỗi biên dịch.

---

# 11. `ToastContext.jsx` - Hệ thống thông báo dùng chung

File: `frontend/src/context/ToastContext.jsx`

Toast là thông báo nhỏ xuất hiện khi có sự kiện, ví dụ sensor offline, gửi lệnh LED thất bại hoặc LED không phản hồi.

## 11.1. Tạo Context và import hook

```jsx
import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(null)
```

- `createContext`: tạo vùng dữ liệu dùng chung.
- `useState`: lưu danh sách toast.
- `useContext`: đọc dữ liệu từ Context.
- `useCallback`: giữ các hàm xử lý ổn định giữa các lần render.

## 11.2. `ToastProvider`

```jsx
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
```

`ToastProvider` bao quanh toàn bộ ứng dụng trong `App.jsx`. `children` là phần giao diện bên trong Provider, gồm Sidebar, Routes và các page.

`toasts` là mảng các thông báo đang hiển thị. Một toast có dạng:

```js
{
  id: 12345,
  message: 'Failed to send command',
  type: 'error',
}
```

## 11.3. Hàm `showToast`

```jsx
const showToast = useCallback((message, type = 'warning') => {
  const id = Date.now() + Math.random()
  setToasts((prev) => [...prev, { id, message, type }])
  setTimeout(() => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, 5000)
}, [])
```

Hoạt động theo thứ tự:

1. Nhận nội dung `message` và loại toast `type`.
2. Tạo ID riêng cho toast.
3. Thêm toast mới vào state bằng `setToasts`.
4. Sau 5000 milliseconds, tìm đúng ID và xóa toast.

`...prev` giữ lại các toast cũ. `filter` tạo mảng mới không còn toast đã hết hạn.

Các loại hiện tại:

```text
warning → toast-warning
error   → toast-error
```

## 11.4. Hàm đóng thủ công

```jsx
const dismissToast = useCallback((id) => {
  setToasts((prev) => prev.filter((t) => t.id !== id))
}, [])
```

Hàm này xóa ngay toast có ID tương ứng khi người dùng bấm nút đóng.

## 11.5. Cung cấp hàm cho page con

```jsx
<ToastContext.Provider value={{ showToast }}>
  {children}
  ...
</ToastContext.Provider>
```

Nhờ `Provider`, component con có thể gọi `showToast` mà không cần truyền props qua nhiều tầng.

Trong `Dashboard.jsx`:

```jsx
const showToast = useToast()
```

Gọi toast:

```jsx
showToast('Failed to send command', 'error')
```

Hoặc:

```jsx
showToast('Sensor hardware not detected', 'warning')
```

## 11.6. Render danh sách toast

```jsx
<div className="toast-container">
  {toasts.map((toast) => (
    <div key={toast.id} className={`toast toast-${toast.type}`}>
      <span className="toast-message">{toast.message}</span>
      <button
        type="button"
        className="toast-dismiss"
        onClick={() => dismissToast(toast.id)}
      >
        ×
      </button>
    </div>
  ))}
</div>
```

- `map`: mỗi object trong mảng tạo một toast HTML.
- `key={toast.id}`: giúp React nhận diện từng toast.
- `toast-${toast.type}`: tạo class động như `toast-warning` hoặc `toast-error`.
- `onClick`: đóng toast thủ công.

Container được render ngoài `Routes`, nên toast không bị unmount khi chuyển giữa Dashboard, Sensor Data và Device History.

## 11.7. Custom hook `useToast`

```jsx
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>')
  }
  return ctx.showToast
}
```

Hook này lấy `showToast` từ Context. Nếu component dùng hook bên ngoài `ToastProvider`, code ném lỗi để phát hiện cấu trúc sai.

## 11.8. CSS liên quan

Trong `App.css`:

```css
.toast-container {
  position: fixed;
  top: 24px;
  right: 24px;
}
```

Toast được cố định ở góc trên bên phải.

```css
.toast-warning {
  background: #fffbf0;
  border-left-color: #f59e0b;
}

.toast-error {
  background: #fff5f5;
  border-left-color: #ef4444;
}
```

React quyết định class nào được gán; CSS quyết định màu và cách hiển thị.

## 11.9. Flow hoàn chỉnh

```text
Dashboard phát hiện lỗi
        ↓
showToast(message, type)
        ↓
setToasts thêm object vào state
        ↓
ToastProvider render lại
        ↓
CSS hiển thị warning/error toast
        ↓
5 giây sau tự xóa hoặc người dùng đóng thủ công
```

## 11.10. Câu trả lời khi báo cáo

> `ToastContext` dùng React Context để cung cấp chức năng thông báo cho nhiều page. `ToastProvider` lưu danh sách toast bằng `useState` và render container ngoài `Routes`, nên toast không bị mất khi chuyển trang. Các page gọi custom hook `useToast` để lấy `showToast`. Toast tự động bị xóa sau 5 giây hoặc có thể được đóng thủ công.
