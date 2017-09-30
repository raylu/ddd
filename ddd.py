#!/usr/bin/env python3

# pylint: disable=wrong-import-order,wrong-import-position,ungrouped-imports

import sys
if len(sys.argv) == 1: # dev
	import pigwig.reloader_linux
	pigwig.reloader_linux.init()

import eventlet
eventlet.monkey_patch()

#import random

import eventlet.wsgi
#import markovify
from pigwig import PigWig, Response
from sqlalchemy.sql import func

from db import Session, Channels, Users, Messages#, top_usernames

def root(request):
	return Response.render(request, 'index.html', {})

def channel_user_list(request):
	session = Session()

	channels = []
	for row in session.query(Channels).order_by(Channels.name):
		channels.append({'id': str(row.channel_id), 'name': row.name})

	users = []
	for row in session.query(Users).order_by(Users.name):
		users.append({'id': str(row.user_id), 'name': row.name})
	return Response.json({'channels': channels, 'users': users})

def by_month(request):
	session = Session()
	query = session.query(Messages) \
			.with_entities(func.strftime('%Y-%m', Messages.hour, 'unixepoch').label('month'),
					func.sum(Messages.count).label('count')) \
			.group_by('month').order_by('month')
	query = _filter(query, request.query)

	data = []
	for row in query:
		data.append({'month': row.month, 'count': row.count})
	return Response.json(data)

def by_hour(request):
	session = Session()
	query = session.query(Messages) \
			.with_entities(func.strftime('%H', Messages.hour, 'unixepoch').label('agg_hour'),
					func.sum(Messages.count).label('count')) \
			.group_by('agg_hour').order_by('agg_hour')
	query = _filter(query, request.query)

	data = []
	for row in query:
		data.append({'hour': row.agg_hour, 'count': row.count})
	return Response.json(data)

def by_user(request):
	session = Session()
	query = session.query(func.sum(Messages.count))
	total = _filter(query, request.query).scalar()

	query = session.query(Messages) \
			.with_entities(Messages.user_id, Users.name, func.sum(Messages.count).label('count')) \
			.outerjoin(Users, Messages.user_id == Users.user_id) \
			.group_by(Messages.user_id).order_by(func.sum(Messages.count).desc())
	query = _filter(query, request.query)
	query = query.limit(50)

	data = []
	for row in query:
		data.append({
			'name': row.name or str(row.user_id),
			'count': row.count,
			'percentage': float('%.2f' % (row.count / total * 100)),
		})
	return Response.json(data)

def by_channel(request):
	session = Session()
	query = session.query(func.sum(Messages.count))
	total = _filter(query, request.query).scalar()

	query = session.query(Messages) \
			.with_entities(Messages.channel_id, Channels.name, func.sum(Messages.count).label('count')) \
			.outerjoin(Channels, Messages.channel_id == Channels.channel_id) \
			.group_by(Channels.channel_id).order_by(func.sum(Messages.count).desc())
	query = _filter(query, request.query)

	data = []
	for row in query:
		data.append({
			'name': row.name or str(row.channel_id),
			'count': row.count,
			'percentage': float('%.2f' % (row.count / total * 100)),
		})
	return Response.json(data)

def _filter(query, qs):
	if 'channel_id' in qs:
		query = query.filter(Messages.channel_id == int(qs['channel_id']))
	if 'user_id' in qs:
		query = query.filter(Messages.user_id == int(qs['user_id']))
	return query

def markov_page(request):
	return Response.render(request, 'markov.html', {})

# pylint: disable=pointless-string-statement
'''
with open('markov.json', 'r') as f:
	markov_model = markovify.Text.from_json(f.read())
usernames = top_usernames()
def markov_line(request):
	max_len = random.randint(75, 150)
	line = markov_model.make_short_sentence(max_len)
	username = random.choice(usernames)
	return Response.json({'username': username, 'line': line})
'''

routes = [
	('GET', '/', root),
	('GET', '/channel_user_list.json', channel_user_list),
	('GET', '/by_month.json', by_month),
	('GET', '/by_hour.json', by_hour),
	('GET', '/by_user.json', by_user),
	('GET', '/by_channel.json', by_channel),

	#('GET', '/markov', markov_page),
	#('GET', '/markov.json', markov_line),
]

def response_done(request, response):
	Session.remove()

app = PigWig(routes, template_dir='templates', response_done_handler=response_done)

if __name__ == '__main__':
	port = 8000
	if len(sys.argv) == 2: # production
		port = int(sys.argv[1])
	else:
		app.template_engine.jinja_env.auto_reload = True

	eventlet.wsgi.server(eventlet.listen(('127.1', port)), app)
