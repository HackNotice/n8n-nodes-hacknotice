import type { INodeProperties } from 'n8n-workflow';

const showOnlyForThirdPartyWatchlist = {
	resource: ['thirdPartyWatchlist'],
};

export const thirdPartyWatchlistDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForThirdPartyWatchlist,
		},
		options: [
			{
				name: 'Delete By ID',
				value: 'deleteById',
				action: 'Delete by ID',
				description: 'Delete a third-party watchlist domain by document ID',
			},
			{
				name: 'Get By ID',
				value: 'getById',
				action: 'Get by ID',
				description: 'Get a third-party watchlist domain by document ID',
			},
			{
				name: 'Get Watchlist Domains',
				value: 'getWatchlistDomains',
				action: 'Get watchlist domains',
				description: 'Read a page of third-party watchlist domains from the HackNotice API',
			},
			{
				name: 'Search Domain',
				value: 'searchDomain',
				action: 'Search domain',
				description: 'Search the third-party watchlist for a domain',
			},
			{
				name: 'Update By ID',
				value: 'updateById',
				action: 'Update by ID',
				description: 'Update third-party watchlist domain tags by document ID',
			},
		],
		default: 'getWatchlistDomains',
	},
	{
		displayName: 'Page Number',
		name: 'thirdPartyWatchlistPage',
		type: 'number',
		default: 0,
		typeOptions: {
			minValue: 0,
		},
		description: 'Zero-based page index for the watchlist domains endpoint',
		displayOptions: {
			show: {
				resource: ['thirdPartyWatchlist'],
				operation: ['getWatchlistDomains'],
			},
		},
	},
	{
		displayName: 'Sort',
		name: 'thirdPartyWatchlistSort',
		type: 'options',
		default: 'alphadomain',
		options: [
			{
				name: 'Alphabetical by Domain',
				value: 'alphadomain',
			},
			{
				name: 'Alphabetical by Name',
				value: 'alphaname',
			},
		],
		description: 'Sort order sent to the watchlist domains endpoint',
		displayOptions: {
			show: {
				resource: ['thirdPartyWatchlist'],
				operation: ['getWatchlistDomains'],
			},
		},
	},
	{
		displayName: 'Watchlist ID',
		name: 'thirdPartyWatchlistId',
		type: 'string',
		default: '',
		required: true,
		description: 'Third-party watchlist document ID',
		displayOptions: {
			show: {
				resource: ['thirdPartyWatchlist'],
				operation: ['deleteById', 'getById', 'updateById'],
			},
		},
	},
	{
		displayName: 'Tags',
		name: 'thirdPartyWatchlistTags',
		type: 'json',
		default: '[]',
		required: true,
		description: 'Tags array sent as `{ "tags": [...] }` when updating the watchlist item',
		displayOptions: {
			show: {
				resource: ['thirdPartyWatchlist'],
				operation: ['updateById'],
			},
		},
	},
	{
		displayName: 'Domain',
		name: 'thirdPartyWatchlistDomain',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'example.com',
		description: 'Domain to search for in the third-party watchlist',
		displayOptions: {
			show: {
				resource: ['thirdPartyWatchlist'],
				operation: ['searchDomain'],
			},
		},
	},
];
