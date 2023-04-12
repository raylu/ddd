'use strict';

interface EmojiResponse {
	users: {[userID: string]: string}
	emojis: UserCounts
}
interface UserCounts {
	[emoji: string]: {[userID: string]: number}
}

window.addEventListener('DOMContentLoaded', () => {
	(async () => {
		const guildID = window.location.pathname.split('/', 3)[2];
		const res = await fetch(`/static/emoji_user_stats_${guildID}.json`);
		render(await res.json());
	})();

	function render(data: EmojiResponse) {
		const {users, emojis} = data;

		const header = document.createElement('tr');
		header.append(document.createElement('td')); // blank top-left cell;
		for (const userID in users) {
			const th = document.createElement('th');
			th.innerText = users[userID];
			header.append(th);
		}

		const table = document.querySelector('#emoji');
		table.append(header);
		const max = Math.log(findMax(emojis));
		for (const emoji in emojis) {
			const row = document.createElement('tr');
			let td = document.createElement('td');
			td.innerText = emoji;
			row.append(td);

			const emojiStats = emojis[emoji];
			for (const userID in users) {
				const count = emojiStats[userID] || null;
				td = document.createElement('td');
				if (count) {
					td.innerText = String(count);
					const intensity = Math.round(Math.log(count) / max * 128);
					td.style.backgroundColor = `#${intensity.toString(16)}0000`;
				}
				row.append(td);
			}

			table.append(row);
		}
	}

	function findMax(emojis: UserCounts): number {
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
