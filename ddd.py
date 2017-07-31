#!/usr/bin/env python3

import sys
if len(sys.argv) == 1: # dev
	import pigwig.reloader_linux
	pigwig.reloader_linux.init()

import eventlet
eventlet.monkey_patch()

import datetime
import sqlite3

import eventlet.wsgi
from pigwig import PigWig, Response
import sqlalchemy
from sqlalchemy import Column, Integer, String
import sqlalchemy.ext.declarative
from sqlalchemy.orm import scoped_session, sessionmaker, relationship, joinedload
from sqlalchemy.sql import func


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

def months(request):
	session = Session()
	query = session.query(Messages) \
			.with_entities(func.strftime('%Y-%m', Messages.hour, 'unixepoch').label('month'),
					func.sum(Messages.count).label('count')) \
			.group_by('month').order_by('month')
	if 'channel_id' in request.query:
		query = query.filter(Messages.channel_id == int(request.query['channel_id']))
	if 'user_id' in request.query:
		query = query.filter(Messages.user_id == int(request.query['user_id']))

	data = []
	for row in query:
		data.append({'month': row.month, 'count': row.count})
	return Response.json(data)

def hours(request):
	session = Session()
	query = session.query(Messages) \
			.with_entities(func.strftime('%H', Messages.hour, 'unixepoch').label('agg_hour'),
					func.sum(Messages.count).label('count')) \
			.group_by('agg_hour').order_by('agg_hour')
	if 'channel_id' in request.query:
		query = query.filter(Messages.channel_id == int(request.query['channel_id']))
	if 'user_id' in request.query:
		query = query.filter(Messages.user_id == int(request.query['user_id']))

	data = []
	for row in query:
		data.append({'hour': row.agg_hour, 'count': row.count})
	return Response.json(data)

def all_time(request):
	session = Session()
	total = session.query(func.sum(Messages.count)).scalar()

	query = session.query(Messages) \
			.with_entities(Messages.user_id, Users.name, func.sum(Messages.count).label('count')) \
			.outerjoin(Users, Messages.user_id == Users.user_id) \
			.group_by(Messages.user_id).order_by(func.sum(Messages.count).desc()).limit(50)
	data = []
	for row in query:
		data.append({
			'name': row.name or str(row.user_id),
			'count': row.count,
			'percentage': float('%.2f' % (row.count / total * 100)),
		})
	return Response.json(data)

routes = [
	('GET', '/', root),
	('GET', '/channel_user_list.json', channel_user_list),
	('GET', '/months.json', months),
	('GET', '/hours.json', hours),
	('GET', '/all_time.json', all_time),
]

def response_done(request, response):
	Session.remove()

app = PigWig(routes, template_dir='templates', response_done_handler=response_done)

engine = sqlalchemy.create_engine('sqlite:///ddd.db', echo=True)
Session = sqlalchemy.orm.scoped_session(sqlalchemy.orm.sessionmaker(bind=engine))
Base = sqlalchemy.ext.declarative.declarative_base()

class Channels(Base):
	__tablename__ = 'channels'
	channel_id = Column(Integer, primary_key=True)
	name = Column(String)

class Users(Base):
	__tablename__ = 'users'
	user_id = Column(Integer, primary_key=True)
	name = Column(String)

class Messages(Base):
	__tablename__ = 'messages'
	channel_id = Column(Integer, primary_key=True)
	user_id = Column(Integer, primary_key=True)
	hour = Column(Integer, primary_key=True)
	count = Column(Integer)

if __name__ == '__main__':
	port = 8000
	if len(sys.argv) == 2: # production
		port = int(sys.argv[1])
	else:
		app.template_engine.jinja_env.auto_reload = True

	eventlet.wsgi.server(eventlet.listen(('127.1', port)), app)
