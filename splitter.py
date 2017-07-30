#!/usr/bin/env python3

import csv
import datetime
import lzma
import sys

def main():
	messages_xz_path = sys.argv[1]
	writers = {}
	with lzma.open(messages_xz_path, 'rt', encoding='utf-8') as f:
		reader = csv.DictReader(f)
		for i, row in enumerate(reader):
			message_id = int(row['message_id'])
			dt = snowflake_dt(message_id)
			date_str = str(dt.date())

			try:
				writer = writers[date_str]
			except KeyError:
				writer = new_writer(date_str)
				writers[date_str] = writer

			writer.writerow(row)

			if i % 10000 == 0:
				print('split', i, 'messages')

FIELDS = 'message_id,is_edited,is_deleted,content,embeds,attachments,user_id,channel_id,guild_id'.split(',')
def new_writer(date_str):
	f = open(date_str + '.csv', 'w')
	writer = csv.DictWriter(f, FIELDS)
	writer.writeheader()
	return writer

DISCORD_EPOCH = 1420070400000
def snowflake_dt(snowflake):
	''' twitter snowflake to datetime '''
	unix_timestamp = ((snowflake >> 22) + DISCORD_EPOCH) // 1000
	return datetime.datetime.utcfromtimestamp(unix_timestamp)


if __name__ == '__main__':
	main()
