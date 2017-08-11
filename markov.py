#!/usr/bin/env python3

import random
import sys

import markovify

import db
import prepare_db

def main(argv):
	if len(argv) == 2 and argv[1] == 'gen':
		prepare_model()
		print('wrote to markov.json')
	else:
		with open('markov.json', 'r') as f:
			model = markovify.Text.from_json(f.read())
		for _ in range(5):
			max_len = random.randint(75, 150)
			print(model.make_short_sentence(max_len))

def prepare_model():
	user_ids = db.top_15_user_ids()

	content = ''
	for row in prepare_db.iter_rows('raw/messages.csv.xz'):
		if row['user_id'] in user_ids:
			content += row['content'] + '\n'

	text_model = markovify.Text(content, state_size=3)
	with open('markov.json', 'w') as f:
		f.write(text_model.to_json())

if __name__ == '__main__':
	main(sys.argv)
