#!/usr/bin/env python3

import csv
from collections import defaultdict
import datetime
import lzma
import os
from os import path
import sqlite3
import sys

import lz4framed

import config

PROGRAMMING_GUILD_ID = 181866934353133570

def main():
	verbose = True
	if len(sys.argv) == 2 and sys.argv[1] == '-q':
		verbose = False
	conn = prepare_db(verbose)

	with conn:
		conn.executemany('INSERT INTO guilds (guild_id, name) VALUES(?, ?)',
				iter_guilds())

	with conn:
		conn.executemany('INSERT INTO channels (guild_id, channel_id, name) VALUES(?, ?, ?)',
				iter_channels())
		conn.executemany('INSERT INTO channels (guild_id, channel_id, name) VALUES(?, ?, ?)',
				iter_programming_channels('raw/channels.csv'))

	with conn:
		conn.executemany('INSERT INTO users (int_user_id, real_user_id, name) VALUES(?, ?, ?)',
				iter_users())
		for user_args in iter_programming_users('raw/users.csv'):
			try:
				conn.execute('INSERT INTO users (int_user_id, real_user_id, name) VALUES(?, ?, ?)',
						user_args)
			except sqlite3.IntegrityError:
				if verbose:
					print('duplicate user', *user_args)

	channel_ids = {}
	for guild_id, channel_id, name in iter_channels():
		channel_ids[name] = channel_id

	counts = defaultdict(lambda: defaultdict(lambda: defaultdict(int))) # [channel][user][hour]
	months = set()
	for row in iter_rows(channel_ids, 'raw/messages.csv.lzma', verbose):
		channel_id, int_user_id, message_id = row
		dt = snowflake_dt(message_id)
		hour = dt.replace(minute=0, second=0, tzinfo=datetime.timezone.utc).timestamp()
		counts[channel_id][int_user_id][hour] += 1

		month = dt.date().replace(day=1)
		months.add(month)

	with conn:
		conn.executemany('INSERT INTO messages (channel_id, int_user_id, hour, count) VALUES(?, ?, ?, ?)',
				iter_counts(counts))

	month_rows = []
	for month in sorted(months):
		month_rows.append((month.strftime('%Y-%m'),))
	with conn:
		conn.executemany('INSERT INTO months (month) VALUES(?)', month_rows)

def prepare_db(verbose):
	if path.exists('ddd.db'):
		if verbose:
			print('deleting ddd.db')
		os.unlink('ddd.db')
	conn = sqlite3.connect('ddd.db')
	with conn:
		conn.execute('''
			CREATE TABLE guilds (
				guild_id INTEGER PRIMARY KEY,
				name TEXT
			)
		''')
		conn.execute('''
			CREATE TABLE channels (
				channel_id INTEGER PRIMARY KEY,
				guild_id INTEGER,
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

def iter_guilds():
	with open(path.join(config.log_dir, 'guilds'), 'rb') as f:
		for line in f:
			guild_id, name = line.rstrip(b'\n').split(b'|', 2)
			yield (int(guild_id), name.decode('utf-8'))

	yield (PROGRAMMING_GUILD_ID, 'Programming')

def iter_channels():
	with open(path.join(config.log_dir, 'channels'), 'rb') as f:
		for line in f:
			guild_id, channel_id, name = line.rstrip(b'\n').split(b'|', 2)
			yield (int(guild_id), int(channel_id), name.decode('utf-8'))

def iter_programming_channels(channels_path):
	with open(channels_path, 'r') as f:
		reader = csv.DictReader(f)
		for row in reader:
			channel_id = int(row['channel_id'])
			yield (PROGRAMMING_GUILD_ID, channel_id, row['name'])

def iter_users():
	with open(path.join(config.log_dir, 'users'), 'rb') as f:
		for line in f:
			user_id, username = line.rstrip(b'\n').split(b'|', 1)
			user_id = int(user_id)
			yield (user_id, user_id, username.decode('utf-8'))

def iter_programming_users(users_path):
	with open(users_path, 'r') as f:
		reader = csv.DictReader(f)
		for row in reader:
			int_user_id = int(row['int_user_id'])
			real_user_id = int(row['real_user_id'])
			yield (int_user_id, real_user_id, row['name'])

def iter_rows(channel_ids, messages_xz_path, verbose):
	for guild in os.listdir(config.log_dir):
		guild_path = path.join(config.log_dir, guild)
		if not path.isdir(guild_path):
			continue
		for channel in os.listdir(guild_path):
			print('processing', guild, '-', channel)
			channel_id = channel_ids[channel]
			channel_path = path.join(guild_path, channel)
			for day_file in os.listdir(channel_path):
				with open(path.join(channel_path, day_file), 'rb') as f:
					compressed = f.read()
				contents = lz4framed.decompress(compressed)
				lines = contents.split(b'\0')
				for line in lines:
					if line == b'':
						continue
					message_id, time, user_id, content = line.split(b'|', 3)
					yield channel_id, int(user_id), int(message_id)

	with lzma.open(messages_xz_path, 'rt', encoding='utf-8') as f:
		reader = csv.DictReader(f)
		for i, row in enumerate(reader):
			channel_id = row['channel_id']
			int_user_id = row['int_user_id']
			message_id = row['message_id']
			yield int(channel_id), int(int_user_id), int(message_id)
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
