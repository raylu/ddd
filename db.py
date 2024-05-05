import sqlalchemy
from sqlalchemy import Column, Integer, Unicode
import sqlalchemy.ext.declarative
from sqlalchemy.orm import scoped_session, sessionmaker

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
	name = Column(Unicode(collation='NOCASE'))

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
