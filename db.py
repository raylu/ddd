import time

import sqlalchemy
from sqlalchemy import Column, Integer, Unicode
import sqlalchemy.ext.declarative
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.sql import func

engine = sqlalchemy.create_engine('sqlite:///ddd.db')
Session = scoped_session(sessionmaker(bind=engine))
Base = sqlalchemy.ext.declarative.declarative_base()

class Guilds(Base):
	__tablename__ = 'guilds'
	guild_id = Column(Integer, primary_key=True)
	name = Column(Unicode)

class Channels(Base):
	__tablename__ = 'channels'
	channel_id = Column(Integer, primary_key=True)
	guild_id = Column(Integer)
	name = Column(Unicode)

class Users(Base):
	__tablename__ = 'users'
	int_user_id = Column(Integer, primary_key=True)
	real_user_id = Column(Integer)
	name = Column(Unicode)

class Months(Base):
	__tablename__ = 'months'
	ROWID = Column(Integer, primary_key=True)
	month = Column(Unicode)

class Messages(Base):
	__tablename__ = 'messages'
	channel_id = Column(Integer, primary_key=True)
	int_user_id = Column(Integer, primary_key=True)
	hour = Column(Integer, primary_key=True)
	count = Column(Integer)

TOP_USER_COUNT = 15

def top_int_user_ids():
	session = Session()

	time_threshold = time.time() - 30 * 24 * 60 * 60
	top = {}
	for guild in session.query(Guilds).with_entities(Guilds.guild_id):
		query = session.query(Messages) \
				.with_entities(Messages.int_user_id) \
				.join(Channels, Messages.channel_id == Channels.channel_id) \
				.filter(
					Channels.guild_id == guild.guild_id,
					Messages.hour > time_threshold,
				) \
				.group_by(Messages.int_user_id).order_by(func.sum(Messages.count).desc())
		query = query.limit(TOP_USER_COUNT)

		user_ids = set()
		for row in query:
			user_ids.add(row.int_user_id)
		top[guild.guild_id] = user_ids

	return top

def top_usernames():
	session = Session()

	time_threshold = time.time() - 30 * 24 * 60 * 60
	usernames = {}
	for guild in session.query(Guilds).with_entities(Guilds.guild_id):
		query = session.query(Messages) \
				.with_entities(Messages.int_user_id, Users.name) \
				.outerjoin(Users, Messages.int_user_id == Users.int_user_id) \
				.join(Channels, Messages.channel_id == Channels.channel_id) \
				.filter(
					Channels.guild_id == guild.guild_id,
					Messages.hour > time_threshold,
				) \
				.group_by(Messages.int_user_id).order_by(func.sum(Messages.count).desc())
		query = query.limit(TOP_USER_COUNT)

		guild_usernames = []
		for row in query:
			guild_usernames.append(row.name or str(row.int_user_id))
		usernames[guild.guild_id] = guild_usernames

	return usernames
