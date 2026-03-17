import type { INodeProperties } from 'n8n-workflow';

/**
 * Research resource.
 * Search endpoint: /researchtraffic/search/term/page/0
 * Saved search endpoint: /researchsavedsearch/page/0
 */
const showOnlyForResearch = {
	resource: ['research'],
};

export const researchDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForResearch,
		},
		options: [
			{
				name: 'Get Many Research',
				value: 'getAll',
				action: 'Get research traffic',
				description: 'Get research traffic from the HackNotice API',
				routing: {
					request: {
						method: 'POST',
						url: '/researchtraffic/search/term/page/0',
						body: '={{ (() => { const raw = $parameter["researchSavedSearchId"]; if (!raw || raw === "") return {}; if (typeof raw !== "string" || !raw.startsWith("__research__::")) return typeof raw === "string" ? JSON.parse(raw) : {}; const after = raw.slice(14); const i = after.indexOf("::"); const jsonStr = i >= 0 ? after.slice(i + 2) : after; return jsonStr ? JSON.parse(jsonStr) : {}; })() }}',
					},
				},
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Saved Search Name or ID',
		name: 'researchSavedSearchId',
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
			loadOptionsMethod: 'getResearchSavedSearches',
		},
		displayOptions: {
			show: {
				resource: ['research'],
				operation: ['getAll'],
			},
		},
	},
];
