import type { INodeProperties } from 'n8n-workflow';

/**
 * First Party Alerts resource.
 * API reference: https://documenter.getpostman.com/view/806684/RWaHzA6C#ff61c168-022f-448e-8f0e-2be95a7466b4
 */
const showOnlyForFirstPartyAlerts = {
	resource: ['firstPartyAlerts'],
};

export const firstPartyAlertsDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForFirstPartyAlerts,
		},
		options: [
			{
				name: 'Get Many First Party Alerts',
				value: 'getAll',
				action: 'Get first party alerts',
				description: 'Get first party alerts from the HackNotice API',
				routing: {
					request: {
						method: 'POST',
						url: '/domainalerts/page/0',
						body: '={{ $parameter["firstPartySavedSearchId"] && $parameter["firstPartySavedSearchId"] !== "" ? JSON.parse($parameter["firstPartySavedSearchId"]) : {} }}',
					},
				},
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Saved Search Name or ID',
		name: 'firstPartySavedSearchId',
		type: 'options',
		default: '',
		options: [
			{
				name: '',
				value: '',
			},
		],
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getFirstPartySavedSearches',
		},
		displayOptions: {
			show: {
				resource: ['firstPartyAlerts'],
				operation: ['getAll'],
			},
		},
	},
];
