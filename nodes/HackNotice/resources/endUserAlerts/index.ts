import type { INodeProperties } from 'n8n-workflow';

/**
 * End User Alerts resource.
 * Alerts endpoint: /enduseralerts/page/0
 * Saved search endpoint: /endusersavedsearch/page/0
 */
const showOnlyForEndUserAlerts = {
	resource: ['endUserAlerts'],
};

export const endUserAlertsDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForEndUserAlerts,
		},
		options: [
			{
				name: 'Get Many End User Alerts',
				value: 'getAll',
				action: 'Get end user alerts',
				description: 'Get end user alerts from the HackNotice API',
				routing: {
					request: {
						method: 'POST',
						url: '/enduseralerts/page/0',
						body: '={{ $parameter["endUserSavedSearchId"] && $parameter["endUserSavedSearchId"] !== "" ? JSON.parse($parameter["endUserSavedSearchId"]) : {} }}',
					},
				},
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Saved Search Name or ID',
		name: 'endUserSavedSearchId',
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
			loadOptionsMethod: 'getEndUserSavedSearches',
		},
		displayOptions: {
			show: {
				resource: ['endUserAlerts'],
				operation: ['getAll'],
			},
		},
	},
];
