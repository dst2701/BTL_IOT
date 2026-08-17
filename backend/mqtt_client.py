import json
import os
import threading
from datetime import datetime, timezone

import paho.mqtt.client as mqtt


class MQTTManager:
	def __init__(self, on_sensor_data=None, on_device_response=None):
		self.broker = os.getenv("MQTT_BROKER", "broker.hivemq.com")
		self.port = int(os.getenv("MQTT_PORT", "1883"))
		self.topic_sensor = os.getenv("MQTT_TOPIC_SENSOR", "ptit/iot/sensor_data")
		self.topic_control = os.getenv("MQTT_TOPIC_CONTROL", "ptit/iot/device_control")
		self.topic_response = os.getenv("MQTT_TOPIC_RESPONSE", "ptit/iot/device_response")

		self._on_sensor_data = on_sensor_data
		self._on_device_response = on_device_response
		self._lock = threading.Lock()
		self.is_connected = False

		self.latest_sensor_data = {
			"temp": None,
			"humidity": None,
			"light": None,
			"measured_at": None,
		}

		self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
		self.client.on_connect = self._on_connect
		self.client.on_message = self._on_message

	def _on_connect(self, client, userdata, flags, reason_code, properties):
		if reason_code == 0:
			self.is_connected = True
			client.subscribe(self.topic_sensor)
			client.subscribe(self.topic_response)
		else:
			self.is_connected = False

	def _on_message(self, client, userdata, msg):
		try:
			payload = json.loads(msg.payload.decode("utf-8"))
		except json.JSONDecodeError:
			return

		if msg.topic == self.topic_sensor:
			with self._lock:
				self.latest_sensor_data["temp"] = payload.get("temp")
				self.latest_sensor_data["humidity"] = payload.get("humidity")
				self.latest_sensor_data["light"] = payload.get("light")
				self.latest_sensor_data["measured_at"] = datetime.now(timezone.utc).isoformat()

			if self._on_sensor_data:
				self._on_sensor_data(payload)

		if msg.topic == self.topic_response and self._on_device_response:
			self._on_device_response(payload)

	def start(self):
		try:
			self.client.connect(self.broker, self.port, keepalive=60)
			self.client.loop_start()
			return True
		except Exception:
			self.is_connected = False
			return False

	def stop(self):
		try:
			self.client.loop_stop()
			self.client.disconnect()
		except Exception:
			pass

	def publish_control(self, command_payload):
		if not self.is_connected:
			return False

		payload = json.dumps(command_payload)
		result = self.client.publish(self.topic_control, payload)
		return result.rc == mqtt.MQTT_ERR_SUCCESS
