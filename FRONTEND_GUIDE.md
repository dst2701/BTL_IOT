# Frontend Guide - BTL_IOT

Tài liệu này giải thích frontend hiện tại của dự án theo cách dễ học cho người đã biết HTML/CSS nhưng mới bắt đầu với React.

Mục tiêu là sau khi đọc, bạn có thể:

- Trình bày được frontend chạy theo flow nào.
- Biết tính năng nằm ở file nào.
- Hiểu `useState`, `useEffect`, `useMemo`, `useCallback`, `useRef` ở mức đủ dùng.
- Biết sửa text, màu, kích thước, API, filter, chart và LED.
- Trả lời các câu hỏi thường gặp khi báo cáo.

---

## 1. Bản đồ frontend

```text
frontend/
├── package.json              # Thư viện và lệnh chạy
├── index.html                # HTML gốc, có #root
└── src/
    ├── main.jsx              # Điểm khởi động React
    ├── App.jsx               # Router và layout toàn ứng dụng
    ├── index.css             # CSS nền tảng toàn cục
    ├── App.css               # CSS giao diện chính
    ├── services/
    │   └── api.js            # Các hàm gọi backend bằng Axios
    ├── context/
    │   └── ToastContext.jsx  # Quản lý thông báo toàn ứng dụng
    ├── components/
    │   ├── Sidebar.jsx       # Thanh điều hướng
    │   └── SensorChart.jsx   # Biểu đồ dùng lại được
    └── pages/
        ├── Dashboard.jsx     # Dashboard, cảm biến, LED, chart
        ├── DataSensor.jsx    # Lịch sử cảm biến, filter, phân trang
        ├── ActionHistory.jsx # Lịch sử LED, filter, phân trang
        └── Profile.jsx       # Trang thông tin cá nhân
```

### Flow một lần chạy frontend

```text
index.html
   ↓
main.jsx
   ↓ BrowserRouter + App
   ↓
App.jsx
   ├── ToastProvider
   ├── Sidebar
   └── Routes
       ├── /dashboard       → Dashboard.jsx
       ├── /sensor-data     → DataSensor.jsx
       ├── /device-history  → ActionHistory.jsx
       └── /profile         → Profile.jsx
```

Câu trả lời ngắn khi báo cáo:

> `main.jsx` là điểm khởi động React. `App.jsx` tạo layout và định tuyến. Mỗi URL gọi một page trong thư mục `pages`. Các thành phần dùng lại như Sidebar và chart nằm trong `components`. Việc gọi backend tập trung trong `services/api.js`.

---

## 2. React khác HTML như thế nào?

HTML tĩnh:

```html
<h1>Temperature</h1>
<p>28.5 degC</p>
```

React JSX:

```jsx
<h1>{title}</h1>
<p>{temperature} degC</p>
```

Trong JSX:

- Viết gần giống HTML.
- Dùng `className` thay vì `class`.
- JavaScript đặt trong `{}`.
- Component phải viết hoa chữ cái đầu: `Dashboard`, `Sidebar`.
- Một component phải trả về một cây phần tử gốc, thường dùng `<section>` hoặc `<>...</>`.

Ví dụ:

```jsx
function Greeting() {
  const name = 'Tung'

  return <h1>Hello {name}</h1>
}
```

`function Greeting()` là component. Khi viết `<Greeting />`, React gọi function đó và đưa kết quả lên giao diện.

---

## 3. `main.jsx`: điểm bắt đầu

File: [frontend/src/main.jsx](frontend/src/main.jsx)

