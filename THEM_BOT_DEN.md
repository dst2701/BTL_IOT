# HƯỚNG DẪN THÊM / BỚT ĐÈN LED

Hệ thống có kiến trúc 4 lớp: **Hardware → Arduino → Backend → Frontend**.
Khi thêm hoặc bớt LED, cần tác động đúng thứ tự từng lớp.

---

## THÊM LED MỚI (ví dụ: thêm LED xanh lá vào chân D3)

### Bước 1 — Hardware
- Cắm LED vào breadboard theo sơ đồ:
  ```
  D3 (ESP) → 220Ω → anode (chân dài) → cathode (chân ngắn) → GND
  ```

---

### Bước 2 — Arduino [`arduino_ide.cpp`](file:///d:/BTL_IOT/arduino_ide.cpp)

**2a. Khai báo chân:**
```cpp
// Thêm dòng này vào phần CẤU HÌNH CHÂN CẮM
#define LED3_PIN D3   // Đèn LED 3 (Xanh lá) cắm vào chân D3
```

**2b. Khởi tạo trong `setup()`:**
```cpp
pinMode(LED3_PIN, OUTPUT);
digitalWrite(LED3_PIN, LOW);  // Tắt mặc định khi khởi động
```

**2c. Xử lý lệnh trong `callback()`:**
```cpp
// Thêm block xử lý LED 3 (sau block LED 2)
if (doc.containsKey("led3")) {
  String led3Status = doc["led3"].as<String>();
  if (led3Status == "on") {
    digitalWrite(LED3_PIN, HIGH);
    responseDoc["led3"] = "success";
  } else if (led3Status == "off") {
    digitalWrite(LED3_PIN, LOW);
    responseDoc["led3"] = "success";
  }
}
```

> ⚠️ Sau khi sửa xong, **nạp lại code vào ESP8266** qua Arduino IDE (Ctrl+U).

---

### Bước 3 — Database (MySQL) ⚠️ BẮT BUỘC

> **Nếu bỏ qua bước này:** LED vẫn sáng/tắt được thực tế, nhưng backend sẽ **không ghi lịch sử** vào `action_history` vì không tìm thấy `device_id`. Trang Device History sẽ không có dòng nào cho LED mới.

Backend tra cứu đèn bằng `SELECT id FROM devices WHERE type = 'LED_GREEN'`. Nếu không có row → bỏ qua hoàn toàn.

> **⚠️ Lưu ý:** File `.sql` trong project chỉ là **bản dump cũ**, không tự cập nhật khi bạn chạy SQL thủ công. Hãy **xác nhận INSERT đã được thực thi thành công** bằng cách chạy:
> ```sql
> SELECT * FROM devices;
> ```
> Nếu không thấy Green Led trong kết quả, INSERT chưa được thực hiện.

Chạy lệnh SQL để thêm thiết bị mới:
```sql
INSERT INTO devices (name, type) VALUES ('Green Led', 'LED_GREEN');
```

---

### Bước 4 — Backend [`backend/main.py`](file:///d:/BTL_IOT/backend/main.py)

**4a. Thêm vào Pydantic model** (khoảng dòng 15): ⚠️ **HAY BỊ BỎ QUA NHẤT**

> **Nếu quên bước này:** backend sẽ báo lỗi ngay khi bấm công tắc:
> ```
> AttributeError: 'DeviceControlRequest' object has no attribute 'led3'
> ```
> Lỗi này xảy ra vì `control_devices()` đã xử lý `payload.led3` nhưng model chưa khai báo field đó.

```python
class DeviceControlRequest(BaseModel):
    led1: Literal["on", "off"] | None = None
    led2: Literal["on", "off"] | None = None
    led3: Literal["on", "off"] | None = None  # ← thêm dòng này
```

**4b. Thêm vào `DEVICE_KEY_MAP`** (khoảng dòng 35):
```python
DEVICE_KEY_MAP = {
    "led1": "LED_RED",
    "led2": "LED_YELLOW",
    "led3": "LED_GREEN",   # ← thêm dòng này
}
```

**4c. Thêm vào hàm `control_devices()`** (khoảng dòng 260):
```python
if payload.led3 is not None:
    command["led3"] = payload.led3
```

> Backend tự reload nếu đang dùng `--reload`. Nếu không, restart lại.

---

### Bước 5 — Frontend [`frontend/src/pages/Dashboard.jsx`](file:///d:/BTL_IOT/frontend/src/pages/Dashboard.jsx)

**5a. Thêm vào state ban đầu** (dòng 14):
```js
const [ledState, setLedState] = useState({ led1: false, led2: false, led3: false })
//                                                                    ↑ thêm led3
```

**5b. Thêm vào whitelist gửi lệnh thực** trong `handleToggle()` (dòng 85):
```js
if (!['led1', 'led2', 'led3'].includes(key)) {
//                    ↑ thêm 'led3' vào mảng này
```

> Frontend tự hot-reload, không cần restart.

---

## BỚT LED (ví dụ: bỏ LED2)

Làm **ngược lại** các bước trên:

| Bước | File | Việc làm |
|---|---|---|
| Hardware | — | Rút dây LED2 ra khỏi breadboard |
| Arduino | `arduino_ide.cpp` | Xóa `#define LED2_PIN`, `pinMode`, `digitalWrite`, và block `if (doc.containsKey("led2"))` |
| Database | MySQL | `DELETE FROM devices WHERE type = 'LED_YELLOW';` *(cẩn thận: xóa cả action_history liên quan)* |
| Backend | `main.py` | Xóa `led2` khỏi model, `DEVICE_KEY_MAP`, và `control_devices()` |
| Frontend | `Dashboard.jsx` | Xóa `led2` khỏi `useState` và whitelist |

> ⚠️ **Không xóa device trong DB nếu còn action_history tham chiếu tới** — sẽ gây lỗi foreign key. Xóa lịch sử trước hoặc dùng `ON DELETE CASCADE` đã có sẵn trong schema.

---

## BẢNG TÓM TẮT

| Layer | File | Việc cần làm khi THÊM |
|---|---|---|
| **Hardware** | — | Cắm LED vào chân Dx |
| **Arduino** | `arduino_ide.cpp` | Khai báo pin, `pinMode`, `digitalWrite`, xử lý JSON callback |
| **Database** | MySQL | `INSERT INTO devices` với tên và type mới |
| **Backend** | `backend/main.py` | Thêm field Pydantic, thêm vào `DEVICE_KEY_MAP`, thêm vào `control_devices()` |
| **MQTT** | `backend/mqtt_client.py` | ✅ **Không cần sửa** — publish/subscribe theo topic cố định, không phụ thuộc số lượng LED |
| **Frontend** | `Dashboard.jsx` | Thêm vào `useState`, thêm vào whitelist `handleToggle()` |

---

## LƯU Ý QUAN TRỌNG

- **`type` trong DB phải khớp với giá trị trong `DEVICE_KEY_MAP`** — đây là cầu nối duy nhất giữa backend và DB.
- **Tên (`name`)** trong DB chỉ dùng để hiển thị UI — đổi thoải mái bằng `UPDATE devices SET name = ...`.
- **`key` trong frontend** (`led1`, `led2`, ...) phải khớp với **key trong JSON MQTT** và **tên field trong Pydantic model**.
- Sau khi sửa Arduino → bắt buộc **nạp lại firmware** (Ctrl+U trong Arduino IDE).
- Backend với `--reload` tự restart; nếu không dùng `--reload` thì phải restart thủ công.
