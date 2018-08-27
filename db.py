import time

import sqlalchemy
from sqlalchemy import Column, Integer, String
import sqlalchemy.ext.declarative
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.sql import func

engine = sqlalchemy.create_engine('sqlite:///ddd.db')
Session = scoped_session(sessionmaker(bind=engine))
Base = sqlalchemy.ext.declarative.declarative_base()

class Channels(Base):
	__tablename__ = 'channels'
	channel_id = Column(Integer, primary_key=True)
	name = Column(String)

class Users(Base):
	__tablename__ = 'users'
	int_user_id = Column(Integer, primary_key=True)
	real_user_id = Column(Integer)
	name = Column(String)

class Months(Base):
	__tablename__ = 'months'
	ROWID = Column(Integer, primary_key=True)
	month = Column(String)

class Messages(Base):
	__tablename__ = 'messages'
	channel_id = Column(Integer, primary_key=True)
	int_user_id = Column(Integer, primary_key=True)
	hour = Column(Integer, primary_key=True)
	count = Column(Integer)

TOP_USER_COUNT = 15

def top_user_ids():
	session = Session()

	query = session.query(Messages) \
			.with_entities(Messages.int_user_id) \
			.filter(Messages.hour > time.time() - 30 * 24 * 60 * 60) \
			.group_by(Messages.int_user_id).order_by(func.sum(Messages.count).desc())
	query = query.limit(TOP_USER_COUNT)

	user_ids = set()
	for row in query:
		user_ids.add(str(row.int_user_id))
	return user_ids

def top_usernames():
	session = Session()
	query = session.query(Messages) \
			.with_entities(Messages.int_user_id, Users.name) \
			.outerjoin(Users, Messages.int_user_id == Users.int_user_id) \
			.filter(Messages.hour > time.time() - 30 * 24 * 60 * 60) \
			.group_by(Messages.int_user_id).order_by(func.sum(Messages.count).desc())
	query = query.limit(TOP_USER_COUNT)

	usernames = []
	for row in query:
		usernames.append(row.name or str(row.int_user_id))
	return usernames
