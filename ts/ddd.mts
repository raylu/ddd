'use strict';

import {MessageCount, MessageGraph} from './message_graph.mjs';
import {LitDropdown, setupClose} from './lit_dropdown.mjs';
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
	const channelDropdown = document.querySelector('#channel_dropdown') as LitDropdown;
	const userDropdown = document.querySelector('#user_dropdown') as LitDropdown;
	const dateSelect: DatePicker = document.querySelector('date-picker#dates');
	setupClose();
	const monthGraph = document.querySelector('#month_graph') as MessageGraph;
	const hourGraph = document.querySelector('#hour_graph') as MessageGraph;
	const userGraph = document.querySelector('#user_graph') as MessageGraph;
	const channelGraph = document.querySelector('#channel_graph') as MessageGraph;
	const graphs = [monthGraph, hourGraph, userGraph, channelGraph];

	fetchJSON('channel_user_month_list.json').then(channelUserMonthList);

	function query(initial: boolean) {
		const qs = {};
		if (channelDropdown.selected['id'])
			qs['channel_id'] = channelDropdown.selected['id'];
		if (userDropdown.selected['id'])
			qs['int_user_id'] = userDropdown.selected['id'];
		const dateStr = dateSelect.getValue();
		if (dateStr.length > 0) {
			const dates = dateSelect.getValue().split(' to ');
			if (dates.length == 1)
				qs['from'] = qs['to'] = dates[0];
			else if (dates.length == 2)
				[qs['from'], qs['to']] = dates;
		}
		if (!initial)
			history.pushState(qs, '', '?' + new URLSearchParams(qs).toString());

		graphs.forEach((graph) => graph.loading = true);
		fetchJSON('by_month.json', qs).then(byMonth);
		fetchJSON('by_hour.json', qs).then(byHour);
		fetchJSON('by_user.json', qs).then(byUser);
		fetchJSON('by_channel.json', qs).then(byChannel);
	}

	function channelUserMonthList(data: object) {
		channelDropdown.setOptions([{id: null, name: '(all)'}].concat(data['channels']));
		userDropdown.setOptions([{id: null, name: '(all)'}].concat(data['users']));

		const qs = window.location.search.substr(1);
		const params = {};
		qs.split('&').forEach((fragment) => {
			const [key, val] = fragment.split('=');
			params[key] = decodeURIComponent(val);
		});
		channelDropdown.select(params['channel_id'] || null);
		userDropdown.select(params['int_user_id'] || null);
		if (params['from'] && params['to'])
			dateSelect.setDates(params['from'], params['to']);
		else { // default to the last year
			const fromDate = new Date();
			fromDate.setFullYear(fromDate.getFullYear() - 1);
			const formatDate = (d: Date) => d.toISOString().split('T', 1)[0];
			dateSelect.setDates(formatDate(fromDate), formatDate(new Date()));
		}

		channelDropdown.addEventListener('dropdown-select', (event: CustomEvent) => {query(false);});
		userDropdown.addEventListener('dropdown-select', (event: CustomEvent) => {query(false);});
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
		// toISOString converts to UTC, which the server operates in
		return html`<lit-flatpickr
			mode="range"
			allowInput
			dateFormat="Y-m-d"
			theme="dark"
			showMonths="2"
			minDate="2015-12-01"
			.maxDate=${new Date().toISOString().split('T', 1)[0]}
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