```jsx
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

Giải thích:

- `document.getElementById('root')`: tìm thẻ `<div id="root">` trong `index.html`.
- `createRoot(...).render(...)`: bảo React render ứng dụng vào đó.
- `BrowserRouter`: cho phép URL `/dashboard`, `/sensor-data`... hoạt động.
- `StrictMode`: hỗ trợ phát hiện vấn đề trong lúc phát triển. Một số effect có thể được kiểm tra lại ở development, không phải dữ liệu bị nhân đôi trên production.

---

## 4. `App.jsx`: layout và routing

File: [frontend/src/App.jsx](frontend/src/App.jsx)

Các phần chính:

```jsx
<ToastProvider>
  <div className="app-shell">
    <Sidebar />
    <main className="app-content">
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/sensor-data" element={<DataSensor />} />
        <Route path="/device-history" element={<ActionHistory />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </main>
  </div>
</ToastProvider>
```

- `ToastProvider`: cung cấp chức năng toast cho mọi page con.
- `Sidebar`: luôn hiển thị.
- `Routes`: chọn page theo URL.
- `Route`: ánh xạ URL với component.
- `Navigate`: chuyển URL không hợp lệ về `/dashboard`.

### Muốn thêm trang mới

Ví dụ thêm trang Settings:

1. Tạo `src/pages/Settings.jsx`.
2. Import vào `App.jsx`:

```jsx
import Settings from './pages/Settings'
```

3. Thêm route:

```jsx
<Route path="/settings" element={<Settings />} />
```

4. Thêm link vào `navItems` trong [Sidebar.jsx](frontend/src/components/Sidebar.jsx).

---

## 5. `Sidebar.jsx`: menu điều hướng

File: [frontend/src/components/Sidebar.jsx](frontend/src/components/Sidebar.jsx)

```jsx
const navItems = [
  { label: 'Home', to: '/dashboard' },
  { label: 'Sensor Data', to: '/sensor-data' },
  { label: 'Device History', to: '/device-history' },
]
```

Mảng `navItems` là nơi dễ sửa tên menu và URL.

```jsx
<NavLink
  to={item.to}
  className={({ isActive }) =>
    isActive ? 'nav-item nav-item-active' : 'nav-item'
  }
>
```

`NavLink` tự biết link nào đang active và thêm class `nav-item-active`.

Muốn đổi màu menu active, sửa `.nav-item-active` trong [App.css](frontend/src/App.css).

---

## 6. `useState`: dữ liệu thay đổi trên màn hình

`useState` là state, tức dữ liệu mà khi thay đổi sẽ làm component render lại.

Ví dụ trong Dashboard:

```jsx
const [latest, setLatest] = useState({
  temp: null,
  humidity: null,
  light: null,
})
```

- `latest`: giá trị hiện tại để đọc.
- `setLatest`: hàm cập nhật.
- Object ban đầu có giá trị `null` vì lúc đầu API chưa trả về.

Khi nhận dữ liệu:

```jsx
setLatest(latestData)
```

React render lại và card hiển thị số mới.

### Quy tắc quan trọng

Không sửa trực tiếp:

```jsx
latest.temp = 30
```

Nên dùng setter:

```jsx
setLatest((previous) => ({
  ...previous,
  temp: 30,
}))
```

`...previous` giữ lại các thuộc tính cũ.

### Các state chính hiện tại

Trong [Dashboard.jsx](frontend/src/pages/Dashboard.jsx):

- `latest`: số đo mới nhất.
- `ledState`: trạng thái bật/tắt của LED.
- `tempSeries`, `humiditySeries`, `lightSeries`: dữ liệu chart.
- `systemStatus`: MQTT và demo mode.
- `selectedChart`: loại chart đang chọn.

Trong [DataSensor.jsx](frontend/src/pages/DataSensor.jsx):

- `rows`: dữ liệu lấy từ API.
- `query`: nội dung search.
- `dateFilter`: ngày cần lọc.
- `sensorFilter`: All/Temperature/Humidity/Light.
- `timeHour`, `timeMinute`, `timeSecond`, `timePeriod`: bộ lọc giờ.
- `page`: trang hiện tại.
- `showFilter`: panel filter đang mở hay đóng.

Trong [ActionHistory.jsx](frontend/src/pages/ActionHistory.jsx), state tương tự nhưng thêm:

- `statusFilter`: success/timeout/pending.
- `actionFilter`: on/off.
- `deviceFilter`: LED nào.

---

## 7. `useEffect`: chạy side effect

Side effect là việc component làm ngoài việc tính toán giao diện, ví dụ:

- Gọi API.
- Tạo timer.
- Đăng ký event.
- Đọc dữ liệu bên ngoài.

Ví dụ Dashboard:

```jsx
useEffect(() => {
  load()
  loadStatus()
  loadDeviceStatus()

  const timer = setInterval(load, 5000)
  return () => clearInterval(timer)
}, [showToast])
```

Ý nghĩa:

1. Khi Dashboard được mở, gọi API lần đầu.
2. Cứ 5 giây tải lại sensor.
3. Cứ 7 giây tải lại trạng thái MQTT.
4. Khi rời trang, `clearInterval` để không còn timer chạy ngầm.

### Dependency array

```jsx
useEffect(() => {
  // chạy khi component mount
}, [])
```

Mảng rỗng nghĩa là không phụ thuộc state nào.

```jsx
useEffect(() => {
  // chạy lại khi dateFilter hoặc order đổi
}, [dateFilter, order])
```

Trong Data Sensor, khi ngày hoặc thứ tự đổi, effect gọi API lại với query mới.

### Vì sao phải cleanup?

Nếu không gọi `clearInterval`, mỗi lần vào lại trang có thể tạo thêm một timer. Kết quả là gọi API nhiều lần không cần thiết.

Mẫu cần nhớ:

```jsx
useEffect(() => {
  const timer = setInterval(doSomething, 5000)

  return () => clearInterval(timer)
}, [])
```

---

## 8. Các hook khác đang dùng

### `useMemo`

Dùng để tính dữ liệu từ state hiện tại, ví dụ lọc bảng:

```jsx
const filtered = useMemo(() => {
  let result = rows
  // lọc sensor, search...
  return result
}, [rows, query, sensorFilter])
```

Nó không phải API cache. Nó giúp tách phần tính toán `filtered` khỏi JSX và chỉ tính lại khi dependency thay đổi.

### `useCallback`

Trong Dashboard:

```jsx
const handleToggle = useCallback(async (key) => {
  // gửi lệnh LED
}, [ledState, showToast])
```

Dùng để giữ function ổn định giữa các lần render khi cần truyền function hoặc tránh effect chạy lại không cần thiết.

### `useRef`

```jsx
const sensorWarningRef = useRef(false)
```

`useRef` giữ một giá trị qua nhiều lần render nhưng thay đổi nó không làm render lại.

Trong dự án, ref dùng để tránh hiện cùng một toast cảnh báo nhiều lần.

---

## 9. Flow Dashboard hoàn chỉnh

File chính: [frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx)

```text
Dashboard mở
   ↓
useEffect chạy
   ↓
Promise.all gọi 4 API song song
   ├── /api/sensors/latest
   ├── /api/sensors/history?sensor_id=1
   ├── /api/sensors/history?sensor_id=2
   └── /api/sensors/history?sensor_id=3
   ↓
setLatest + setTempSeries + setHumiditySeries + setLightSeries
   ↓
React render card và chart
```

### Card cảm biến nằm ở đâu?

Trong `cards` của `Dashboard.jsx`:

```jsx
{
  title: 'Temperature Sensor',
  value: latest.temp != null
    ? `${Number(latest.temp).toFixed(1)} degC`
    : '--',
}
```

- Đổi tiêu đề: sửa `title`.
- Đổi đơn vị: sửa `degC`.
- Đổi số chữ số thập phân: sửa `.toFixed(1)`.
- Đổi màu card: sửa class `stat-red`, `stat-green`, `stat-yellow` trong JSX và CSS.
- Đổi icon: sửa import và thuộc tính `icon`.

### Chart nằm ở đâu?

`SensorChart.jsx` là component dùng lại.

Dashboard chọn loại chart bằng:

```jsx
const [selectedChart, setSelectedChart] = useState('temp')
```

Khi select đổi:

```jsx
onChange={(e) => setSelectedChart(e.target.value)}
```

Sau đó:

```jsx
values={seriesMap[selectedChart]}
label={`${activeChart.label} (${activeChart.unit})`}
color={activeChart.color}
```

Muốn thêm loại chart mới:

1. Thêm object vào `CHART_OPTIONS`.
2. Tạo state series tương ứng.
3. Gọi API history cho sensor đó.
4. Thêm vào `seriesMap`.

---

## 10. Flow điều khiển LED

Người dùng bấm toggle:

```text
Click switch
   ↓
handleToggle('led1')
   ↓
Đổi UI ngay bằng setLedState
   ↓
POST /api/devices/control
   ↓
Backend publish MQTT
   ↓
ESP8266 nhận topic device_control
   ↓
digitalWrite(D1, HIGH/LOW)
   ↓
ESP publish device_response
   ↓
Backend cập nhật action_history
```

Đoạn gọi API nằm trong [frontend/src/services/api.js](frontend/src/services/api.js):

```jsx
export async function controlDevices(payload) {
  const { data } = await api.post('/api/devices/control', payload)
  return data
}
```

Payload mẫu:

```json
{
  "led1": "on"
}
```

### Đổi tên LED

Sửa `LED_LABELS` trong `Dashboard.jsx`:

```jsx
const LED_LABELS = {
  led1: 'Red Led',
  led2: 'Yellow Led',
  led3: 'Green Led',
}
```

### Thêm hoặc bỏ LED

Frontend cần sửa:

1. `ledState` trong `Dashboard.jsx`.
2. `LED_LABELS` trong `Dashboard.jsx`.
3. Backend request model và mapping device.
4. Database phải có device tương ứng.
5. Arduino phải có pin, `pinMode`, xử lý JSON và phản hồi.

Ví dụ thêm `led4` không chỉ thêm một toggle ở frontend; cả bốn tầng phải hiểu `led4`.

---

## 11. Flow Sensor Data

File: [frontend/src/pages/DataSensor.jsx](frontend/src/pages/DataSensor.jsx)

```text
Mở trang
   ↓
useEffect gọi /api/sensors/history
   ↓
setRows(data)
   ↓
useMemo lọc sensor + search
   ↓
Tính totalPages
   ↓
Cắt paginated theo page
   ↓
Render table
```

### Filter sensor

Các chip nằm trong `SENSOR_CHIPS`:

```jsx
const SENSOR_CHIPS = [
  { value: 'all', label: 'All' },
  { value: 'DHT11_Temp', label: 'Temperature' },
  { value: 'DHT11_Humid', label: 'Humidity' },
  { value: 'LDR_Light', label: 'Light' },
]
```

Đổi tên chip: sửa `label`.

Đổi giá trị lọc: sửa `value`, nhưng phải khớp `sensor_type` backend/database.

### Filter thời gian

Các state:

```jsx
const [timeHour, setTimeHour] = useState('')
const [timeMinute, setTimeMinute] = useState('')
const [timeSecond, setTimeSecond] = useState('')
const [timePeriod, setTimePeriod] = useState('')
```

Khi có giá trị, chúng được đưa vào query API:

```jsx
if (timeHour) params.hour = Number(timeHour)
if (timeMinute) params.minute = Number(timeMinute)
if (timeSecond) params.second = Number(timeSecond)
if (timePeriod) params.period = timePeriod
```

Bỏ trống ô nào nghĩa là không gửi tham số đó, backend không lọc theo phần đó.

### Pagination

```jsx
const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
const paginated = filtered.slice(
  (page - 1) * PAGE_SIZE,
  page * PAGE_SIZE,
)
```

`PAGE_SIZE = 20`, nên mỗi trang tối đa 20 bản ghi.

---

## 12. Flow Device History

File: [frontend/src/pages/ActionHistory.jsx](frontend/src/pages/ActionHistory.jsx)

Cấu trúc giống Sensor Data, nhưng có thêm ba nhóm filter:

- Status: `success`, `timeout`, `pending`.
- Action: `on`, `off`.
- Device: `LED_RED`, `LED_YELLOW`, `LED_GREEN`.

Search tìm trong:

```jsx
item.device_name
item.user_name
```

Nếu thầy hỏi “lọc được thực hiện ở frontend hay backend?”:

> Lọc ngày, giờ, phút, giây và AM/PM được gửi xuống backend qua query parameter để MySQL lọc. Lọc chip sensor/status/action/device và search tiếp tục được áp dụng ở frontend trên mảng dữ liệu đã tải về.

---

## 13. `api.js`: cầu nối frontend/backend

File: [frontend/src/services/api.js](frontend/src/services/api.js)

Axios được cấu hình một lần:

```jsx
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
  timeout: 10000,
})
```

`baseURL` là địa chỉ backend. Ví dụ:

```text
http://127.0.0.1:8000
```

### Các hàm API

| Hàm frontend | HTTP | Backend endpoint | Mục đích |
|---|---|---|---|
| `fetchLatestSensors` | GET | `/api/sensors/latest` | Lấy số đo mới nhất |
| `fetchSensorHistory` | GET | `/api/sensors/history` | Lấy lịch sử sensor |
| `controlDevices` | POST | `/api/devices/control` | Bật/tắt LED |
| `fetchActionHistory` | GET | `/api/actions/history` | Lấy lịch sử LED |
| `fetchSystemStatus` | GET | `/api/system/status` | Kiểm tra MQTT/demo |
| `fetchDeviceStatus` | GET | `/api/devices/status` | Đồng bộ trạng thái LED |

### Thêm API mới

```jsx
export async function fetchSomething() {
  const { data } = await api.get('/api/something')
  return data
}
```

Sau đó import hàm vào page và gọi trong `useEffect` hoặc event handler.

---

## 14. ToastContext: thông báo dùng chung

File: [frontend/src/context/ToastContext.jsx](frontend/src/context/ToastContext.jsx)

Context giúp nhiều component dùng chung một dữ liệu/hàm mà không cần truyền props qua nhiều tầng.

Trong App:

```jsx
<ToastProvider>
  <Routes />
