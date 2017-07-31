/* exported MooDropdown */

class MooDropdown {
	static setupClose(...dropdowns) {
		// we called stopPropagation on click events inside any MooDropdown.element,
		// so this event only fires for clicks outside the dropdowns.
		// unfortunately, clicking a MooDropdown doesn't close other MooDropdowns this way :(
		window.addEvent('click', () => {
			dropdowns.each((dropdown) => dropdown.close());
		});
	}

	constructor(div) {
		this.options = [];
		this.value = undefined;

		this.input = new Element('input');
		this.optionsDiv = new Element('div', {'class': 'moodropdown-options'}).grab(this.input);
		this.arrow = new Element('div', {'class': 'moodropdown-arrow down'});
		this.display = new Element('div', {'class': 'moodropdown-display'});
		this.element = div.addClass('moodropdown');
		this.element.adopt(this.display, this.arrow, this.optionsDiv);

		this.element.addEvent('click', this._click.bind(this));
		this.input.addEvent('input', debounce(100, this.render).bind(this));
		this.input.addEvent('keydown', this._keydown.bind(this));
	}

	addOption(value, text) {
		this.options.push({'value': value, 'text': text});
	}

	render() {
		const search = this.input.get('value').toLocaleLowerCase();
		this.optionsDiv.getChildren('div').destroy();
		let added = 0;
		for (let i = 0; i < this.options.length; i++) {
			const option = this.options[i];
			if (!search || option['text'].toLocaleLowerCase().contains(search)) {
				this.optionsDiv.grab(new Element('div', {
					'class': 'moodropdown-option',
					'data-value': option['value'],
					'text': option['text'],
				}));
				added++;
				if (added == 15)
					break;
			}
		}
	}

	open() {
		this.optionsDiv.setStyle('display', 'block');
		this.arrow.removeClass('down');
		this.arrow.addClass('up');
		this.input.focus();
	}

	close() {
		this.optionsDiv.setStyle('display', 'none');
		this.arrow.removeClass('up');
		this.arrow.addClass('down');
	}

	addEvent(event, cb) {
		return this.element.addEvent(event, cb);
	}

	select(value) {
		for (let i = 0; i < this.options.length; i++) {
			const option = this.options[i];
			if (option['value'] == value) {
				this.value = value;
				this.display.set('text', option['text']);
				this.close();
				this.element.fireEvent('moodropdown-select', {'value': this.value, 'text': option['text']});
				return;
			}
		}
		throw 'no option with value ' + value;
	}

	_select(optionDiv) {
		const text = optionDiv.get('text');
		this.value = optionDiv.get('data-value');
		this.display.set('text', text);
		this.close();
		this.element.fireEvent('moodropdown-select', {'value': this.value, 'text': text});
	}

	_click(event) {
		event.stopPropagation();
		if (event.target.hasClass('moodropdown-option')) {
			this._select(event.target);
		} else if (event.target.tagName != 'INPUT') {
			if (this.optionsDiv.getStyle('display') == 'none')
				this.open();
			else
				this.close();
		}
	}

	_keydown(event) {
		if (event.key == 'enter') {
			event.preventDefault();
			const children = this.optionsDiv.getChildren('div');
			if (children.length > 0) {
				this._select(children[0]);
				this.input.set('value', '');
				this.render();
			}
		}
	}
}

function debounce(ms, func) {
	'use strict';

	let timeout;
	return function() {
		clearTimeout(timeout);
		const context = this;
		timeout = setTimeout(() => {
			timeout = null;
			func.apply(context);
		}, ms);
	};
}
