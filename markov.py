#!/usr/bin/env python3

import datetime
import sys

import markovify

import db
import prepare_db

def main(argv):
	if len(argv) == 2 and argv[1] == 'gen':
		prepare_model()
	else:
		with open('markov.json', 'r') as f:
			model = markovify.Text.from_json(f.read())
		for _ in range(5):
			print(model.make_short_sentence(150))

def prepare_model():
	user_ids = db.top_user_ids()

	cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=30)
	content = ''
	prepare_db.verbose = False
	for row in prepare_db.iter_rows('raw/messages.csv.lzma'):
		if row['user_id'] in user_ids and prepare_db.snowflake_dt(int(row['message_id'])) > cutoff:
			content += row['content'] + '\n'

	text_model = markovify.Text(content, state_size=3)
	with open('markov.json', 'w') as f:
		f.write(text_model.to_json())

if __name__ == '__main__':
	main(sys.argv)
