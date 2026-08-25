#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h> // Thư viện xử lý JSON

// ================= THÔNG TIN CẤU HÌNH =================
const char* ssid = "Bin 304";         // <-- ĐIỀN TÊN WIFI VÀO ĐÂY
const char* password = "0944216688";       // <-- ĐIỀN MẬT KHẨU WIFI VÀO ĐÂY

const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;

// Các Topic MQTT theo đúng PROJECT_CONTEXT.md
const char* topic_sensor = "ptit/iot/sensor_data";
const char* topic_control = "ptit/iot/device_control";
const char* topic_response = "ptit/iot/device_response";

// ================= CẤU HÌNH CHÂN CẮM (PINS) =================
#define DHTPIN D4        // Cắm chân Data của DHT11 vào chân D4 trên ESP8266
#define DHTTYPE DHT11    // Loại cảm biến là DHT11
#define LDR_PIN A0       // Quang trở BẮT BUỘC cắm vào chân A0 (Analog)

#define LED1_PIN D1      // Đèn LED 1 (Đỏ) cắm vào chân D1
#define LED2_PIN D2      // Đèn LED 2 (Vàng) cắm vào chân D2
#define LED3_PIN D5      //Led green D3
// Khởi tạo các đối tượng
DHT dht(DHTPIN, DHTTYPE);
WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastMsg = 0; // Biến đếm thời gian gửi data

// ================= HÀM KẾT NỐI WIFI =================
void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Đang kết nối WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi đã kết nối thành công!");
}

// ================= HÀM NHẬN LỆNH TỪ BACKEND/REACT =================
// Hàm này tự động chạy khi có ai đó gửi data vào topic "ptit/iot/device_control"
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Nhận được lệnh từ topic: ");
  Serial.println(topic);

  // Chuyển đổi payload (byte) thành chuỗi String
  String messageTemp;
  for (int i = 0; i < length; i++) {
    messageTemp += (char)payload[i];
  }
  
  // Phân tích chuỗi JSON nhận được (VD: {"led1": "on", "led2": "off"})
  DynamicJsonDocument doc(256);
  DeserializationError error = deserializeJson(doc, messageTemp);
  
  if (error) {
    Serial.println("Lỗi phân tích JSON!");
    return;
  }

  DynamicJsonDocument responseDoc(256); // JSON để phản hồi lại

  // Xử lý LED 1
  if (doc.containsKey("led1")) {
    String led1Status = doc["led1"].as<String>();
    if (led1Status == "on") {
      digitalWrite(LED1_PIN, HIGH); // Bật đèn
      responseDoc["led1"] = "success";
    } else if (led1Status == "off") {
      digitalWrite(LED1_PIN, LOW);  // Tắt đèn
      responseDoc["led1"] = "success";
    }
  }

  // Xử lý LED 2
  if (doc.containsKey("led2")) {
    String led2Status = doc["led2"].as<String>();
    if (led2Status == "on") {
      digitalWrite(LED2_PIN, HIGH); // Bật đèn
      responseDoc["led2"] = "success";
    } else if (led2Status == "off") {
      digitalWrite(LED2_PIN, LOW);  // Tắt đèn
      responseDoc["led2"] = "success";
    }
  }

  // Xử lý LED 3
  if (doc.containsKey("led3")) {
    String led3Status = doc["led3"].as<String>();
    if (led3Status == "on") {
      digitalWrite(LED3_PIN, HIGH); // Bật đèn
      responseDoc["led3"] = "success";
    } else if (led3Status == "off") {
      digitalWrite(LED3_PIN, LOW);  // Tắt đèn
      responseDoc["led3"] = "success";
    }
  }
  // Gửi cục JSON phản hồi (VD: {"led1":"success"}) lên Topic response
  char responseBuffer[256];
  serializeJson(responseDoc, responseBuffer);
  client.publish(topic_response, responseBuffer);
  Serial.println("Đã gửi phản hồi: " + String(responseBuffer));
}

// ================= HÀM DUY TRÌ KẾT NỐI MQTT =================
void reconnect() {
  while (!client.connected()) {
    Serial.print("Đang kết nối lại MQTT Broker...");
    // Tạo ID ngẫu nhiên cho client
    String clientId = "ESP8266Client-" + String(random(0, 1000));
    
    if (client.connect(clientId.c_str())) {
      Serial.println("Thành công!");
      // Đăng ký (Subscribe) để nghe lệnh điều khiển
      client.subscribe(topic_control);
    } else {
      Serial.print("Thất bại, lỗi rc=");
      Serial.print(client.state());
      Serial.println(" - Thử lại sau 5 giây...");
      delay(5000);
    }
  }
}

// ================= SETUP (CHẠY 1 LẦN) =================
void setup() {
  Serial.begin(115200);
  
  // Cài đặt các chân Pin
  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
  pinMode(LED3_PIN, OUTPUT);
  pinMode(LDR_PIN, INPUT);
  
  // Tắt đèn lúc mới khởi động
  digitalWrite(LED1_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);
  digitalWrite(LED3_PIN, LOW);

  dht.begin();
  setup_wifi();
  
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback); // Trỏ tới hàm lắng nghe
}

// ================= VÒNG LẶP CHÍNH =================
void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop(); // Giữ kết nối MQTT sống

  unsigned long now = millis();
  // Mỗi 5 giây (5000 ms) đọc cảm biến và gửi data 1 lần
  if (now - lastMsg > 5000) {
    lastMsg = now;

    // Đọc cảm biến
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    int lightValue = analogRead(LDR_PIN); // Đọc giá trị quang trở (0 - 1024)

    // Nếu đọc DHT lỗi thì bỏ qua vòng lặp này
    if (isnan(t) || isnan(h)) {
      Serial.println("Lỗi đọc cảm biến DHT11!");
      return;
    }

    // Đóng gói thành chuỗi JSON: {"temp": 28.5, "humidity": 70, "light": 1024}
    DynamicJsonDocument sensorDoc(256);
    sensorDoc["temp"] = t;
    sensorDoc["humidity"] = h;
    sensorDoc["light"] = lightValue;

    char msgBuffer[256];
    serializeJson(sensorDoc, msgBuffer);

    // Publish (Đẩy) lên Broker
    client.publish(topic_sensor, msgBuffer);
    
    Serial.print("Đã gửi Data: ");
    Serial.println(msgBuffer);
  }
}