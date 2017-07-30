#!/usr/bin/env python3

import datetime
import sqlite3

from pigwig import PigWig, Response

def root(request):
	return Response.render(request, 'index.html', {})

def months(request):
	c = conn.cursor()
	c.execute('''
		SELECT strftime("%Y-%m", hour, "unixepoch") AS month, SUM(count)
		FROM messages GROUP BY month ORDER BY month ASC
	''')
	data = []
	for row in c.fetchall():
		data.append({'month': row['month'], 'count': row['SUM(count)']})
	return Response.json(data)

def hours(request):
	c = conn.cursor()
	c.execute('''
		SELECT strftime('%H', hour, 'unixepoch') AS agg_hour, SUM(count)
		FROM messages GROUP BY agg_hour ORDER BY agg_hour ASC;
	''')
	data = []
	for row in c.fetchall():
		data.append({'hour': row['agg_hour'], 'count': row['SUM(count)']})
	return Response.json(data)

def all_time(request):
	c = conn.cursor()
	c.execute('SELECT SUM(count) FROM messages')
	total = c.fetchall()[0]['SUM(count)']
	c.execute('''
		SELECT name, SUM(count) FROM messages
		JOIN users ON messages.user_id = users.user_id
		GROUP BY users.user_id ORDER BY SUM(count) DESC LIMIT 50
	''')
	data = []
	for row in c.fetchall():
		count = row['SUM(count)']
		data.append({
			'name': row['name'],
			'count': count,
			'percentage': float('%.2f' % (count / total * 100)),
		})
	return Response.json(data)

routes = [
	('GET', '/', root),
	('GET', '/months.json', months),
	('GET', '/hours.json', hours),
	('GET', '/all_time.json', all_time),
]

app = PigWig(routes, template_dir='templates')

conn = sqlite3.connect('ddd.db')
conn.row_factory = sqlite3.Row

if __name__ == '__main__':
	app.main()
