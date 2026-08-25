# SYSTEM STATUS - BTL_IOT

## 1) Tổng quan hiện trạng
- Frontend: React + Vite, đã triển khai 3 màn hình theo thiết kế Figma.
- Backend: FastAPI, đã có đủ API theo PROJECT_CONTEXT.md.
- Database: MySQL theo schema trong iot_humidity_light_tempurature_sensors.sql.
- MQTT: dùng HiveMQ public broker, subscribe/publish theo topic chuẩn.
- Hardware: **ĐÃ HOẠT ĐỘNG THỰC TẾ** (cập nhật 2026-08-18).

## 2) Danh sách API và Công dụng chi tiết

Toàn bộ hệ thống hiện đang sử dụng **6 RESTful API** được xây dựng bằng FastAPI (`backend/main.py`) và kết nối qua Axios (`frontend/src/services/api.js`):

### 1. `GET /api/sensors/latest`
- **Công dụng:** Lấy giá trị đo đạc mới nhất của cả 3 cảm biến (Nhiệt độ, Độ ẩm, Cường độ ánh sáng).
- **Cơ chế hoạt động:** 
  1. Ưu tiên đọc từ cache bộ nhớ RAM nhận qua MQTT Subscription thời gian thực.
  2. Nếu cache trống, tự động truy vấn bản ghi mới nhất trong bảng MySQL `data_sensors`.
  3. Nếu CSDL trống và `DEMO_MODE=true`, trả về dữ liệu giả lập ngẫu nhiên.
- **Nơi sử dụng:** 3 thẻ Card hiển thị chỉ số cảm biến trên trang **Dashboard** (tự động cập nhật mỗi 5 giây).
- **Dữ liệu trả về:**
  ```json
  {
    "temp": 28.5,
    "humidity": 65.0,
    "light": 720,
    "measured_at": "2026-08-19T14:30:00Z"
  }
  ```

---

### 2. `GET /api/sensors/history`
- **Công dụng:** Lấy danh sách lịch sử dữ liệu cảm biến đo được theo thời gian, hỗ trợ lọc và sắp xếp.
- **Tham số Query (Query Parameters):**
  - `sensor_id` *(int, optional)*: Lọc theo ID cảm biến (1: Nhiệt độ, 2: Độ ẩm, 3: Ánh sáng).
  - `date` *(date YYYY-MM-DD, optional)*: Lọc dữ liệu theo ngày cụ thể.
  - `order` *(desc | asc, default="desc")*: Sắp xếp thời gian mới nhất hoặc cũ nhất.
  - `limit` *(int, 1-1000, default=100)*: Giới hạn số lượng bản ghi trả về.
- **Nơi sử dụng:** 
  - **Dashboard**: fetch song song 3 sensor history (sensor_id 1/2/3), dữ liệu được cache sẵn; biểu đồ dropdown chọn loại.
  - **Sensor Data**: bảng lịch sử (phân trang, lọc nâng cao theo loại cảm biến/ngày, xuất CSV).
- **Dữ liệu trả về:** Mảng các bản ghi gồm `id`, `sensor_id`, `sensor_name`, `sensor_type`, `value`, `measured_at`.

---

### 3. `POST /api/devices/control`
- **Công dụng:** Gửi lệnh điều khiển bật/tắt thiết bị ngoại vi (hệ thống đèn LED).
- **Cơ chế hoạt động:**
  1. Nhận yêu cầu trạng thái LED từ client.
  2. Ghi một bản ghi mới vào bảng `action_history` với trạng thái ban đầu là `pending`.
  3. Publish gói tin JSON điều khiển lên MQTT Topic `ptit/iot/device_control` để gửi tới ESP8266.
  4. Kích hoạt tác vụ nền (`BackgroundTasks`) hẹn giờ 10 giây: nếu sau 10s không có phản hồi `success` từ phần cứng thì tự động đổi trạng thái bản ghi thành `timeout`.
