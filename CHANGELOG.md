# CHANGELOG - BTL_IOT

---

## [2026-08-18 18:4x] — Export CSV + Pagination + Filter panel

### Frontend [`frontend/src/pages/DataSensor.jsx`]
- **Export CSV:** Nút "Export CSV" tải về file `sensor_data_YYYY-MM-DD.csv` với toàn bộ dữ liệu đang filter (không chỉ trang hiện tại).
- **Phân trang:** 20 dòng/trang, nút Prev/Next, số trang có ellipsis (`…`), reset về trang 1 khi đổi bất kỳ filter nào.
- **Filter panel (icon 🔍):** Bấm icon để toggle panel — lọc theo loại cảm biến: All / Temperature / Humidity / Light (dùng field `sensor_type` từ API).
- Tăng `limit` fetch từ 200 → 500 để phân trang có đủ dữ liệu.

### Frontend [`frontend/src/pages/ActionHistory.jsx`]
- **Export CSV:** Nút "Export CSV" tải về file `device_history_YYYY-MM-DD.csv`.
- **Phân trang:** 20 dòng/trang, same logic như DataSensor.
- **Filter panel (icon 🔍):** Toggle panel với 3 nhóm chip filter:
  - **Status:** All / Success / Timeout / Pending
  - **Action:** All / On / Off
  - **Device:** All / Red Led (LED_RED) / Yellow Led (LED_YELLOW) / Green Led (LED_GREEN)
- Tăng `limit` fetch từ 200 → 500.

### Frontend [`frontend/src/App.css`]
- `.filter-box`: thêm `cursor: pointer`, `border: none`, transition — nay là `<button>` thật sự.
- `.filter-box-active`: highlight xanh `#4f7eff` khi panel đang mở.
- `.filter-panel`, `.filter-panel-row`, `.filter-panel-label`: layout filter dropdown.
- `.filter-chip`, `.filter-chip-active`: pill button lọc.
- `.pagination`, `.page-btn`, `.page-btn-active`, `.page-ellipsis`: điều hướng trang.
- `.table-info`: text hiển thị tổng số record và trang hiện tại.

---

## [2026-08-18 18:xx] — Bug fixes: LED state sync + Green Led DB

### Bug: LED toggle reset khi chuyển trang
- **Nguyên nhân:** `ledState` trong React reset về `false` mỗi lần Dashboard unmount/mount lại.
- **Fix Backend:** Thêm endpoint `GET /api/devices/status` — trả trạng thái LED cuối cùng từ `action_history` (action có `status='success'` mới nhất của mỗi thiết bị).
- **Fix Frontend:** Dashboard gọi `fetchDeviceStatus()` khi mount → merge vào `ledState` → toggle hiển thị đúng dù chuyển trang.
- **Files:** `backend/main.py`, `frontend/src/services/api.js`, `frontend/src/pages/Dashboard.jsx`

### Bug: Green Led không ghi action_history, không giữ trạng thái
- **Nguyên nhân thực:** `DEVICE_KEY_MAP` dùng `"led3": "GREEN_LED"` nhưng DB thực tế lưu type là `"LED_GREEN"` (cùng quy tắc với LED_RED, LED_YELLOW). Mismatch này khiến `_find_device_id()` không tìm thấy device → bỏ qua ghi log.
- **Fix:** Sửa `DEVICE_KEY_MAP["led3"]` từ `"GREEN_LED"` → `"LED_GREEN"` trong `backend/main.py`.
- **Files:** `backend/main.py`, `THEM_BOT_DEN.md`, `SYSTEM_STATUS.md`

---

## [2026-08-18] — Hoàn thiện hardware + LED3 + 3 biểu đồ

### Hardware
- Xác nhận toàn bộ phần cứng hoạt động thực tế: DHT11 (D4), LDR (A0), LED Đỏ (D1), LED Vàng (D2)
- Thêm LED Xanh lá (Green Led) vào chân D3

### Arduino [`arduino_ide.cpp`]
- Thêm `#define LED3_PIN D3`
- Thêm `pinMode(LED3_PIN, OUTPUT)` và `digitalWrite(LED3_PIN, LOW)` vào `setup()`
- Thêm block xử lý `led3` trong hàm `callback()`

### Database (MySQL)
- Đổi tên thiết bị trong bảng `devices`: "Đèn LED Đỏ" → "Red Led", "Đèn LED Vàng" → "Yellow Led"
- Thêm record: `Green Led`, type `GREEN_LED`

### Backend [`backend/main.py`]
- Thêm `led3: Literal["on","off"] | None = None` vào `DeviceControlRequest`
- Thêm `"led3": "GREEN_LED"` vào `DEVICE_KEY_MAP`
- Thêm xử lý `payload.led3` trong `control_devices()`
- Thêm `load_dotenv()` để đọc file `.env` (fix lỗi DB_PASSWORD không được load)
- Thêm cơ chế **timeout 10 giây**: nếu phần cứng không phản hồi → status chuyển `pending` → `timeout`
- Bỏ auto-success trong DEMO_MODE

### Backend [`backend/requirements.txt`]
- Thêm `python-dotenv==1.0.1`

### Frontend [`frontend/src/components/SensorChart.jsx`]
- Thêm prop `title` (hiển thị tiêu đề biểu đồ động thay vì hardcode "Temperature")
- Thêm prop `color` (màu đường biểu đồ)

### Frontend [`frontend/src/pages/Dashboard.jsx`]
- Thêm `LED_LABELS` map: `led1→"Red Led"`, `led2→"Yellow Led"`, `led3→"Green Led"`
- Cập nhật toggle card hiển thị tên tiếng Anh thay vì key kỹ thuật
- Thêm `led3: false` vào `ledState`
- Thêm `led3` vào whitelist `handleToggle()` → gửi lệnh MQTT thực
- **Thêm 2 biểu đồ mới**: Humidity (màu xanh ngọc `#4ecdc4`) và Light (màu vàng `#ffd93d`)
- Fetch song song 3 sensor history (sensor_id 1, 2, 3) trong cùng `Promise.all`
- Biểu đồ Temperature đổi màu sang đỏ `#ff6b6b`

### Frontend [`frontend/src/pages/DataSensor.jsx`]
- Thêm `setInterval(load, 5000)` → auto-refresh mỗi 5 giây

### Frontend [`frontend/src/pages/ActionHistory.jsx`]
- Thêm `setInterval(load, 5000)` → auto-refresh mỗi 5 giây
- Thêm cột **Action** (On/Off)
- Cột **Status** hiển thị badge màu: `success` (xanh lá) / `timeout` (cam) / `pending` (xám)

### Frontend [`frontend/src/App.css`]
- Thêm CSS cho `.status-badge`, `.status-success`, `.status-timeout`, `.status-pending`

### Tài liệu
- Tạo [`THEM_BOT_DEN.md`](file:///d:/BTL_IOT/THEM_BOT_DEN.md): hướng dẫn thêm/bớt LED qua tất cả các layer
- Cập nhật [`SYSTEM_STATUS.md`](file:///d:/BTL_IOT/SYSTEM_STATUS.md): trạng thái hardware, tính năng mới

---

## [2026-08-15] — Khởi tạo dự án

- Khởi tạo backend FastAPI với đầy đủ API (sensors, devices, actions, system status)
- Khởi tạo frontend React + Vite với 3 màn hình: Dashboard, Sensor Data, Device History
- Tích hợp MySQL, MQTT (HiveMQ public broker)
- DEMO_MODE: trả dữ liệu mô phỏng khi chưa có phần cứng
- Code Arduino ESP8266: đọc DHT11, LDR, điều khiển LED qua MQTT
