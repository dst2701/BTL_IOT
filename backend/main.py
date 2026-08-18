import os
import random
import time
from datetime import date, datetime, timedelta
from typing import Literal

from dotenv import load_dotenv

load_dotenv()

from fastapi import BackgroundTasks, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import execute, fetch_all, fetch_one
from mqtt_client import MQTTManager


class DeviceControlRequest(BaseModel):
	led1: Literal["on", "off"] | None = None
	led2: Literal["on", "off"] | None = None


app = FastAPI(title="BTL IoT API")

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_methods=["*"],
	allow_headers=["*"],
)

SENSOR_TYPE_MAP = {
	"temp": "DHT11_Temp",
	"humidity": "DHT11_Humid",
	"light": "LDR_Light",
}

DEVICE_KEY_MAP = {
	"led1": "LED_RED",
	"led2": "LED_YELLOW",
}

DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() in ("1", "true", "yes")

_mock_latest = {
	"temp": 28.3,
	"humidity": 52.4,
	"light": 630,
	"measured_at": datetime.utcnow().isoformat(),
}


def _find_sensor_id(sensor_type):
	row = fetch_one("SELECT id FROM sensors WHERE type = %s", (sensor_type,))
	return row["id"] if row else None


def _find_device_id(device_type):
	row = fetch_one("SELECT id FROM devices WHERE type = %s", (device_type,))
	return row["id"] if row else None


def save_sensor_data(sensor_payload):
	for payload_key, sensor_type in SENSOR_TYPE_MAP.items():
		if payload_key not in sensor_payload:
			continue

		sensor_id = _find_sensor_id(sensor_type)
		if sensor_id is None:
			continue

		execute(
			"INSERT INTO data_sensors (sensor_id, value) VALUES (%s, %s)",
			(sensor_id, sensor_payload[payload_key]),
		)


def update_action_status(response_payload):
	for led_key, result in response_payload.items():
		device_type = DEVICE_KEY_MAP.get(led_key)
		if not device_type:
			continue

		device_id = _find_device_id(device_type)
		if device_id is None:
			continue

		action_row = fetch_one(
			"""
			SELECT id
			FROM action_history
			WHERE device_id = %s
			  AND status = 'pending'
			ORDER BY created_at DESC
			LIMIT 1
			""",
			(device_id,),
		)

		if action_row:
			execute(
				"UPDATE action_history SET status = %s WHERE id = %s",
				(result, action_row["id"]),
			)


def _get_mock_latest():
	_mock_latest["temp"] = round(max(20.0, min(40.0, _mock_latest["temp"] + random.uniform(-0.6, 0.8))), 1)
	_mock_latest["humidity"] = round(
		max(35.0, min(80.0, _mock_latest["humidity"] + random.uniform(-1.4, 1.6))),
		1,
	)
	_mock_latest["light"] = int(max(100, min(1024, _mock_latest["light"] + random.randint(-60, 70))))
	_mock_latest["measured_at"] = datetime.utcnow().isoformat()
	return dict(_mock_latest)


def _build_mock_sensor_history(limit, sensor_id, day, order):
	sensors = [
		(1, "Temperature Sensor", "DHT11_Temp", 25.0, 34.0),
		(2, "Humidity Sensor", "DHT11_Humid", 40.0, 72.0),
		(3, "Light Sensor", "LDR_Light", 180.0, 960.0),
	]
	if sensor_id is not None:
		sensors = [item for item in sensors if item[0] == sensor_id]

	base_time = datetime.combine(day, datetime.min.time()) if day else datetime.utcnow()
	rows = []
	row_id = 1
	for hour_step in range(max(1, limit)):
		for sensor in sensors:
			sensor_value = round(random.uniform(sensor[3], sensor[4]), 1)
			rows.append(
				{
					"id": row_id,
					"sensor_id": sensor[0],
					"sensor_name": sensor[1],
					"sensor_type": sensor[2],
					"value": sensor_value,
					"measured_at": (base_time - timedelta(minutes=15 * hour_step)).isoformat(),
				}
			)
			row_id += 1

	rows.sort(key=lambda item: item["measured_at"], reverse=(order == "desc"))
	return rows[:limit]


def _build_mock_action_history(limit, day, order):
	devices = [(1, "Led1", "LED_RED"), (2, "Led2", "LED_YELLOW")]
	base_time = datetime.combine(day, datetime.min.time()) if day else datetime.utcnow()
	rows = []
	for idx in range(1, limit + 1):
		device = devices[idx % 2]
		rows.append(
			{
				"id": idx,
				"device_id": device[0],
				"device_name": device[1],
				"device_type": device[2],
				"action": "on" if idx % 2 == 0 else "off",
				"status": "success",
				"created_at": (base_time - timedelta(minutes=10 * idx)).isoformat(),
			}
		)

	rows.sort(key=lambda item: item["created_at"], reverse=(order == "desc"))
	return rows


mqtt_manager = MQTTManager(
	on_sensor_data=save_sensor_data,
	on_device_response=update_action_status,
)


@app.on_event("startup")
def startup_event():
	app.state.mqtt_connected = mqtt_manager.start()