- **Request Body (JSON):**
  ```json
  {
    "led1": "on",     // "on" | "off" (Red Led)
    "led2": "off",    // "on" | "off" (Yellow Led)
    "led3": "on"      // "on" | "off" (Green Led)
  }
  ```
- **Nơi sử dụng:** Các công tắc (toggle switch) điều khiển LED trên trang **Dashboard**.

---

### 4. `GET /api/devices/status`
- **Công dụng:** Đồng bộ và lấy trạng thái hoạt động thực tế cuối cùng của từng thiết bị LED từ CSDL.
- **Cơ chế hoạt động:** Truy vấn bảng `action_history` để lấy bản ghi có `status = 'success'` mới nhất của từng thiết bị (`device_id`).
- **Nơi sử dụng:** Trang **Dashboard** khi khởi tạo (`mount`) hoặc khi người dùng tải lại trang / chuyển từ trang khác quay về, giúp các công tắc LED giữ đúng vị trí On/Off thực tế thay vì bị reset về mặc định.
- **Dữ liệu trả về:**
  ```json
  {
    "led1": true,
    "led2": false,
    "led3": true
  }
  ```

---

### 5. `GET /api/actions/history`
- **Công dụng:** Lấy danh sách lịch sử tất cả các thao tác điều khiển thiết bị đã diễn ra.
- **Tham số Query (Query Parameters):**
  - `date` *(date YYYY-MM-DD, optional)*: Lọc lịch sử theo ngày cụ thể.
  - `order` *(desc | asc, default="desc")*: Sắp xếp thời gian mới nhất hoặc cũ nhất.
  - `limit` *(int, 1-1000, default=100)*: Giới hạn số lượng bản ghi trả về.
- **Nơi sử dụng:** Bảng nhật ký điều khiển trên trang **Device History** (hiển thị badge trạng thái `success`/`timeout`/`pending`, phân trang, bộ lọc đa tiêu chí theo Status/Device/Action/Date, xuất CSV).
- **Dữ liệu trả về:** Mảng các bản ghi gồm `id`, `device_id`, `device_name`, `device_type`, `user_id`, `user_name`, `action` ("on"/"off"), `status` ("success"/"timeout"/"pending"), `created_at`.

---

### 6. `GET /api/system/status`
- **Công dụng:** Kiểm tra trạng thái kết nối hạ tầng và cấu hình vận hành của máy chủ Backend.
- **Dữ liệu trả về:**
  ```json
  {
    "mqtt_connected": true,  // Trạng thái kết nối tới MQTT Broker
    "demo_mode": false       // Cờ cấu hình chế độ chạy mô phỏng
  }
  ```
- **Nơi sử dụng:** Trang **Dashboard** để hiển thị Banner cảnh báo khi hệ thống đang chạy ở chế độ `Demo Mode` hoặc khi MQTT Broker bị ngắt kết nối.

## 3) Demo mode (không cần phần cứng)
- Cấu hình `DEMO_MODE=true` trong backend/.env.
- Khi MQTT chưa kết nối:
  - API latest/history trả dữ liệu mô phỏng để demo UI.
  - API control ghi lịch sử với status `pending`, sau 10 giây tự chuyển sang `timeout` nếu không có phản hồi phần cứng.
- Dùng endpoint /api/system/status để biết có đang chạy demo hay không.

