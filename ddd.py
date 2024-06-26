#!/usr/bin/env python3

# ruff: noqa: E402

from __future__ import annotations

import sys
if len(sys.argv) == 1 and sys.platform == 'linux': # dev
	import pigwig.reloader_linux
	pigwig.reloader_linux.init()

import datetime
import mimetypes
from os import path
import typing

import fastwsgi
from pigwig import PigWig, Response
from sqlalchemy.sql import func
if typing.TYPE_CHECKING:
	from sqlalchemy.orm.query import Query

from db import Channels, Guilds, Messages, Months, Session, Users

def root(request):
	guilds = Session().query(Guilds).all()
	return Response.render(request, 'index.html', {'guilds': guilds})

def guild_page(request, guild_id):
	guild = Session().get(Guilds, int(guild_id))
	return Response.render(request, 'guild.html', {'guild': guild})

def channel_user_month_list(request, guild_id):
	session = Session()

	channels = []
	for row in session.query(Channels).filter(Channels.guild_id == guild_id).order_by(Channels.name):
		channels.append({'id': str(row.channel_id), 'name': row.name})

	users = []
	for row in session.query(Users).order_by(Users.name):
		users.append({'id': str(row.int_user_id), 'name': row.name})

	months = []
	for row in session.query(Months).order_by(Months.month):
		months.append(row.month)

	return Response.json({'channels': channels, 'users': users, 'months': months})

def by_month(request, guild_id):
	session = Session()
	query = session.query(Messages) \
			.with_entities(func.strftime('%Y-%m', Messages.hour, 'unixepoch').label('month'),
					func.sum(Messages.count).label('count')) \
			.group_by('month').order_by('month')
	query = _filter(query, int(guild_id), request.query)

	data = []
	for row in query:
		data.append({'month': row.month, 'count': row.count})
	return Response.json(data)

def by_hour(request, guild_id):
	session = Session()
	query = session.query(Messages) \
			.with_entities(func.strftime('%H', Messages.hour, 'unixepoch').label('agg_hour'),
					func.sum(Messages.count).label('count')) \
			.group_by('agg_hour').order_by('agg_hour')
	query = _filter(query, int(guild_id), request.query)

	data = []
	for row in query:
		data.append({'hour': row.agg_hour, 'count': row.count})
	return Response.json(data)

def by_user(request, guild_id):
	session = Session()
	query = session.query(func.sum(Messages.count))
	total = _filter(query, int(guild_id), request.query).scalar()

	query = session.query(Messages) \
			.with_entities(Messages.int_user_id, Users.name, func.sum(Messages.count).label('count')) \
			.outerjoin(Users, Messages.int_user_id == Users.int_user_id) \
			.group_by(Messages.int_user_id).order_by(func.sum(Messages.count).desc())
	query = _filter(query, int(guild_id), request.query)
	query = query.limit(50)

	data = []
	for row in query:
		data.append({
			'user': row.name or str(row.real_user_id),
			'count': row.count,
			'percentage': float('%.2f' % (row.count / total * 100)),
		})
	return Response.json(data)

def by_channel(request, guild_id):
	session = Session()
	query = session.query(func.sum(Messages.count))
	total = _filter(query, int(guild_id), request.query).scalar()

	query = session.query(Messages) \
			.with_entities(Messages.channel_id, Channels.name, func.sum(Messages.count).label('count')) \
			.outerjoin(Channels, Messages.channel_id == Channels.channel_id) \
			.group_by(Channels.channel_id).order_by(func.sum(Messages.count).desc())
	query = _filter(query, int(guild_id), request.query, join_channel=False)

	data = []
	for row in query:
		data.append({
			'channel': row.name or str(row.channel_id),
			'count': row.count,
			'percentage': float('%.2f' % (row.count / total * 100)),
		})
	return Response.json(data)

def _filter(query: Query, guild_id: int, qs: dict[str, str], join_channel=True):
	if join_channel:
		query = query.join(Channels, Messages.channel_id == Channels.channel_id)
	query = query.filter(Channels.guild_id == guild_id)
	if 'channel_id' in qs:
		query = query.filter(Messages.channel_id == int(qs['channel_id']))
	if 'int_user_id' in qs:
		query = query.filter(Messages.int_user_id == int(qs['int_user_id']))
	if 'from' in qs:
		start = datetime.datetime.strptime(qs['from'], '%Y-%m-%d').replace(tzinfo=datetime.timezone.utc)
		query = query.filter(start.timestamp() <= Messages.hour)
	if 'to' in qs:
		end = datetime.datetime.strptime(qs['to'], '%Y-%m-%d').replace(tzinfo=datetime.timezone.utc)
		end += datetime.timedelta(days=1)
		query = query.filter(Messages.hour < end.timestamp())
	return query

def emoji_stats(request, guild_id):
	guild = Session().query(Guilds).get(int(guild_id))
	return Response.render(request, 'emoji.html', {'guild': guild})

def static(request, file_path):
	try:
		with open(path.join('static', file_path), 'rb') as f:
			content = f.read()
	except FileNotFoundError:
		return Response('not found', 404)
	content_type, _ = mimetypes.guess_type(file_path)
	return Response(body=content, content_type=content_type)

routes = [
	('GET', '/', root),
	('GET', '/guild/<guild_id>/', guild_page),
	('GET', '/guild/<guild_id>/channel_user_month_list.json', channel_user_month_list),
	('GET', '/guild/<guild_id>/by_month.json', by_month),
	('GET', '/guild/<guild_id>/by_hour.json', by_hour),
	('GET', '/guild/<guild_id>/by_user.json', by_user),
	('GET', '/guild/<guild_id>/by_channel.json', by_channel),
	('GET', '/guild/<guild_id>/emoji', emoji_stats),

	('GET', '/static/<path:file_path>', static),
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

	fastwsgi.run(app, '127.0.0.1', port)
