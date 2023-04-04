'use strict';
/* global $ */

window.addEvent('domready', function() {
	const interval = setInterval(getNewLine, 3000);
	getNewLine();

	function getNewLine() {
		new Request.JSON({
			'url': 'markov.json',
			'onSuccess': newLine,
		}).get();
	}

	const simulation = $('simulation');
	let count = 0;
	function newLine(data) {
		const line = data['line'];
		if (line != null) {
			const userDiv = new Element('div', {'text': data['username'], 'class': 'username'});
			const div = new Element('div', {'class': 'line'}).grab(userDiv);
			div.appendText(line);
			simulation.grab(div);
		}

		count++;
		if (count >= 50)
			clearInterval(interval);
	}
});