## 4) Frontend features đã có
- Sidebar chuyển trang: Dashboard, Sensor Data, Device History.
- Dashboard:
  - Card cảm biến có icon nhiệt kế, giọt nước, ánh sáng (đơn vị light hiển thị ADC 0–1023).
  - Công tắc LED với tên tiếng Anh: Red Led (D1), Yellow Led (D2), Green Led (D3).
  - **1 biểu đồ động** với dropdown chọn loại (Temperature / Humidity / Light) ở góc trái trên — data 3 loại được fetch song song khi load, chuyển loại không cần gọi API thêm.
  - Tự động refresh dữ liệu mỗi 5 giây.
  - Đồng bộ trạng thái LED khi mount (gọi `GET /api/devices/status`) — toggle không bị reset khi chuyển trang.
  - **Toast notification:** cảnh báo slide-in top-right, tự dismiss sau 5s:
    - `"Sensor hardware not detected"` khi `mqtt_connected = false` (show 1 lần, reset khi reconnect).
    - `"[LED Name] is not responding"` sau 10.5s khi bật/tắt LED mà MQTT không kết nối (khớp backend timeout).
    - `"Failed to send command"` khi API lỗi (kèm rollback toggle UI).
  - Banner báo đang chạy demo mode khi MQTT offline.
- Sensor Data:
  - Search text, filter ngày, sắp xếp mới/cũ.
  - **Tự động refresh mỗi 5 giây.**
- Device History:
  - Search text (theo tên thiết bị, tên user), filter ngày, sắp xếp mới/cũ.
  - **Tự động refresh mỗi 5 giây.**
  - Cột Device, **Cột User** (hiển thị tên người dùng thực hiện thao tác), Cột Action (On/Off), Cột Status với badge màu (success / timeout / pending) và Cột Time.
  - Export CSV bao gồm đầy đủ cột User.

## 5) Hardware đã xác nhận hoạt động (2026-08-18)
| Thiết bị | Chân ESP8266 | Trạng thái |
|---|---|---|
| DHT11 (Nhiệt độ + Độ ẩm) | D4 | ✅ Hoạt động |
| LDR Quang trở (Ánh sáng) | A0 | ✅ Hoạt động |
| LED Đỏ (Red Led) | D1 | ✅ Hoạt động |
| LED Vàng (Yellow Led) | D2 | ✅ Hoạt động |
| LED Xanh lá (Green Led) | D3 | ✅ Hoạt động |

### Ghi chú phần cứng
- LED dùng logic **active-high**: `HIGH` = bật, `LOW` = tắt.
- LED mắc theo sơ đồ: `D1/D2/D3 → 220Ω → anode (chân dài) → cathode (chân ngắn) → GND`.
- LDR mắc: `3.3V → LDR → A0 → 10kΩ → GND` (giá trị ADC tăng khi sáng hơn).
- Giá trị LDR bão hoà ~1024 trong điều kiện phòng có đèn, phân biệt tốt sáng/tối.
- Tên thiết bị trong DB: `Red Led` (LED_RED), `Yellow Led` (LED_YELLOW), `Green Led` (LED_GREEN).

## 6) Biến môi trường
### Backend (.env)
- DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
- DEMO_MODE (true/false)
- MQTT_BROKER, MQTT_PORT
- MQTT_TOPIC_SENSOR, MQTT_TOPIC_CONTROL, MQTT_TOPIC_RESPONSE

### Frontend (.env)
- VITE_API_BASE_URL

## 7) Thư viện đã dùng
- Frontend: react-icons, react-chartjs-2
- Backend: fastapi, uvicorn, mysql-connector-python, paho-mqtt, pydantic, **python-dotenv**

## 8) Chạy dự án
### Backend
1. `cd backend`
2. `pip install -r requirements.txt`
3. Tạo/kiểm tra file `.env` (xem mục 6)
4. `uvicorn main:app --reload --host 0.0.0.0 --port 8000`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`

## 9) Gợi ý khi demo
- Chưa có phần cứng: giữ `DEMO_MODE=true` để trình diễn UI và luồng filter/table/chart.
- Khi có phần cứng thật: set `DEMO_MODE=false`, đảm bảo ESP publish đúng JSON/topic như PROJECT_CONTEXT.md.
- Trạng thái action_history: `pending` (đang chờ) → `success`/`error` (phần cứng phản hồi) hoặc `timeout` (10s không phản hồi).
