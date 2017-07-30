#!/usr/bin/env python3

import csv
from collections import Counter
import json
import lzma
import os
from os import path
import sys

def main():
	messages_xz_path = sys.argv[1]
	users_path = sys.argv[2]

	users = get_users(users_path)
	all_time = process_all_time(users, messages_xz_path)
	with open('processed/all_time.json', 'w') as f:
		json.dump(all_time, f, indent='\t')
	months = process_months()
	with open('processed/months.json', 'w') as f:
		json.dump(months, f, indent='\t')

def process_all_time(users, messages_xz_path):
	user_counts = Counter()
	for row in iter_rows(messages_xz_path):
		user_id = int(row['user_id'])
		user_counts[user_id] += 1

	total = sum(user_counts.values())
	all_time = []
	for user_id, message_count in user_counts.most_common(50):
		name = users.get(user_id, user_id)
		percentage = float('%.2f' % (message_count / total * 100))
		all_time.append({'user': name, 'messages': message_count, 'percentage': percentage})

	return all_time

def process_months():
	month_counts = {}
	for day_filename in sorted(os.listdir('logs')):
		if not day_filename.endswith('.csv'):
			raise Exception(day_filename)
		month = day_filename[:7]
		if month not in month_counts:
			print('processing', month)
			month_counts[month] = 0

		lines = 0
		with open(path.join('logs', day_filename), 'r') as f:
			next(f) # skip header
			for _ in f:
				lines += 1

		month_counts[month] += lines

	months = []
	for month, count in month_counts.items():
		months.append({'month': month, 'count': count})
	return months

def get_users(users_path):
	users = {}
	with open(users_path, 'r') as f:
		reader = csv.DictReader(f)
		for row in reader:
			user_id = int(row['user_id'])
			users[user_id] = row['name']
	return users

def iter_rows(messages_xz_path):
	with lzma.open(messages_xz_path, 'rt', encoding='utf-8') as f:
		reader = csv.DictReader(f)
		for i, row in enumerate(reader):
			yield row
			if (i + 1) % 10000 == 0:
				print('processed', i+1, 'messages')

if __name__ == '__main__':
	main()
