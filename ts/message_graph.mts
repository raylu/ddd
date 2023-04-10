'use strict';

import {LitElement, TemplateResult, css, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

type Name = 'month' | 'hour' | 'user' | 'channel';
export type MessageCount = {count: number} & {[name in Name]?: string};

@customElement('message-graph')
export class MessageGraph extends LitElement {
	@property({type: String})
	name: Name;
	@property({type: Array})
	data: MessageCount[];
	@property({type: Boolean})
	percentageColumn = false;
	@property({type: Boolean})
	cumulative = false;
	@property({type: Boolean})
	loading = true;

	render() {
		if (this.loading)
			return html`<span class="loader"></span>`;

		const max: number = Math.max.apply(null, this.data.map((row) => row['count']));
		let barPx = 500;
		let rankHeader: TemplateResult | symbol = nothing;
		let percentageHeader: TemplateResult | symbol = nothing;
		if (this.percentageColumn) {
			rankHeader = html`<th>rank</th>`;
			percentageHeader = html`<th>percentage</th>`;
			if (this.cumulative)
				barPx -= 100;
		}
		let total = 0;
		return html`<table>
				<tr>
					${rankHeader}
					<th>${this.name}</th>
					<th>messages</th>
					${percentageHeader}
					<th></th>
				</tr>
				${this.data.map((row, i) => { 
					let rank: TemplateResult | symbol = nothing;
					let percentage: TemplateResult | symbol = nothing;
					let filler: TemplateResult | symbol = nothing;
					let bar = html`
						<div class="bar" style="width: ${row['count'] / max * barPx}px"></div>`;
					let cumulative: TemplateResult | symbol = nothing;
					if (this.percentageColumn) {
						rank = html`<td class="right">${i}</td>`;
						percentage = html`<td class="right">${row['percentage'].toFixed(2)}</td>`;
						bar = html`<div class="bar" style="width: ${row['percentage'] / 100 * barPx}px">`;
						if (this.cumulative) {
							filler = html`<div class="bar filler" style="width: ${total / 100 * barPx}px">`;
							total += row['percentage'];
							cumulative = html`<td class="right">${total.toFixed(2)}</td>`;
						}
					}
					return html`
						<tr>
							${rank}
							<td>${row[this.name]}</td>
							<td class="right">${row['count'].toLocaleString()}</td>
							${percentage}
							<td>${filler}${bar}</td>
							${cumulative}
						</tr>
					`;
				})}
			</table>`;
	}

	static styles = css`
		table tr:nth-child(even) {
			background-color: #222;
		}
		table td {
			padding: 2px;
			text-overflow: ellipsis;
			white-space: nowrap;
			overflow: hidden;
		}
		table td.right {
			text-align: right;
		}
		table th.graph {
			width: 500px;
		}

		div.bar {
			display: inline-block;
			height: 1em;
			background-color: #888;
		}
		div.bar.filler {
			background-color: #333;
		}
		div.bar.filler.header {
			width: 400px;
		}

		.loader {
			width: 48px;
			height: 48px;
			border-radius: 50%;
			display: inline-block;
			position: relative;
			border: 3px solid;
			border-color: #ccc #ccc transparent transparent;
			box-sizing: border-box;
			animation: rotation 1s linear infinite;
		}
		.loader::after {
			content: '';
			box-sizing: border-box;
			position: absolute;
			left: 0;
			right: 0;
			top: 0;
			bottom: 0;
			margin: auto;
			border: 3px solid;
			border-color: transparent transparent #c8c #c8c;
			width: 24px;
			height: 24px;
			border-radius: 50%;
			animation: rotationBack 0.5s linear infinite;
			transform-origin: center center;
		}
		@keyframes rotation {
			0% {
				transform: rotate(0deg);
			}
			100% {
				transform: rotate(360deg);
			}
		} 
		@keyframes rotationBack {
			0% {
				transform: rotate(0deg);
			}
			100% {
				transform: rotate(-360deg);
			}
		}
	`;
}
