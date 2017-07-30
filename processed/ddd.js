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
		const table = $('months').getElement('tbody');
		data.each((month) => {
			const row = new Element('tr');
			row.adopt(
				new Element('td', {'text': month['month']}),
				new Element('td', {'text': month['count'].toLocaleString()}),
			);
			table.grab(row);
		});
	}

	function all_time(data) {
		const table = $('all_time').getElement('tbody');
		data.each((user) => {
			const row = new Element('tr');
			row.adopt(
				new Element('td', {'text': user['user']}),
				new Element('td', {'text': user['messages'].toLocaleString()}),
				new Element('td', {'text': user['percentage']}),
			);
			table.grab(row);
		});
	}
});
