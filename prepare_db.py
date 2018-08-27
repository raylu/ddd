#!/usr/bin/env python3

import csv
from collections import defaultdict
import datetime
import lzma
import os
from os import path
import sqlite3
import sys

def main():
	verbose = True
	if len(sys.argv) == 2 and sys.argv[1] == '-q':
		verbose = False
	conn = prepare_db(verbose)

	with conn:
		conn.executemany('INSERT INTO channels (channel_id, name) VALUES(?, ?)',
				iter_channels('raw/channels.csv'))
		conn.executemany('INSERT INTO users (int_user_id, real_user_id, name) VALUES(?, ?, ?)',
				iter_users('raw/users.csv'))

	counts = defaultdict(lambda: defaultdict(lambda: defaultdict(int))) # [channel][user][hour]
	months = set()
	for row in iter_rows('raw/messages.csv.lzma', verbose):
		channel_id = int(row['channel_id'])
		int_user_id = int(row['int_user_id'])
		dt = snowflake_dt(int(row['message_id']))
		hour = dt.replace(minute=0, second=0, tzinfo=datetime.timezone.utc).timestamp()
		counts[channel_id][int_user_id][hour] += 1

		month = dt.date().replace(day=1)
		months.add(month)

	month_rows = []
	for month in sorted(months):
		month_rows.append((month.strftime('%Y-%m'),))

	with conn:
		conn.executemany('INSERT INTO months (month) VALUES(?)', month_rows)
		conn.executemany('INSERT INTO messages (channel_id, int_user_id, hour, count) VALUES(?, ?, ?, ?)',
				iter_counts(counts))

def prepare_db(verbose):
	if path.exists('ddd.db'):
		if verbose:
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
				int_user_id INTEGER PRIMARY KEY,
				real_user_id INTEGER,
				name TEXT
			)
		''')
		conn.execute('''
			CREATE TABLE months (
				month TEXT
			)
		''')
		conn.execute('''
			CREATE TABLE messages (
				channel_id INTEGER,
				int_user_id INTEGER,
				hour INTEGER,
				count INTEGER
			)
		''')
		conn.execute('''
			CREATE UNIQUE INDEX channel_user_hour ON messages
			(channel_id, int_user_id, hour)
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
			int_user_id = int(row['int_user_id'])
			real_user_id = int(row['real_user_id'])
			yield (int_user_id, real_user_id, row['name'])

def iter_rows(messages_xz_path, verbose):
	with lzma.open(messages_xz_path, 'rt', encoding='utf-8') as f:
		reader = csv.DictReader(f)
		for i, row in enumerate(reader):
			yield row
			if verbose and (i + 1) % 100000 == 0:
				print('processed', i+1, 'messages')

def iter_counts(counts):
	for channel_id, user_counts in counts.items():
		for int_user_id, hour_counts in user_counts.items():
			for hour, count in hour_counts.items():
				yield (channel_id, int_user_id, hour, count)

DISCORD_EPOCH = 1420070400000
def snowflake_dt(snowflake):
	''' twitter snowflake to datetime '''
	unix_timestamp = ((snowflake >> 22) + DISCORD_EPOCH) // 1000
	return datetime.datetime.utcfromtimestamp(unix_timestamp)

if __name__ == '__main__':
	main()
