import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { thirdPartyAlertsDescription } from './resources/thirdPartyAlerts';

export class HackNotice implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HackNotice',
		name: 'hackNotice',
		icon: { light: 'file:../../icons/hacknotice.svg', dark: 'file:../../icons/hacknotice-dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Get third party alerts from the HackNotice API',
		defaults: {
			name: 'HackNotice',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'hackNoticeApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: "={{ ($credentials.baseUrl || 'https://api.hacknotice.com').replace(/\\/$/, '') }}",
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Third Party Alert',
						value: 'thirdPartyAlerts',
					},
				],
				default: 'thirdPartyAlerts',
			},
			...thirdPartyAlertsDescription,
		],
	};
}
