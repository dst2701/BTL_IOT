import os
from contextlib import contextmanager

from dotenv import load_dotenv

load_dotenv()

import mysql.connector
from mysql.connector import pooling


_pool = None


def _get_pool():
	global _pool
	if _pool is None:
		_pool = pooling.MySQLConnectionPool(
			pool_name="iot_pool",
			pool_size=5,
			host=os.getenv("DB_HOST", "127.0.0.1"),
			port=int(os.getenv("DB_PORT", "3306")),
			user=os.getenv("DB_USER", "root"),
			password=os.getenv("DB_PASSWORD", ""),
			database=os.getenv("DB_NAME", "iot_project"),
		)
	return _pool


@contextmanager
def get_db_cursor(dictionary=False):
	connection = _get_pool().get_connection()
	cursor = connection.cursor(dictionary=dictionary)
	try:
		yield connection, cursor
		connection.commit()
	except Exception:
		connection.rollback()
		raise
	finally:
		cursor.close()
		connection.close()


def fetch_all(query, params=None):
	with get_db_cursor(dictionary=True) as (_, cursor):
		cursor.execute(query, params or ())
		return cursor.fetchall()


def fetch_one(query, params=None):
	with get_db_cursor(dictionary=True) as (_, cursor):
		cursor.execute(query, params or ())
		return cursor.fetchone()


def execute(query, params=None):
	with get_db_cursor() as (_, cursor):
		cursor.execute(query, params or ())
		return cursor.lastrowid