@app.on_event("shutdown")
def shutdown_event():
	mqtt_manager.stop()


@app.get("/api/sensors/latest")
def get_latest_sensors():
	latest = dict(mqtt_manager.latest_sensor_data)

	# Fallback to DB values when MQTT cache is empty.
	for payload_key, sensor_type in SENSOR_TYPE_MAP.items():
		if latest.get(payload_key) is not None:
			continue

		sensor_row = fetch_one("SELECT id FROM sensors WHERE type = %s", (sensor_type,))
		if not sensor_row:
			continue

		data_row = fetch_one(
			"""
			SELECT value, measured_at
			FROM data_sensors
			WHERE sensor_id = %s
			ORDER BY measured_at DESC
			LIMIT 1
			""",
			(sensor_row["id"],),
		)

		if data_row:
			latest[payload_key] = data_row["value"]
			if latest.get("measured_at") is None:
				latest["measured_at"] = data_row["measured_at"]

	if all(latest.get(key) is None for key in ("temp", "humidity", "light")) and DEMO_MODE:
		return _get_mock_latest()

	return latest


@app.get("/api/sensors/history")
def get_sensor_history(
	sensor_id: int | None = Query(default=None),
	day: date | None = Query(default=None, alias="date"),
	order: Literal["desc", "asc"] = Query(default="desc"),
	limit: int = Query(default=100, ge=1, le=1000),
):
	query = """
		SELECT ds.id, ds.sensor_id, s.name AS sensor_name, s.type AS sensor_type,
			   ds.value, ds.measured_at
		FROM data_sensors ds
		JOIN sensors s ON s.id = ds.sensor_id
		WHERE 1 = 1
	"""
	params = []

	if sensor_id is not None:
		query += " AND ds.sensor_id = %s"
		params.append(sensor_id)

	if day is not None:
		query += " AND DATE(ds.measured_at) = %s"
		params.append(day)

	query += f" ORDER BY ds.measured_at {'DESC' if order == 'desc' else 'ASC'} LIMIT %s"
	params.append(limit)

	rows = fetch_all(query, tuple(params))
	if rows:
		return rows

	if DEMO_MODE:
		return _build_mock_sensor_history(limit, sensor_id, day, order)

	return []


def _timeout_pending_action(action_id: int, delay: int = 10):
	"""Chạy ngầm: sau `delay` giây, nếu record vẫn còn 'pending' thì chuyển sang 'timeout'."""
	time.sleep(delay)
	row = fetch_one("SELECT status FROM action_history WHERE id = %s", (action_id,))
	if row and row["status"] == "pending":
		execute(
			"UPDATE action_history SET status = %s WHERE id = %s",
			("timeout", action_id),
		)


@app.post("/api/devices/control")
def control_devices(payload: DeviceControlRequest, background_tasks: BackgroundTasks):
	command = {}
	if payload.led1 is not None:
		command["led1"] = payload.led1
	if payload.led2 is not None:
		command["led2"] = payload.led2

	if not command:
		raise HTTPException(status_code=400, detail="At least one LED state is required")

	# Ghi DB và lưu lại action_id để đặt timeout
	for led_key, action in command.items():
		device_type = DEVICE_KEY_MAP.get(led_key)
		device_id = _find_device_id(device_type)
		if device_id is None:
			continue

		action_id = execute(
			"INSERT INTO action_history (device_id, action, status) VALUES (%s, %s, %s)",
			(device_id, action, "pending"),
		)
		# Sau 10 giây, nếu phần cứng không phản hồi thì chuyển sang 'timeout'
		background_tasks.add_task(_timeout_pending_action, action_id)

	published = mqtt_manager.publish_control(command)
	if not published and not DEMO_MODE:
		raise HTTPException(status_code=500, detail="Failed to publish control command")

	return {
		"message": "Control command published" if published else "Demo mode: command simulated (waiting for device)",
		"command": command,
		"mqtt_connected": mqtt_manager.is_connected,
		"demo_mode": DEMO_MODE,
	}


@app.get("/api/actions/history")
def get_action_history(
	day: date | None = Query(default=None, alias="date"),
	order: Literal["desc", "asc"] = Query(default="desc"),
	limit: int = Query(default=100, ge=1, le=1000),
):
	query = """
		SELECT ah.id, ah.device_id, d.name AS device_name, d.type AS device_type,
			   ah.action, ah.status, ah.created_at
		FROM action_history ah
		JOIN devices d ON d.id = ah.device_id
		WHERE 1 = 1
	"""
	params = []

	if day is not None:
		query += " AND DATE(ah.created_at) = %s"
		params.append(day)

	query += f" ORDER BY ah.created_at {'DESC' if order == 'desc' else 'ASC'} LIMIT %s"
	params.append(limit)

	rows = fetch_all(query, tuple(params))
	if rows:
		return rows

	if DEMO_MODE:
		return _build_mock_action_history(limit, day, order)

	return []


@app.get("/api/system/status")
def system_status():
	return {
		"mqtt_connected": mqtt_manager.is_connected,
		"demo_mode": DEMO_MODE,
	}