</ToastProvider>
```

Trong Dashboard:

```jsx
const showToast = useToast()
showToast('Failed to send command', 'error')
```

`ToastProvider` lưu danh sách toast bằng `useState`, sau 5 giây tự xoá bằng `setTimeout`.

Muốn sửa thời gian tự đóng:

```jsx
}, 5000)
```

Muốn sửa màu, xem `.toast-warning` và `.toast-error` trong [App.css](frontend/src/App.css).

---

## 15. CSS: cần nhớ gì, không cần nhớ gì?

Bạn không cần học thuộc toàn bộ CSS. Khi thầy hỏi sửa giao diện, hãy nhớ nhóm property sau.

### Box model

```css
.card {
  width: 300px;
  padding: 20px;
  border: 1px solid #ddd;
  margin: 16px;
}
```

- `width`: chiều rộng nội dung.
- `padding`: khoảng cách từ nội dung tới viền.
- `border`: đường viền.
- `margin`: khoảng cách bên ngoài.
- `box-sizing: border-box`: width đã bao gồm padding và border.

### Flexbox

```css
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
```

- `display: flex`: xếp con theo flex.
- `flex-direction`: hàng hoặc cột.
- `justify-content`: căn theo trục chính.
- `align-items`: căn theo trục phụ.
- `gap`: khoảng cách giữa các con.
- `flex-wrap`: cho phép xuống dòng.

### Grid

```css
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}
```

- `grid-template-columns`: số cột.
- `1fr`: chia đều phần còn lại.
- `repeat(3, ...)`: tạo 3 cột.

### Text và màu

- `font-size`: cỡ chữ.
- `font-weight`: độ đậm.
- `line-height`: chiều cao dòng.
- `color`: màu chữ.
- `background`: màu/nền.
- `text-align`: căn chữ.

### Hình dạng và hiệu ứng

- `border-radius`: bo góc.
- `box-shadow`: bóng.
- `opacity`: độ trong suốt.
- `transition`: chuyển động mượt.
- `cursor: pointer`: hiện con trỏ bấm được.

### Responsive

```css
@media (max-width: 1100px) {
  .app-shell {
    grid-template-columns: 1fr;
  }
}
```

Nghĩa là khi màn hình rộng tối đa 1100px, CSS bên trong được áp dụng. Đây là cách giao diện chuyển từ sidebar bên trái sang layout một cột.

---

## 16. Bảng tra cứu “muốn sửa gì thì mở file nào?”

| Muốn sửa | File |
|---|---|
| Tên app/menu | `components/Sidebar.jsx` |
| URL chuyển trang | `App.jsx`, `Sidebar.jsx` |
| Tiêu đề Dashboard | `pages/Dashboard.jsx` |
| Card nhiệt độ/độ ẩm/ánh sáng | `pages/Dashboard.jsx` |
| Tên và số LED | `pages/Dashboard.jsx` |
| Lệnh điều khiển LED | `pages/Dashboard.jsx`, `services/api.js` |
| Biểu đồ | `components/SensorChart.jsx`, `pages/Dashboard.jsx` |
| Tên sensor filter | `pages/DataSensor.jsx` |
| Filter thời gian sensor | `pages/DataSensor.jsx`, backend `main.py` |
| Bảng sensor | `pages/DataSensor.jsx` |
| Bảng history LED | `pages/ActionHistory.jsx` |
| Filter status/action/device | `pages/ActionHistory.jsx` |
| Toast message | `context/ToastContext.jsx`, `pages/Dashboard.jsx` |
| Avatar, link profile | `pages/Profile.jsx` |
| Màu, khoảng cách, layout | `App.css` |
| CSS nền tảng | `index.css` |
| Địa chỉ backend | `frontend/.env` |
| Endpoint API | `services/api.js` |
| Thư viện npm | `package.json` |

---

## 17. Các câu hỏi thầy có thể hỏi

### “Tại sao dùng React thay vì HTML thuần?”

React cho phép chia giao diện thành component, quản lý state và cập nhật từng phần giao diện khi dữ liệu thay đổi mà không cần tải lại toàn bộ trang.

### “Component là gì?”

Component là một function trả về JSX, đại diện cho một phần giao diện có thể tái sử dụng. Ví dụ `Sidebar` và `SensorChart`.

### “State là gì?”

State là dữ liệu nội bộ có thể thay đổi của component. Khi state đổi qua setter, React render lại giao diện liên quan.

### “Props là gì?”

Props là dữ liệu truyền từ component cha xuống component con.

Trong Dashboard:

```jsx
<SensorChart
  values={seriesMap[selectedChart]}
  label="Temperature (degC)"
  color="#ff6b6b"
