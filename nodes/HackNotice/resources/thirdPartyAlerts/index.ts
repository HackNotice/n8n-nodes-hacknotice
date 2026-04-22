import type { INodeProperties } from 'n8n-workflow';

/**
 * Third Party Alerts resource.
 * API reference: https://documenter.getpostman.com/view/806684/RWaHzA6C#ff61c168-022f-448e-8f0e-2be95a7466b4
 */
const showOnlyForThirdPartyAlerts = {
	resource: ['thirdPartyAlerts'],
};

export const thirdPartyAlertsDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForThirdPartyAlerts,
		},
		options: [
			{
				name: 'Get Third Party Alerts',
				value: 'getThirdPartyAlerts',
				action: 'Get third party alerts',
				description: 'Get third party alerts from the HackNotice API',
			},
			// {
			// 	name: 'Get Saved Searches',
			// 	value: 'getSavedSearches',
			// 	action: 'Get third party saved searches',
			// 	description: 'Get third party saved searches from the HackNotice API',
			// 	routing: {
			// 		request: {
			// 			method: 'GET',
			// 			url: '/hackalertsavedsearch/page/0',
			// 		},
			// 	},
			// },
		],
		default: 'getThirdPartyAlerts',
	},
	{
		displayName: 'Saved Search Name or ID',
		name: 'thirdPartySavedSearchId',
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
			loadOptionsMethod: 'getThirdPartySavedSearches',
		},
		displayOptions: {
			show: {
				resource: ['thirdPartyAlerts'],
				operation: ['getThirdPartyAlerts'],
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
				resource: ['thirdPartyAlerts'],
				operation: ['getThirdPartyAlerts'],
			},
		},
	},
];
