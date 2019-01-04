#!/usr/bin/env python3

import collections
import datetime
import io
import os
from os import path
import sys

import markovify

import db
import prepare_db

def main(argv):
	if argv[1] == 'gen':
		prepare_model()
	else:
		with open(path.join('markov', argv[1] + '.json'), 'r') as f:
			model = markovify.Text.from_json(f.read())
		for _ in range(5):
			print(model.make_short_sentence(150))

def prepare_model():
	guild_user_ids = db.top_int_user_ids()
	guild_ids = dict(db.Session().query(db.Channels)
			.with_entities(db.Channels.channel_id, db.Channels.guild_id).all())

	guild_names = dict(db.Session().query(db.Guilds)
			.with_entities(db.Guilds.guild_id, db.Guilds.name).all())
	channel_ids = collections.defaultdict(dict)
	for guild_id, channel_id, name in prepare_db.iter_channels():
		guild_name = guild_names[guild_id]
		channel_ids[guild_name][name] = channel_id

	cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=30)
	guild_content = collections.defaultdict(io.StringIO)
	for row in prepare_db.iter_rows(channel_ids, 'raw/messages.csv.lzma', False):
		channel_id, int_user_id, message_id, content = row
		guild_id = guild_ids[channel_id]
		user_ids = guild_user_ids[guild_id]
		if int_user_id in user_ids and prepare_db.snowflake_dt(message_id) > cutoff:
			guild_content[guild_id].write(content + '\n')

	try:
		os.mkdir('markov')
	except FileExistsError:
		pass
	for guild_id, stringio in guild_content.items():
		text_model = markovify.Text(stringio.getvalue(), state_size=3)
		with open(path.join('markov', '%d.json' % guild_id), 'w') as f:
			f.write(text_model.to_json())


if __name__ == '__main__':
	main(sys.argv)
