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
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many third party alerts',
				description: 'Get third party alerts from the HackNotice API',
				routing: {
					request: {
						method: 'POST',
						url: '/breaches/search/page/0',
					},
				},
			},
		],
		default: 'getAll',
	},
];
