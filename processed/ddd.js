window.addEvent('domready', function() {
	'use strict';

	new Request.JSON({
		'url': 'months.json',
		'onSuccess': months,
	}).get();

	new Request.JSON({
		'url': 'all_time.json',
		'onSuccess': all_time,
	}).get();

	function months(data) {
		const max = Math.max.apply(null, data.map((month) => month['count']));

		const table = $('months').getElement('tbody');
		data.each((month) => {
			const row = new Element('tr');
			const bar = new Element('div', {
				'class': 'bar',
				'styles': {'width': month['count'] / max * 500},
			});
			row.adopt(
				new Element('td', {'text': month['month']}),
				new Element('td', {'text': month['count'].toLocaleString(), 'class': 'right'}),
				new Element('td').grab(bar),
			);
			table.grab(row);
		});
	}

	function all_time(data) {
		const table = $('all_time').getElement('tbody');
		let cumulative = 0;
		data.each((user, i) => {
			const row = new Element('tr');
			const filler = new Element('div', {
				'class': 'bar filler',
				'styles': {'width': cumulative * 5},
			});
			const bar = new Element('div', {
				'class': 'bar',
				'styles': {'width': user['percentage'] * 5},
			});
			cumulative += user['percentage'];
			row.adopt(
				new Element('td', {'text': i + 1}),
				new Element('td', {'text': user['user']}),
				new Element('td', {'text': user['messages'].toLocaleString(), 'class': 'right'}),
				new Element('td', {'text': user['percentage'].toFixed(2), 'class': 'right'}),
				new Element('td').adopt(filler, bar),
				new Element('td', {'text': cumulative.toFixed(2), 'class': 'right'}),
			);
			table.grab(row);
		});
	}
});
