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
	user_id = Column(Integer, primary_key=True)
	name = Column(String)

class Messages(Base):
	__tablename__ = 'messages'
	channel_id = Column(Integer, primary_key=True)
	user_id = Column(Integer, primary_key=True)
	hour = Column(Integer, primary_key=True)
	count = Column(Integer)

TOP_USER_COUNT = 5

def top_user_ids():
	session = Session()

	query = session.query(Messages) \
			.with_entities(Messages.user_id) \
			.group_by(Messages.user_id).order_by(func.sum(Messages.count).desc())
	query = query.limit(TOP_USER_COUNT)

	user_ids = set()
	for row in query:
		user_ids.add(str(row.user_id))
	return user_ids

def top_usernames():
	session = Session()
	query = session.query(Messages) \
			.with_entities(Messages.user_id, Users.name) \
			.outerjoin(Users, Messages.user_id == Users.user_id) \
			.group_by(Messages.user_id).order_by(func.sum(Messages.count).desc())
	query = query.limit(TOP_USER_COUNT)

	usernames = []
	for row in query:
		usernames.append(row.name or str(row.user_id))
	return usernames
