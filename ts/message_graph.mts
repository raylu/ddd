'use strict';

import {LitElement, css, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';

type Name = 'month' | 'hour' | 'user' | 'channel';
export interface MessageCount {
	count: number;
}

@customElement('message-graph')
export class MessageGraph extends LitElement {
	@property({type: String})
	name: Name;
	@property({type: Array})
	data: MessageCount[];
	@property({type: Boolean})
	loading = true;

	render() {
		if (this.loading)
			return html`<span class="loader"></span>`;

		const max: number = Math.max.apply(null, this.data.map((row) => row['count']));
		return html`<table>
				<tr>
					<th>${this.name}</th>
					<th>messages</th>
					<th></th>
				</tr>
				${this.data.map((row) => html`
					<tr>
						<td>${row[this.name]}</td>
						<td class="right">${row['count'].toLocaleString()}</td>
						<td><div class="bar" style="width: ${row['count'] / max * 500}px"></div></td>
					</tr>
				`)}
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
