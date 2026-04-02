import type { INodeProperties } from 'n8n-workflow';

/**
 * Research resource (Research8 API).
 * Phrase: POST /research8/search/term/page/:n or .../filename/term/page/:n
 * Word pool: POST /research8/search/pool/page/:n
 * Saved searches: GET /saved-searches/research?endpoint=phrase|wordpool (falls back to GET /researchsavedsearch/page/:n if 404)
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
				name: 'Get Phrase Alerts',
				value: 'getPhraseAlerts',
				action: 'Get phrase or filename research alerts',
				description: 'Uses research8 phrase/filename search (saved searches from phrase search UI)',
			},
			{
				name: 'Get Wordpool Alerts',
				value: 'getWordpoolAlerts',
				action: 'Get word pool research alerts',
				description: 'Uses research8 word pool search (saved searches from word pool UI)',
			},
		],
		default: 'getPhraseAlerts',
	},
	{
		displayName: 'Phrase Saved Search Name or ID',
		name: 'phraseResearchSavedSearch',
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
			loadOptionsMethod: 'getPhraseResearchSavedSearches',
		},
		displayOptions: {
			show: {
				resource: ['research'],
				operation: ['getPhraseAlerts'],
			},
		},
	},
	{
		displayName: 'Wordpool Saved Search Name or ID',
		name: 'wordpoolResearchSavedSearch',
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
			loadOptionsMethod: 'getWordpoolResearchSavedSearches',
		},
		displayOptions: {
			show: {
				resource: ['research'],
				operation: ['getWordpoolAlerts'],
			},
		},
	},
	{
		displayName: 'Limit By Time',
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
			'**Last Day** sends `hours_ago: 24`. **Last Week** / **Last Month** send `startdate` (today minus 7 days or 1 month). Time fields from the saved search are not used.',
		displayOptions: {
			show: {
				resource: ['research'],
				operation: ['getPhraseAlerts', 'getWordpoolAlerts'],
			},
		},
	},
];
