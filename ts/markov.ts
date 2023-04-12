'use strict';

window.addEventListener('DOMContentLoaded', () => {
	const interval = setInterval(getNewLine, 3000);
	getNewLine();

	async function getNewLine() {
		const res = await fetch('markov.json');
		newLine(await res.json());
	}

	const simulation = document.querySelector('#simulation');
	let count = 0;
	function newLine(data: {username: string, line: string}) {
		const line = data['line'];
		if (line != null) {
			// const userDiv = new Element('div', {'text': data['username'], 'class': 'username'});
			// const div = new Element('div', {'class': 'line'}).grab(userDiv);
			// div.appendText(line);
			const div = document.createElement('div');
			div.classList.add('line');
			div.innerHTML = `<div class="username">${data['username']}</div>`;
			div.append(line);
			simulation.append(div);
		}

		count++;
		if (count >= 50)
			clearInterval(interval);
	}
});
