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
				name: 'Get End User Alerts',
				value: 'getEndUserAlerts',
				action: 'Get end user alerts',
				description: 'Get end user alerts from the HackNotice API',
			},
		],
		default: 'getEndUserAlerts',
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
				operation: ['getEndUserAlerts'],
			},
		},
	},
	{
		displayName: 'Limit by Time',
		name: 'timeRange',
		type: 'options',
		default: 'lastDay',
		options: [
			{
				name: 'Last Day',
				value: 'lastDay',
			},
			{
				name: 'Last Week',
				value: 'lastWeek',
			},
			{
				name: 'Last Month',
				value: 'lastMonth',
			},
		],
		description:
			'**Last Day** sends `hours_ago: 24`. **Last Week** / **Last Month** send `start_date` (today minus 7 days or 1 month). Time fields from the saved search are not used.',
		displayOptions: {
			show: {
				resource: ['endUserAlerts'],
				operation: ['getEndUserAlerts'],
			},
		},
	},
];
