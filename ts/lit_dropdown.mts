'use strict';

import {LitElement, css, html} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

interface Option {
	id: string
	name: string
}

export function setupClose() {
	document.addEventListener('click', (event) => {
		for (const ld of document.querySelectorAll('lit-dropdown') as NodeListOf<LitDropdown>)
			ld.open = false;
	});
}

@customElement('lit-dropdown')
export class LitDropdown extends LitElement {
	@property({type: Boolean})
	open = false;
	@state()
	protected options: Option[] = [];
	@state()
	protected filteredOptions: Option[] = null;
	@state()
	selected: Option = {'id': null, 'name': ''};

	protected createRenderRoot() {
		const root = super.createRenderRoot();
		root.addEventListener('click', this.handleClick.bind(this));
		return root;
	}

	render() {
		return html`
			<div class="moodropdown-display">${this.selected['name']}</div>
			<div>
				<div class="moodropdown-arrow ${this.open ? 'up' : 'down'}"></div>
			</div>
			<div class="moodropdown-options ${this.open ? 'open' : ''}">
				<input @input=${debounce(100, this.search)} @keydown=${this.handleKeydown}>
				${(this.filteredOptions ?? []).slice(0, 15).map((option) =>
					html`<div class="moodropdown-option" data-value="${option['id']}">${option['name']}</div>`
				)}
			</div>
		`;
	}

	setOptions(options: Option[]): void {
		this.options = options;
		this.search();
	}

	private search(): void {
		const query = this.shadowRoot.querySelector('input').value.toLocaleLowerCase();
		if (!query)
			this.filteredOptions = this.options.slice(0, 15);
		else {
			const prefix = [];
			const contains = [];
			for (const option of this.options) {
				const lower = option['name'].toLocaleLowerCase();
				if (lower.startsWith(query))
					prefix.push(option);
				else if (contains.length < 15 && lower.indexOf(query) != -1)
					contains.push(option);
			}
			this.filteredOptions = prefix.slice(0, 15).concat(contains.slice(0, 15 - prefix.length));
		}
	}

	select(value: string) {
		for (const option of this.options) {
			if (option['id'] == value) {
				this.selected = option;
				this.dispatchEvent(new CustomEvent('dropdown-select', {bubbles: true, composed: true}));
				return;
			}
		}
		throw 'no option with value ' + value;
	}

	private async handleClick(event: MouseEvent) {
		event.stopPropagation();
		const target = event.target as HTMLElement;
		if (target.classList.contains('moodropdown-option')) {
			this.selected = {'id': target.dataset['value'], 'name': target.textContent};
			this.open = false;
			this.dispatchEvent(new CustomEvent('dropdown-select', {bubbles: true, composed: true}));
		} else if (target.tagName != 'INPUT') {
			// close all other LitDropdowns
			for (const ld of document.querySelectorAll('lit-dropdown') as NodeListOf<LitDropdown>)
				if (ld != this)
					ld.open = false;

			this.open = !this.open;
			await this.updateComplete;
			this.shadowRoot.querySelector('input').focus();
		}
	}

	private handleKeydown(event: KeyboardEvent) {
		if (event.key == 'Enter') {
			event.preventDefault();
			if (this.filteredOptions.length > 0) {
				this.selected = this.filteredOptions[0];
				this.open = false;
				(event.target as HTMLInputElement).value = '';
				this.search();
				this.dispatchEvent(new CustomEvent('dropdown-select', {bubbles: true, composed: true}));
			}
		}
	}

	static styles = css`
		:host {
			position: relative;
			display: flex;
			width: 200px;
			height: 25px;
			vertical-align: middle;
			background-color: #222;
			border: 1px solid #333;
			cursor: default;
		}
		.moodropdown-display {
			display: inline-block;
			width: 182px;
			height: 25px;
			padding: 2.5px 3px;
			cursor: inherit;
		}
		.moodropdown-options {
			position: absolute;
			z-index: 1;
			display: none;
			top: 28px;
			left: -1px;
			width: 200px;
			background-color: #222;
			border: 2px solid #444;
			cursor: inherit;
		}
		.moodropdown-options.open {
			display: block;
		}
		.moodropdown-options > div {
			padding: 3px 5px;
			cursor: inherit;
			text-overflow: ellipsis;
			white-space: nowrap;
			overflow: hidden;
		}
		.moodropdown-options > div:hover {
			background-color: #333;
		}
		.moodropdown-options > input {
			width: 190px;
			margin: 3px;
			cursor: inherit;
			padding: 2px 3px;
			font-size: inherit;
			background-color: #333;
			border: 1px solid #444;
			color: inherit;
		}

		.moodropdown-arrow {
			margin: 8px 3px 0 0;
			width: 0; 
			height: 0; 
			border-left: 5px solid transparent;
			border-right: 5px solid transparent;
		}
		.moodropdown-arrow.up {
			border-bottom: 5px solid #38a;
		}
		.moodropdown-arrow.down {
			border-top: 5px solid #38a;
		}
	`;
}

function debounce(ms: number, func: () => void) {
	let timeout: number;
	return function() {
		clearTimeout(timeout);
		timeout = window.setTimeout(() => {
			timeout = null;
			func.apply(this);
		}, ms);
	};
}
