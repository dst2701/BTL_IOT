# SYSTEM STATUS - BTL_IOT

## 1) Tổng quan hiện trạng
- Frontend: React + Vite, đã triển khai 3 màn hình theo thiết kế Figma.
- Backend: FastAPI, đã có đủ API theo PROJECT_CONTEXT.md.
- Database: MySQL theo schema trong iot_humidity_light_tempurature_sensors.sql.
- MQTT: dùng HiveMQ public broker, subscribe/publish theo topic chuẩn.
- Hardware: **ĐÃ HOẠT ĐỘNG THỰC TẾ** (cập nhật 2026-08-18).

## 2) API hiện có
- GET /api/sensors/latest
- GET /api/sensors/history?sensor_id=&date=&order=&limit=
- POST /api/devices/control
- GET /api/actions/history?date=&order=&limit=
- GET /api/system/status

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
  - Công tắc LED gửi lệnh qua API (led1, led2 thực tế; led3 chỉ là UI demo).
  - Biểu đồ nhiệt độ (react-chartjs-2).
  - Tự động refresh dữ liệu mỗi 5 giây.
  - Banner báo đang chạy demo mode khi MQTT offline.
- Sensor Data:
  - Search text, filter ngày, sắp xếp mới/cũ.
  - **Tự động refresh mỗi 5 giây.**
- Device History:
  - Search text, filter ngày, sắp xếp mới/cũ.
  - **Tự động refresh mỗi 5 giây.**
  - Cột Action (On/Off) và badge màu cho Status: success (xanh) / timeout (cam) / pending (xám).

## 5) Hardware đã xác nhận hoạt động (2026-08-18)
| Thiết bị | Chân ESP8266 | Trạng thái |
|---|---|---|
| DHT11 (Nhiệt độ + Độ ẩm) | D4 | ✅ Hoạt động |
| LDR Quang trở (Ánh sáng) | A0 | ✅ Hoạt động |
| LED Đỏ (Red Led) | D1 | ✅ Hoạt động |
| LED Vàng (Yellow Led) | D2 | ✅ Hoạt động |

### Ghi chú phần cứng
- LED dùng logic **active-high**: `HIGH` = bật, `LOW` = tắt.
- LED mắc theo sơ đồ: `D1/D2 → 220Ω → anode (chân dài) → cathode (chân ngắn) → GND`.
- LDR mắc: `3.3V → LDR → A0 → 10kΩ → GND` (giá trị ADC tăng khi sáng hơn).
- Giá trị LDR bão hoà ~1024 trong điều kiện phòng có đèn, phân biệt tốt sáng/tối.
- Tên thiết bị trong DB: `Red Led` (LED_RED) và `Yellow Led` (LED_YELLOW).

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
