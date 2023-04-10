'use strict';
/* global $ */

import {MooDropdown} from './dropdown.mjs';
import {MessageCount, MessageGraph} from './message_graph.mjs';
import {LitElement, css, html} from 'lit';
import {customElement} from 'lit/decorators.js';
import 'lit-flatpickr';

async function fetchJSON(path: string, qs?: Record<string, string>) {
	if (qs)
		path += '?' + new URLSearchParams(qs);
	const res = await fetch(path);
	return await res.json();
}

window.addEventListener('DOMContentLoaded', () => {
	const channelSelect = new MooDropdown($('channel'));
	const userSelect = new MooDropdown($('user'));
	const dateSelect: DatePicker = document.querySelector('date-picker#dates');
	MooDropdown.setupClose(channelSelect, userSelect);
	channelSelect.addOption(null, '(all)');
	userSelect.addOption(null, '(all)');
	const monthGraph = document.querySelector('#month_graph') as MessageGraph;
	const hourGraph = document.querySelector('#hour_graph') as MessageGraph;
	const channelGraph = document.querySelector('#channel_graph') as MessageGraph;
	const graphs = [monthGraph, hourGraph, channelGraph];

	fetchJSON('channel_user_month_list.json').then(channelUserMonthList);

	function query(initial: boolean) {
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

		graphs.forEach((graph) => graph.loading = true);
		fetchJSON('by_month.json', qs).then(byMonth);
		fetchJSON('by_hour.json', qs).then(byHour);
		fetchJSON('by_user.json', qs).then(byUser);
		fetchJSON('by_channel.json', qs).then(byChannel);
	}

	function channelUserMonthList(data: object) {
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
		qs.split('&').forEach((fragment) => {
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

	function byMonth(data: MessageCount[]) {
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

		monthGraph.data = data;
		monthGraph.loading = false;
	}

	function byHour(data: MessageCount[]) {
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

		hourGraph.data = data;
		hourGraph.loading = false;
	}

	function byUser(data: MessageCount[]) {
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

	function byChannel(data: MessageCount[]) {
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
				new Element('td', {'text': channel['channel']}),
				new Element('td', {'text': channel['count'].toLocaleString(), 'class': 'right'}),
				new Element('td', {'text': channel['percentage'].toFixed(2), 'class': 'right'}),
				new Element('td').adopt(bar)
			);
			table.grab(row);
		});

		channelGraph.data = data;
		channelGraph.loading = false;
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
