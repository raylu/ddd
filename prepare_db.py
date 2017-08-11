#!/usr/bin/env python3

import csv
from collections import defaultdict
import datetime
import lzma
import os
from os import path
import sqlite3

def main():
	conn = prepare_db()

	with conn:
		conn.executemany('INSERT INTO channels (channel_id, name) VALUES(?, ?)',
				iter_channels('raw/channels.csv'))
		conn.executemany('INSERT INTO users (user_id, name) VALUES(?, ?)',
				iter_users('raw/users.csv'))

	counts = defaultdict(lambda: defaultdict(lambda: defaultdict(int))) # [channel][user][hour]
	for row in iter_rows('raw/messages.csv.xz'):
		channel_id = int(row['channel_id'])
		user_id = int(row['user_id'])
		dt = snowflake_dt(int(row['message_id']))
		hour = dt.replace(minute=0, second=0).timestamp()
		counts[channel_id][user_id][hour] += 1

	with conn:
		conn.executemany('INSERT INTO messages (channel_id, user_id, hour, count) VALUES(?, ?, ?, ?)',
				iter_counts(counts))

def prepare_db():
	if path.exists('ddd.db'):
		print('deleting ddd.db')
		os.unlink('ddd.db')
	conn = sqlite3.connect('ddd.db')
	with conn:
		conn.execute('''
			CREATE TABLE channels (
				channel_id INTEGER PRIMARY KEY,
				name TEXT
			)
		''')
		conn.execute('''
			CREATE TABLE users (
				user_id INTEGER PRIMARY KEY,
				name TEXT
			)
		''')
		conn.execute('''
			CREATE TABLE messages (
				channel_id INTEGER,
				user_id INTEGER,
				hour INTEGER,
				count INTEGER
			)
		''')
		conn.execute('''
			CREATE UNIQUE INDEX channel_user_hour ON messages
			(channel_id, user_id, hour)
		''')

	return conn

def iter_channels(channels_path):
	with open(channels_path, 'r') as f:
		reader = csv.DictReader(f)
		for row in reader:
			channel_id = int(row['channel_id'])
			yield (channel_id, row['name'])

def iter_users(users_path):
	with open(users_path, 'r') as f:
		reader = csv.DictReader(f)
		for row in reader:
			user_id = int(row['user_id'])
			yield (user_id, row['name'])

def iter_rows(messages_xz_path):
	with lzma.open(messages_xz_path, 'rt', encoding='utf-8') as f:
		reader = csv.DictReader(f)
		for i, row in enumerate(reader):
			yield row
			if (i + 1) % 10000 == 0:
				print('processed', i+1, 'messages')

def iter_counts(counts):
	for channel_id, user_counts in counts.items():
		for user_id, hour_counts in user_counts.items():
			for hour, count in hour_counts.items():
				yield (channel_id, user_id, hour, count)

DISCORD_EPOCH = 1420070400000
def snowflake_dt(snowflake):
	''' twitter snowflake to datetime '''
	unix_timestamp = ((snowflake >> 22) + DISCORD_EPOCH) // 1000
	return datetime.datetime.utcfromtimestamp(unix_timestamp)

if __name__ == '__main__':
	main()