/>
```

`values`, `label`, `color` là props của `SensorChart`.

### “useEffect dùng để làm gì?”

Dùng cho side effect như gọi API và tạo timer. Trong dự án, Dashboard dùng effect để tải dữ liệu sensor định kỳ 5 giây.

### “Tại sao cần dependency array?”

Để nói cho React biết effect cần chạy lại khi dữ liệu nào thay đổi. Ví dụ đổi `dateFilter` thì phải gọi API history lại.

### “Tại sao phải cleanup timer?”

Để khi rời trang timer không tiếp tục chạy và không tạo nhiều request thừa.

### “Frontend nói chuyện với backend bằng gì?”

Thông qua Axios trong `services/api.js`, dùng HTTP REST API. MQTT chỉ được backend và ESP8266 sử dụng trực tiếp.

### “Tại sao dùng `Promise.all`?”

Dashboard cần lấy latest và ba lịch sử sensor. `Promise.all` cho phép gửi các request song song và chờ tất cả hoàn tất.

### “Filter thực hiện ở đâu?”

Filter theo thời gian được gửi xuống backend để MySQL lọc. Filter chip và search được xử lý ở frontend.

### “Tại sao dùng `key` khi map?”

React cần `key` ổn định để nhận biết từng phần tử trong danh sách và cập nhật hiệu quả.

```jsx
{rows.map((item) => (
  <tr key={item.id}>...</tr>
))}
```

### “Nếu backend tắt thì frontend ra sao?”

Các request API lỗi sẽ vào `catch`; dữ liệu hiện có trong state vẫn có thể còn trên màn hình nhưng không cập nhật được. Khi hardware/MQTT offline, backend có thể trả dữ liệu DB cũ hoặc demo tùy `DEMO_MODE`.

---

## 18. Cách trả lời khi được yêu cầu sửa trực tiếp

### “Đổi màu card nhiệt độ”

Mở `App.css`, tìm `.stat-red`, sửa `background`.

### “Đổi số bản ghi mỗi trang”

Mở `DataSensor.jsx` hoặc `ActionHistory.jsx`, sửa:

```jsx
const PAGE_SIZE = 20
```

### “Đổi chu kỳ refresh”

Tìm:

```jsx
setInterval(load, 5000)
```

Đổi `5000` thành số milliseconds khác. `10000` là 10 giây.

### “Thêm cột sensor type”

Trong page tương ứng:

1. Thêm `<th>Type</th>` trong `thead`.
2. Thêm `<td>{item.sensor_type}</td>` trong `tbody`.
3. Nếu cần CSV, thêm trường vào `header` và `csvRows`.

### “Đổi địa chỉ backend”

Sửa `frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Sau khi sửa biến Vite, thường cần restart `npm run dev`.

