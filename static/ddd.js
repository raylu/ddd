/* global $ MooDropdown */

window.addEvent('domready', function() {
	'use strict';

	new Request.JSON({
		'url': 'channel_user_month_list.json',
		'onSuccess': channelUserMonthList,
		'onError': (text, err) => { console.error(err); }, // eslint-disable-line no-console
	}).get();

	const channelSelect = new MooDropdown($('channel'));
	const userSelect = new MooDropdown($('user'));
	const monthSelect = new MooDropdown($('month'));
	MooDropdown.setupClose(channelSelect, userSelect, monthSelect);
	channelSelect.addOption(null, '(all)');
	userSelect.addOption(null, '(all)');
	monthSelect.addOption(null, '(all)');

	function query(initial) {
		const qs = {};
		if (channelSelect.value)
			qs['channel_id'] = channelSelect.value;
		if (userSelect.value)
			qs['int_user_id'] = userSelect.value;
		if (monthSelect.value)
			qs['month'] = monthSelect.value;
		if (!initial)
			history.pushState(qs, '', '?' + Object.toQueryString(qs));

		new Request.JSON({
			'url': 'by_month.json',
			'data': qs,
			'onSuccess': byMonth,
		}).get();

		new Request.JSON({
			'url': 'by_hour.json',
			'data': qs,
			'onSuccess': byHour,
		}).get();

		new Request.JSON({
			'url': 'by_user.json',
			'data': qs,
			'onSuccess': byUser,
		}).get();

		new Request.JSON({
			'url': 'by_channel.json',
			'data': qs,
			'onSuccess': byChannel,
		}).get();
	}

	function channelUserMonthList(data) {
		data['channels'].each((channel) => {
			channelSelect.addOption(channel['id'], channel['name']);
		});
		data['users'].each((user) => {
			userSelect.addOption(user['id'], user['name']);
		});
		data['months'].each((month) => {
			monthSelect.addOption(month, month);
		});
		channelSelect.render();
		userSelect.render();
		monthSelect.render();

		const qs = window.location.search.substr(1);
		const params = {};
		qs.split('&').each((fragment) => {
			let key, val;
			[key, val] = fragment.split('=');
			params[key] = decodeURIComponent(val);
		});
		channelSelect.select(params['channel_id'] || null);
		userSelect.select(params['int_user_id'] || null);
		monthSelect.select(params['month'] || null);

		channelSelect.addEvent('moodropdown-select', () => {query(false);});
		userSelect.addEvent('moodropdown-select', () => {query(false);});
		monthSelect.addEvent('moodropdown-select', () => {query(false);});

		query(true);
	}

	function byMonth(data) {
		const max = Math.max.apply(null, data.map((month) => month['count']));

		const table = $('by_month').getElement('tbody');
		table.getElement('tr').getAllNext().destroy();
		data.each((month) => {
			const row = new Element('tr');
			const bar = new Element('div', {
				'class': 'bar',
				'styles': {'width': month['count'] / max * 500},
			});
			row.adopt(
				new Element('td', {'text': month['month']}),
				new Element('td', {'text': month['count'].toLocaleString(), 'class': 'right'}),
				new Element('td').grab(bar)
			);
			table.grab(row);
		});
	}

	function byHour(data) {
		const max = Math.max.apply(null, data.map((hour) => hour['count']));

		const table = $('by_hour').getElement('tbody');
		table.getElement('tr').getAllNext().destroy();
		data.each((hour) => {
			const row = new Element('tr');
			const bar = new Element('div', {
				'class': 'bar',
				'styles': {'width': hour['count'] / max * 500},
			});
			row.adopt(
				new Element('td', {'text': hour['hour']}),
				new Element('td', {'text': hour['count'].toLocaleString(), 'class': 'right'}),
				new Element('td').grab(bar)
			);
			table.grab(row);
		});
	}

	function byUser(data) {
		const table = $('by_user').getElement('tbody');
		table.getElement('tr').getAllNext().destroy();
		let cumulative = 0;
		data.each((user, i) => {
			const row = new Element('tr');
			const filler = new Element('div', {
				'class': 'bar filler',
				'styles': {'width': cumulative * 4},
			});
			const bar = new Element('div', {
				'class': 'bar',
				'styles': {'width': user['percentage'] * 4},
			});
			cumulative += user['percentage'];
			row.adopt(
				new Element('td', {'text': i + 1}),
				new Element('td', {'text': user['name']}),
				new Element('td', {'text': user['count'].toLocaleString(), 'class': 'right'}),
				new Element('td', {'text': user['percentage'].toFixed(2), 'class': 'right'}),
				new Element('td').adopt(filler, bar),
				new Element('td', {'text': cumulative.toFixed(2), 'class': 'right'})
			);
			table.grab(row);
		});
	}

	function byChannel(data) {
		const table = $('by_channel').getElement('tbody');
		table.getElement('tr').getAllNext().destroy();
		data.each((channel, i) => {
			const row = new Element('tr');
			const bar = new Element('div', {
				'class': 'bar',
				'styles': {'width': channel['percentage'] * 5},
			});
			row.adopt(
				new Element('td', {'text': i + 1}),
				new Element('td', {'text': channel['name']}),
				new Element('td', {'text': channel['count'].toLocaleString(), 'class': 'right'}),
				new Element('td', {'text': channel['percentage'].toFixed(2), 'class': 'right'}),
				new Element('td').adopt(bar)
			);
			table.grab(row);
		});
	}
});
