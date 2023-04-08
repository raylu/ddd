'use strict';
/* global $ */

import {MooDropdown} from './dropdown.mjs';
import {LitElement, css, html} from 'lit';
import {customElement} from 'lit/decorators.js';
import 'lit-flatpickr';

window.addEvent('domready', function() {
	new Request.JSON({
		'url': 'channel_user_month_list.json',
		'onSuccess': channelUserMonthList,
		'onError': (text, err) => { console.error(err); }, // eslint-disable-line no-console
	}).get();

	const channelSelect = new MooDropdown($('channel'));
	const userSelect = new MooDropdown($('user'));
	const dateSelect: DatePicker = document.querySelector('date-picker#dates');
	MooDropdown.setupClose(channelSelect, userSelect);
	channelSelect.addOption(null, '(all)');
	userSelect.addOption(null, '(all)');

	function query(initial) {
		const qs = {};
		if (channelSelect.value)
			qs['channel_id'] = channelSelect.value;
		if (userSelect.value)
			qs['int_user_id'] = userSelect.value;
		const dateStr = dateSelect.getValue();
		if (dateStr.length > 0) {
			const dates = dateSelect.getValue().split(' to ');
			if (dates.length == 1)
				qs['from'] = qs['to'] = dates[0];
			else if (dates.length == 2)
				[qs['from'], qs['to']] = dates;
		}
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
		channelSelect.render();
		userSelect.render();

		const qs = window.location.search.substr(1);
		const params = {};
		qs.split('&').each((fragment) => {
			const [key, val] = fragment.split('=');
			params[key] = decodeURIComponent(val);
		});
		channelSelect.select(params['channel_id'] || null);
		userSelect.select(params['int_user_id'] || null);
		if (params['from'] && params['to'])
			dateSelect.setDates(params['from'], params['to']);

		channelSelect.addEvent('moodropdown-select', () => {query(false);});
		userSelect.addEvent('moodropdown-select', () => {query(false);});
		dateSelect.addEventListener('date-changed', (event: CustomEvent) => {query(false);});

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

@customElement('date-picker')
class DatePicker extends LitElement {
	render() {
		return html`<lit-flatpickr
			mode="range"
			allowInput
			dateFormat="Y-m-d"
			theme="dark"
			showMonths="2"
			minDate="2015-12-01"
			.maxDate=${new Date()}
			nextArrow="&rarr;"
			prevArrow="&larr;"
			.onChange="${(dates, str) => this.handleChange(dates, str)}"
		></lit-flatpickr>`;
	}

	getValue(): string {
		return (this.shadowRoot.querySelector('lit-flatpickr') as any).getValue();
	}

	setDates(from: string, to: string): void {
		(this.shadowRoot.querySelector('lit-flatpickr') as any).setDate([from, to]);
	}

	private handleChange(dates: Array<Date>, str: string) {
		this.dispatchEvent(new CustomEvent('date-changed', {bubbles: true, composed: true}));
	}

	static styles = css`
		lit-flatpickr {
			background-color: #222;
			border: 1px solid #333;
			color: #ccc;
		}
	`;
}