---

## 19. Lệnh chạy frontend

```powershell
cd D:\BTL_IOT\frontend
npm install
npm run dev
```

Build kiểm tra production:

```powershell
npm run build
```

Lint:

```powershell
npm run lint
```

Nếu PowerShell chặn `npm.ps1`, dùng:

```powershell
cmd /c npm run dev
cmd /c npm run build
```

---

## 20. Cách học nhanh trước buổi báo cáo

Đọc theo thứ tự này:

1. Đọc flow ở mục 1.
2. Mở `main.jsx` và `App.jsx`.
3. Mở `Dashboard.jsx`, hiểu 4 state chính và effect gọi API.
4. Mở `services/api.js`, đối chiếu từng hàm với endpoint backend.
5. Mở `DataSensor.jsx`, hiểu `rows → filtered → paginated → table`.
6. Mở `ActionHistory.jsx`, so sánh với DataSensor.
7. Đọc bảng tra cứu ở mục 16.
8. Tự thử sửa một màu CSS và một text JSX, sau đó chạy `npm run build`.

Không cần học thuộc mọi property CSS hoặc mọi hook React. Khi báo cáo, điều quan trọng là bạn giải thích được:

```text
Dữ liệu đi từ đâu?
Component nào nhận dữ liệu?
State nào lưu dữ liệu?
Event nào làm state thay đổi?
API nào được gọi?
File nào quyết định giao diện?
```

Đó là khung tư duy đủ để đọc và bảo vệ phần frontend của dự án.
