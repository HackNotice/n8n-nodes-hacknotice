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
						// Merge saved search filters (search object) into request body.
						body: '={{ $parameter["savedSearchId"] && $parameter["savedSearchId"] !== "" ? JSON.parse($parameter["savedSearchId"]) : {} }}',
					},
				},
			},
			// {
			// 	name: 'Get Saved Searches',
			// 	value: 'getSavedSearches',
			// 	action: 'Get first party saved searches',
			// 	description: 'Get first party saved searches from the HackNotice API',
			// 	routing: {
			// 		request: {
			// 			method: 'GET',
			// 			url: '/domainalertsavedsearch/page/0',
			// 		},
			// 	},
			// },
		],
		default: 'getAll',
	},
	{
		displayName: 'Saved Search Name or ID',
		name: 'savedSearchId',
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
	// {
	// 	displayName: 'Tier Name or ID',
	// 	name: 'tierId',
	// 	type: 'options',
	// 	default: 'none',
	// 	options: [
	// 		{
	// 			name: 'No Tier',
	// 			value: 'none',
	// 		},
	// 	],
	// 	description:
	// 		'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	// 	typeOptions: {
	// 		loadOptionsMethod: 'getTiers',
	// 	},
	// 	displayOptions: {
	// 		show: {
	// 			resource: ['thirdPartyAlerts'],
	// 			operation: ['getAll'],
	// 		},
	// 	},
	// },
];
