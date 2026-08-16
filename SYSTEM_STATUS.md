# SYSTEM STATUS - BTL_IOT

## 1) Tổng quan hiện trạng
- Frontend: React + Vite, đã triển khai 3 màn hình theo thiết kế Figma.
- Backend: FastAPI, đã có đủ API theo PROJECT_CONTEXT.md.
- Database: MySQL theo schema trong iot_humidity_light_tempurature_sensors.sql.
- MQTT: dùng HiveMQ public broker, subscribe/publish theo topic chuẩn.

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
  - API control vẫn nhận lệnh và ghi lịch sử với trạng thái success mô phỏng.
- Dùng endpoint /api/system/status để biết có đang chạy demo hay không.

## 4) Frontend features đã có
- Sidebar chuyển trang: Dashboard, Sensor Data, Device History.
- Dashboard:
  - Card cảm biến có icon nhiệt kế, giọt nước, ánh sáng.
  - Công tắc LED gửi lệnh qua API.
  - Biểu đồ nhiệt độ (react-chartjs-2).
  - Banner báo đang chạy demo mode khi MQTT offline.
- Sensor Data / Device History:
  - Search text.
  - Filter icon.
  - Lọc theo ngày.
  - Sắp xếp mới nhất/cũ nhất.

## 5) Biến môi trường
### Backend (.env)
- DB_HOST
- DB_PORT
- DB_USER
- DB_PASSWORD
- DB_NAME
- DEMO_MODE
- MQTT_BROKER
- MQTT_PORT
- MQTT_TOPIC_SENSOR
- MQTT_TOPIC_CONTROL
- MQTT_TOPIC_RESPONSE

### Frontend (.env)
- VITE_API_BASE_URL

## 6) Thư viện đã dùng thêm
- Frontend:
  - react-icons (icon nhiệt kế, giọt nước, ánh sáng, filter)
- Backend:
  - fastapi, uvicorn, mysql-connector-python, paho-mqtt, pydantic

## 7) Chạy dự án
### Backend
1. cd backend
2. (khuyến nghị) tạo virtual env
3. pip install -r requirements.txt
4. tạo file .env từ .env.example
5. uvicorn main:app --reload --host 0.0.0.0 --port 8000

### Frontend
1. cd frontend
2. npm install
3. tạo file .env từ .env.example
4. npm run dev

## 8) Gợi ý khi demo
- Chưa có phần cứng: giữ DEMO_MODE=true để trình diễn UI và luồng filter/table/chart.
- Khi có phần cứng thật:
  - set DEMO_MODE=false
  - đảm bảo ESP publish đúng JSON/topic như PROJECT_CONTEXT.md.
