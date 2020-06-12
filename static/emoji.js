/* global $ */

window.addEvent('domready', function() {
	'use strict';

	const guildID = window.location.pathname.split('/', 3)[2];
	new Request.JSON({
		'url': `/static/emoji_user_stats_${guildID}.json`,
		'onSuccess': render,
	}).get();

	function render(data) {
		const {users, emojis} = data;

		const header = new Element('tr');
		header.grab(new Element('td')); // blank top-left cell;
		for (const userID in users) {
			header.grab(new Element('th', {'text': users[userID]}));
		}

		const table = $('emoji');
		table.grab(header);
		const max = Math.log(findMax(emojis));
		for (const emoji in emojis) {
			const row = new Element('tr');
			row.grab(new Element('td', {'text': emoji}));

			const emojiStats = emojis[emoji];
			for (const userID in users) {
				const count = emojiStats[userID] || null;
				let props = null;
				if (count) {
					const intensity = Math.round(Math.log(count) / max * 128);
					const color = `#${intensity.toString(16)}0000`;
					props = {'text': count, 'style': 'background-color: ' + color};
				}
				row.grab(new Element('td', props));
			}

			table.grab(row);
		}
	}

	function findMax(emojis) {
		let max = 0;
		for (const emoji in emojis) {
			const emojiStats = emojis[emoji];
			for (const userID in emojiStats) {
				max = Math.max(emojiStats[userID], max);
			}
		}
		return max;
	}
});
