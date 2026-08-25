# DỰ ÁN IOT GIÁM SÁT MÔI TRƯỜNG & ĐIỀU KHIỂN THIẾT BỊ

## 1. Kiến trúc hệ thống (Tech Stack)
- **Hardware:** ESP8266 NodeMCU, DHT11 (Temp/Humid), LDR (Light), LED (Output).
- **Protocol:** MQTT (HiveMQ Public Broker: `broker.hivemq.com`, Port: `1883`).
- **Backend:** Python (FastAPI) + RESTful API.
- **Frontend:** React.js (Vite) + Axios (để gọi API) + React-Chartjs-2 (Vẽ biểu đồ).
- **Database:** MySQL.

## 2. Cấu trúc Database (MySQL)
Sử dụng 5 bảng:
1. `users`: id, username, password.
2. `sensors`: id, name, type.
3. `devices`: id, name, type.
4. `data_sensors`: id, sensor_id, value, measured_at.
5. `action_history`: id, device_id, user_id, action, status, created_at.

## 3. Quy chuẩn Giao tiếp MQTT
- **Topic nhận dữ liệu cảm biến:** `ptit/iot/sensor_data` 
  - (JSON: `{"temp": float, "humidity": float, "light": int}`)
- **Topic gửi lệnh điều khiển:** `ptit/iot/device_control` 
  - (JSON: `{"led1": "on"/"off", "led2": "on"/"off"}`)
- **Topic nhận phản hồi thiết bị:** `ptit/iot/device_response` 
  - (JSON: `{"led1": "success"/"error", "led2": "success"/"error"}`)

## 4. Quy chuẩn RESTful API (Backend Python)
- `GET /api/sensors/latest`: Lấy giá trị mới nhất của 3 cảm biến.
- `GET /api/sensors/history?sensor_id=1&date=...`: Lấy dữ liệu lịch sử có filter.
- `POST /api/devices/control`: Gửi lệnh điều khiển thiết bị (lưu DB rồi bắn MQTT).
- `GET /api/actions/history`: Lấy lịch sử điều khiển.

## 5. Cấu trúc Dự án (Project Structure)
AI khi nhận yêu cầu sửa đổi, hãy ưu tiên tìm/tạo file theo đúng cấu trúc dưới đây:
```text
BTL_IOT/
├── PROJECT_CONTEXT.md      (File gốc quy định luật)
│
├── backend/                (Khu vực API & MQTT)
│   ├── main.py             (Khởi chạy FastAPI, cấu hình CORS, định nghĩa endpoints)
│   ├── database.py         (Kết nối MySQL bằng mysql-connector-python)
│   └── mqtt_client.py      (Sử dụng paho-mqtt xử lý publish/subscribe)
│
└── frontend/               (Khu vực Giao diện)
    └── src/
        ├── App.jsx         (Router chính)
        ├── main.jsx        (Khởi tạo React)
        ├── components/     (Các thẻ tái sử dụng như SensorChart, Sidebar)
        └── pages/          (Các màn hình chính)
            ├── Dashboard.jsx     (Màn 1: Biểu đồ & Nút bấm)
            ├── DataSensor.jsx    (Màn 2: Bảng lịch sử cảm biến & Filter)
            └── ActionHistory.jsx (Màn 3: Bảng lịch sử thao tác)

    ## 6. Ghi chú triển khai hiện tại (2026-08-16)
    - Backend đã có các API theo mục 4 và đã tích hợp MySQL + MQTT.
    - Có `DEMO_MODE=true` để chạy demo khi chưa có phần cứng/MQTT; hệ thống trả dữ liệu mô phỏng cho giao diện.
    - Frontend đã có 3 route/màn hình theo Figma: Dashboard, Sensor Data, Device History.
    - Trang Data Sensor và Device History đã có filter theo ngày (`date`) và sắp xếp mới/cũ (`order=desc|asc`).
    - Có thêm endpoint kiểm tra trạng thái hệ thống: `GET /api/system/status`.
    - Chi tiết kỹ thuật và hướng dẫn chạy được ghi trong file `SYSTEM_STATUS.md`.