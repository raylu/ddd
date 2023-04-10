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
	const userGraph = document.querySelector('#user_graph') as MessageGraph;
	const channelGraph = document.querySelector('#channel_graph') as MessageGraph;
	const graphs = [monthGraph, hourGraph, userGraph, channelGraph];

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
		monthGraph.data = data;
		monthGraph.loading = false;
	}

	function byHour(data: MessageCount[]) {
		hourGraph.data = data;
		hourGraph.loading = false;
	}

	function byUser(data: MessageCount[]) {
		userGraph.data = data;
		userGraph.loading = false;
	}

	function byChannel(data: MessageCount[]) {
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
